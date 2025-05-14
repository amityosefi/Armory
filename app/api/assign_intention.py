# app/api/assign_intention.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_sheets_service import *
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet
router = APIRouter()

class AssignIntentionRequest(BaseModel):
    full_name: str
    group: str
    intention_type: str
    serial_number: str

@router.post("/")
def assign_intention(req: AssignIntentionRequest):
    # Step 1: Remove from stock
    removed = find_item_in_stock_and_remove("מלאי אופטיקה", req.intention_type, req.serial_number)
    if not removed:
        return {"error": f"{req.intention_type} with serial {req.serial_number} not found in {"מלאי אופטיקה"}"}

    result = assign_intention_to_person(
        group=req.group,
        full_name=req.full_name,
        intention_type=req.intention_type,
        serial_number=req.serial_number
    )
    append_to_sheet(result)
    return result
