# app/api/return_intention.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet

router = APIRouter()

class ReturnRequest(BaseModel):
    full_name: str
    group: str
    intention_type: str
    serial_number: str

@router.post("/")
def return_intention(req: ReturnRequest):
    ws = get_worksheet(req.group)
    headers = ws.row_values(1)
    if req.intention_type not in headers:
        return {"error": f"Intention type '{req.intention_type}' column not found in sheet '{req.group}'."}

    try:
        name_col = headers.index("שם מלא") + 1
    except ValueError:
        return {"error": f"'שם' column not found in sheet '{req.group}'."}

    if req.intention_type not in headers:
        return {"error": f"Intention type '{req.intention_type}' column not found in sheet '{req.group}'."}

    intention_col = headers.index(req.intention_type) + 1

    # Search for the full_name in the sheet and check the matching serial
    name_cells = ws.col_values(name_col)
    for row_idx, name in enumerate(name_cells[1:], start=2):  # Skip header
        if name.strip() == req.full_name.strip():
            current_value = ws.cell(row_idx, intention_col).value
            if current_value != req.serial_number:
                return {
                    "error": f"Serial number '{req.serial_number}' not found for {req.full_name} under '{req.intention_type}'."}

            # Clear the cell (remove assignment)
            ws.update_cell(row_idx, intention_col, "")

            # Add back to stock (intention worksheet)
            append_weapon_intention_serial("מלאי אופטיקה", req.intention_type, req.serial_number)

            result = {"message": f"Returned serial '{req.serial_number}' from {req.full_name} and added back to stock."}
            append_to_sheet(result)
            return result


    return {"error": f"Person '{req.full_name}' not found in group '{req.group}'."}