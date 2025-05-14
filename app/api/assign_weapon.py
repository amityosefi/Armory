# app/api/assign_weapon.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet
router = APIRouter()


class AssignRequest(BaseModel):
    full_name: str
    group: str
    serial_number: str
    item_name: str
    intention_type: str



@router.post("/")
def assign_item(req: AssignRequest):
    stock_sheet = "מלאי נשקיה"

    intention_name = ""
    intention_number = ""

    if req.intention_type is not "":
        removed = find_item_in_stock_and_remove("מלאי אופטיקה", req.intention_type,"1")
        if not removed:
            return {"error": f"{req.intention_type} not found in {"מלאי אופטיקה"}"}
        intention_name = req.intention_type

    # Step 1: Remove from stock
    removed = find_item_in_stock_and_remove(stock_sheet, req.item_name, req.serial_number)
    if not removed:
        return {"error": f"{req.item_name} with serial {req.serial_number} not found in {stock_sheet}"}

    ws = sheet.worksheet(req.group)
    headers = ws.row_values(1)
    name_col_index = headers.index("שם מלא") + 1
    name_col_values = ws.col_values(name_col_index)
    if req.full_name.strip() in [name.strip() for name in name_col_values[1:]]:  # Skip header
        return {"error": f"'{req.full_name}' already exists in group '{req.group}'."}
    # row = [req.full_name, req.item_name, req.serial_number]
    row = [1 if not str(ws.get()[len(ws.get())-1][0]).isdigit() else int(ws.get()[len(ws.get())-1][0]) +  1, req.item_name, "",intention_name, req.serial_number, req.full_name]
    print(row)
    ws.append_row(row)

    result = {
        "message": f"Assigned {req.item_name} with serial {req.serial_number} to {req.full_name} in group {req.group}"
    }
    append_to_sheet(result)
    return result

