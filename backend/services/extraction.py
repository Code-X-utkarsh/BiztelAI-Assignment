import json
import os
import base64
import traceback
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
    gemini_key = os.getenv("GEMINI_API_KEY")
    print(f"[GEMINI] Starting Gemini extraction for '{file_path}' (type: '{file_type}')")
    print(f"[GEMINI] GEMINI_API_KEY configured: {bool(gemini_key)}")
    if not gemini_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set or empty!")

    import google.generativeai as genai
    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    content_payload = [EXTRACTION_PROMPT]

    if file_type == "image":
        print(f"[GEMINI] Loading image with Pillow from '{file_path}'...")
        try:
            import PIL.Image
            img = PIL.Image.open(file_path)
            content_payload.append(img)
        except Exception as img_err:
            print(f"[GEMINI] Pillow failed to open image ({img_err}), falling back to raw bytes...")
            ext = Path(file_path).suffix.lower()
            mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
            mime_type = mime_map.get(ext, "image/jpeg")
            with open(file_path, "rb") as f:
                image_bytes = f.read()
            content_payload.append({"mime_type": mime_type, "data": image_bytes})
        
    elif file_type == "pdf":
        print(f"[GEMINI] Loading PDF bytes from '{file_path}'...")
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        
        pdf_part = {
            "mime_type": "application/pdf",
            "data": pdf_bytes
        }
        content_payload.append(pdf_part)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    
    print("[GEMINI] Initiating Gemini API call (gemini-1.5-flash)...")
    try:
        response = await asyncio.to_thread(model.generate_content, content_payload)
        print("[GEMINI] Received response from Gemini API")
    except Exception as api_err:
        print(f"[GEMINI] Error during model.generate_content call: {api_err}")
        traceback.print_exc()
        raise api_err

    # Parse response
    try:
        raw_text = response.text.strip()
    except Exception as text_err:
        print(f"[GEMINI] Error retrieving response.text: {text_err}")
        print(f"[GEMINI] Candidate metadata: {getattr(response, 'candidates', None)}")
        print(f"[GEMINI] Prompt feedback: {getattr(response, 'prompt_feedback', None)}")
        traceback.print_exc()
        raise text_err

    print(f"[GEMINI] Raw Gemini response text:\n---\n{raw_text}\n---")
    
    # Robust JSON substring extraction
    start_idx = raw_text.find('{')
    end_idx = raw_text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = raw_text[start_idx:end_idx+1]
        result = json.loads(json_str)
    else:
        cleaned = raw_text
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)

    # Normalize if model omitted outer "fields" wrapper
    if isinstance(result, dict) and "fields" not in result:
        field_keys = ["date", "shift", "employee_number", "operation_code", "machine_number", "work_order_number", "quantity_produced", "time_taken"]
        if any(k in result for k in field_keys):
            result = {
                "fields": {k: result.get(k) for k in field_keys},
                "confidence_scores": result.get("confidence_scores", {k: 0.8 for k in field_keys}),
                "overall_confidence": result.get("overall_confidence", 0.8),
                "extraction_notes": result.get("extraction_notes", "")
            }
    
    result["raw_response"] = response.text
    print(f"[GEMINI] Successfully parsed Gemini result: {json.dumps(result, indent=2)}")
    return result

async def extract_with_nvidia(file_path: str, file_type: str) -> dict:
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    print(f"[NVIDIA] Starting NVIDIA extraction for '{file_path}' (type: '{file_type}')")
    print(f"[NVIDIA] NVIDIA_API_KEY configured: {bool(nvidia_key)}")
    if not nvidia_key:
        raise ValueError("NVIDIA_API_KEY environment variable is not set or empty!")

    if file_type == "pdf":
        raise ValueError("NVIDIA Vision API currently supports images, not PDFs. Please upload an image.")
        
    ext = Path(file_path).suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }
    mime_type = mime_map.get(ext, "image/jpeg")
    
    base64_image = encode_image_to_base64(file_path)
    
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {nvidia_key}",
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
        "max_tokens": 2048,
        "temperature": 0.1,
        "top_p": 1.00,
        "stream": False
    }
    
    print("[NVIDIA] Initiating NVIDIA API call (meta/llama-3.2-90b-vision-instruct)...")
    try:
        response = await asyncio.to_thread(requests.post, invoke_url, headers=headers, json=payload)
        response.raise_for_status()
    except Exception as api_err:
        print(f"[NVIDIA] Error during NVIDIA API call: {api_err}")
        traceback.print_exc()
        raise api_err
    
    response_json = response.json()
    raw_text = response_json["choices"][0]["message"]["content"].strip()
    print(f"[NVIDIA] Raw NVIDIA response text:\n---\n{raw_text}\n---")
    
    # Parse response robustly by finding the first { and last }
    try:
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            json_str = raw_text[start_idx:end_idx+1]
            result = json.loads(json_str)
            # Normalize if model omitted outer "fields" wrapper
            if isinstance(result, dict) and "fields" not in result:
                field_keys = ["date", "shift", "employee_number", "operation_code", "machine_number", "work_order_number", "quantity_produced", "time_taken"]
                if any(k in result for k in field_keys):
                    result = {
                        "fields": {k: result.get(k) for k in field_keys},
                        "confidence_scores": result.get("confidence_scores", {k: 0.8 for k in field_keys}),
                        "overall_confidence": result.get("overall_confidence", 0.8),
                        "extraction_notes": result.get("extraction_notes", "")
                    }
            result["raw_response"] = raw_text
            print(f"[NVIDIA] Successfully parsed NVIDIA result: {json.dumps(result, indent=2)}")
            return result
        else:
            raise ValueError("No JSON object found in response")
    except Exception as e:
        print(f"[NVIDIA] Failed to parse JSON from NVIDIA response: {e}")
        traceback.print_exc()
        # Re-raise as JSONDecodeError for the outer try-except block to catch
        raise json.JSONDecodeError(f"Failed to parse: {str(e)}", raw_text, 0)


