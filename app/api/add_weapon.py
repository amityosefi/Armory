# app/api/add_weapon.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet
router = APIRouter()


class Weapon(BaseModel):
    weapon_name: str
    serial_number: str  # Serial number as a field


@router.post("/")
def add_weapon_type(weapon: Weapon):

    # Add the weapon serial number to the respective sheet
    result = append_weapon_serial("מלאי נשקיה", weapon.weapon_name, weapon.serial_number)
    # update_summary_row("מלאי נשקיה")
    append_to_sheet(result)
    return result
