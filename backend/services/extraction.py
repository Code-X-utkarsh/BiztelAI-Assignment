import json
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
import requests
import asyncio
load_dotenv()

EXTRACTION_PROMPT = """
You are an expert OCR system specialized in reading handwritten and 
semi-structured manufacturing/operational documents.

INSTRUCTIONS:
Step 1: First, describe what you visually see in the document. Summarize the layout, the table columns, and the first row's contents. Put this description in the `extraction_notes` field.
Step 2: Then, extract the following fields from the FIRST ROW of the table ONLY. Treat each field independently.

CRITICAL RULES FOR EXTRACTION:
- If a field area is visually blank, empty, or contains a dash (-) or slash (/), you MUST return `null` for that field. Never guess from context.
- Never copy a value from one field into another neighboring field.
- If the handwriting is ambiguous or hard to read, lower the confidence score below 0.5, provide your best guess, and add a note about it in `extraction_notes`.

Field Specifics:
- date: Extract any date found. Format as DD/MM/YYYY if possible.
- shift: Must be exactly one of: "Morning", "Evening", "Night". 
  Accept common abbreviations (M, Morn, E, Eve, N, Ngt) and normalize them. If unclear, return null.
- employee_number: Any employee/worker ID or number found.
- operation_code: Any operation or process code found.
- machine_number: Machine ID. If you see any number near the word "machine" or in the machine column, normalize it to MC-XX format (e.g. "ABC-T30" -> "MC-T30", "Machine 7" -> "MC-07").
- work_order_number: Job order or work order number.
- quantity_produced: Number of units/pieces produced. Return as a number only.
- time_taken: Hours worked or time taken. Return as decimal hours (e.g. 7.5).

Respond ONLY with a valid JSON object in exactly this format, 
no explanation, no markdown, no extra text:

{
  "fields": {
    "date": <string or null>,
    "shift": <string or null>,
    "employee_number": <string or null>,
    "operation_code": <string or null>,
    "machine_number": <string or null>,
    "work_order_number": <string or null>,
    "quantity_produced": <number or null>,
    "time_taken": <number or null>
  },
  "confidence_scores": {
    "date": <float 0.0-1.0>,
    "shift": <float 0.0-1.0>,
    "employee_number": <float 0.0-1.0>,
    "operation_code": <float 0.0-1.0>,
    "machine_number": <float 0.0-1.0>,
    "work_order_number": <float 0.0-1.0>,
    "quantity_produced": <float 0.0-1.0>,
    "time_taken": <float 0.0-1.0>
  },
  "overall_confidence": <float 0.0-1.0>,
  "extraction_notes": "<Step 1 visual description + any notes about ambiguous fields>"
}
"""

def encode_image_to_base64(file_path: str) -> str:
    with open(file_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

async def extract_with_gemini(file_path: str, file_type: str) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    if file_type == "image":
        # Read image file
        with open(file_path, "rb") as f:
            image_data = f.read()
        
        # Determine mime type
        ext = Path(file_path).suffix.lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
        mime_type = mime_map.get(ext, "image/jpeg")
        
        image_part = {
            "mime_type": mime_type,
            "data": base64.standard_b64encode(image_data).decode("utf-8")
        }
        
        response = model.generate_content([EXTRACTION_PROMPT, image_part])
        
    elif file_type == "pdf":
        # For PDF: use Gemini's PDF support
        with open(file_path, "rb") as f:
            pdf_data = f.read()
        
        pdf_part = {
            "mime_type": "application/pdf",
            "data": base64.standard_b64encode(pdf_data).decode("utf-8")
        }
        
        response = model.generate_content([EXTRACTION_PROMPT, pdf_part])
    
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    
    # Parse response
    raw_text = response.text.strip()
    
    # Clean up if Gemini returns markdown code blocks
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()
    
    result = json.loads(raw_text)
    result["raw_response"] = response.text
    return result

async def extract_with_nvidia(file_path: str, file_type: str) -> dict:
    if file_type == "pdf":
        raise ValueError("NVIDIA Vision API currently supports images, not PDFs. Please upload an image.")
        
    ext = Path(file_path).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
    mime_type = mime_map.get(ext, "image/jpeg")
    
    base64_image = encode_image_to_base64(file_path)
    
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.getenv('NVIDIA_API_KEY')}",
        "Accept": "application/json"
    }
    
    payload = {
        "model": "meta/llama-3.2-90b-vision-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}
                ]
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.1,
        "top_p": 1.00,
        "stream": False
    }
    
    response = await asyncio.to_thread(requests.post, invoke_url, headers=headers, json=payload)
    response.raise_for_status()
    
    response_json = response.json()
    raw_text = response_json["choices"][0]["message"]["content"].strip()
    
    # Parse response robustly by finding the first { and last }
    raw_text = response_json["choices"][0]["message"]["content"].strip()
    
    try:
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            json_str = raw_text[start_idx:end_idx+1]
            result = json.loads(json_str)
            result["raw_response"] = raw_text
            return result
        else:
            raise ValueError("No JSON object found in response")
    except Exception as e:
        # Re-raise as JSONDecodeError for the outer try-except block to catch
        raise json.JSONDecodeError(f"Failed to parse: {str(e)}", raw_text, 0)

async def extract_from_document(file_path: str, file_type: str) -> dict:
    try:
        provider = os.getenv("AI_PROVIDER", "gemini").lower()
        
        if provider == "nvidia":
            return await extract_with_nvidia(file_path, file_type)
        else:
            return await extract_with_gemini(file_path, file_type)
            
    except json.JSONDecodeError as e:
        # Returned something unparseable
        return {
            "fields": {k: None for k in [
                "date", "shift", "employee_number", "operation_code",
                "machine_number", "work_order_number", 
                "quantity_produced", "time_taken"
            ]},
            "confidence_scores": {k: 0.0 for k in [
                "date", "shift", "employee_number", "operation_code",
                "machine_number", "work_order_number",
                "quantity_produced", "time_taken"
            ]},
            "overall_confidence": 0.0,
            "extraction_notes": f"JSON parse error: {str(e)}",
            "raw_response": getattr(e, 'doc', 'Unknown error - Check backend logs')
        }
    except Exception as e:
        return {
            "fields": {k: None for k in [
                "date", "shift", "employee_number", "operation_code",
                "machine_number", "work_order_number",
                "quantity_produced", "time_taken"
            ]},
            "confidence_scores": {k: 0.0 for k in [
                "date", "shift", "employee_number", "operation_code",
                "machine_number", "work_order_number",
                "quantity_produced", "time_taken"
            ]},
            "overall_confidence": 0.0,
            "extraction_notes": f"Extraction failed: {str(e)}",
            "raw_response": str(e)
        }