async def run_single_provider(provider_name: str, file_path: str, file_type: str) -> dict:
    """Call a single provider after verifying API key and requirements."""
    if provider_name == "gemini":
        gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY is not set or empty")
        return await extract_with_gemini(file_path, file_type)
        
    elif provider_name == "nvidia":
        nvidia_key = (os.getenv("NVIDIA_API_KEY") or "").strip()
        if not nvidia_key:
            raise ValueError("NVIDIA_API_KEY is not set or empty")
        if file_type == "pdf":
            raise ValueError("NVIDIA Vision API does not support PDFs (images only)")
        return await extract_with_nvidia(file_path, file_type)
        
    else:
        raise ValueError(f"Unknown AI provider: {provider_name}")

def is_valid_extraction_result(result: dict) -> bool:
    """Check if extraction result is non-empty and has at least one non-null extracted field."""
    if not isinstance(result, dict):
        return False
    fields = result.get("fields")
    if not isinstance(fields, dict) or not fields:
        return False
    # Check if there is at least one non-null, non-empty extracted value
    has_any_value = any(v is not None and str(v).strip() != "" for v in fields.values())
    return has_any_value

async def extract_from_document(file_path: str, file_type: str) -> dict:
    env_provider = os.getenv("AI_PROVIDER", "gemini").lower().strip()
    
    if env_provider == "nvidia":
        primary = "nvidia"
        secondary = "gemini"
    else:
        primary = "gemini"
        secondary = "nvidia"

    print(f"\n==================================================")
    print(f"[EXTRACTION] Starting document extraction pipeline")
    print(f"[EXTRACTION] file_path: '{file_path}' (exists on disk: {os.path.exists(file_path)})")
    print(f"[EXTRACTION] file_type: '{file_type}'")
    print(f"[EXTRACTION] AI_PROVIDER configured: '{env_provider}'")
    print(f"[EXTRACTION] Execution plan: Primary={primary}, Fallback={secondary}")
    print(f"==================================================")

    # 1. Try Primary Provider
    primary_reason = ""
    print(f"Trying primary provider: {primary}")
    try:
        result = await run_single_provider(primary, file_path, file_type)
        if is_valid_extraction_result(result):
            result["provider_used"] = primary
            print(f"Primary provider: {primary} succeeded")
            print(f"[EXTRACTION] Final parsed result before returning:\n{json.dumps(result, indent=2)}")
            return result
        else:
            primary_reason = "All extracted fields are None or empty"
            print(f"Primary provider failed: {primary_reason}. Trying fallback...")
    except Exception as e:
        primary_reason = str(e)
        print(f"Primary provider failed: {primary_reason}. Trying fallback...")
        traceback.print_exc()

    # 2. Try Fallback Provider
    secondary_reason = ""
    print(f"Trying fallback provider: {secondary}")
    try:
        result = await run_single_provider(secondary, file_path, file_type)
        if is_valid_extraction_result(result):
            result["provider_used"] = secondary
            print(f"Fallback provider: {secondary} succeeded")
            print(f"[EXTRACTION] Final parsed result before returning:\n{json.dumps(result, indent=2)}")
            return result
        else:
            secondary_reason = "All extracted fields are None or empty"
            print(f"Fallback provider failed: {secondary_reason}")
    except Exception as e:
        secondary_reason = str(e)
        print(f"Fallback provider failed: {secondary_reason}")
        traceback.print_exc()

    # 3. Both Providers Failed
    print("Both providers failed")
    error_summary = f"Both providers failed. Primary ({primary}): {primary_reason}. Fallback ({secondary}): {secondary_reason}"
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
        "extraction_notes": error_summary,
        "raw_response": error_summary,
        "provider_used": None
    }


