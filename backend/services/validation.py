"""Simple validation logic for extracted records."""

import re


def validate_record(record_data: dict) -> dict:
    """Returns dict of field_name -> error_message for any violations."""
    errors = {}

    # Rule 1: Mandatory fields
    mandatory = ["date", "employee_number", "work_order_number"]
    for field in mandatory:
        if not record_data.get(field):
            errors[field] = f"{field} is mandatory and cannot be empty"

    # Rule 2: Shift must be Morning, Evening, or Night
    valid_shifts = ["Morning", "Evening", "Night"]
    shift = record_data.get("shift")
    if shift and shift not in valid_shifts:
        errors["shift"] = f"Shift must be one of {valid_shifts}, got '{shift}'"

    # Rule 3: Machine number format MC-XX
    machine = record_data.get("machine_number")
    if machine and not re.match(r"^MC-\d+$", machine):
        errors["machine_number"] = "Machine number must follow format MC-XX (e.g. MC-07)"

    # Rule 4: Quantity must be positive
    qty = record_data.get("quantity_produced")
    if qty is not None:
        if qty <= 0:
            errors["quantity_produced"] = "Quantity must be a positive number"
        if qty > 10000:
            errors["quantity_produced"] = "Quantity looks suspiciously high (>10000)"

    # Rule 5: Time taken must be between 0 and 24
    time_taken = record_data.get("time_taken")
    if time_taken is not None:
        if time_taken <= 0 or time_taken > 24:
            errors["time_taken"] = "Time taken must be between 0 and 24 hours"

    return errors
