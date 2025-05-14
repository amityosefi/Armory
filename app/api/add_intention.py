# app/api/add_intention.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet

router = APIRouter()

class WeaponIntention(BaseModel):
    intention_type: str
    serial_number: str  # Serial number as a field

@router.post("/")
def add_weapon_intention_type(intention: WeaponIntention):

    # Add the weapon intention serial number to the stock sheet
    result = append_weapon_intention_serial("מלאי אופטיקה", intention.intention_type, intention.serial_number)

    # Ensure all group sheets have this new intention column
    ensure_intention_columns()
    append_to_sheet(result)
    return result