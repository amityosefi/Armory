from fastapi import APIRouter
from pydantic import BaseModel
from app.api.send_item import move_item
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet

router = APIRouter()

class ItemToStock(BaseModel):
    is_weapon: bool
    item_type: str
    serial_number: str


@router.post("/")
def recieve_item(intention: ItemToStock):
    """
    we move item from:
    מלאי נשקיה׳׳
    מלאי אופטיקה׳
    and we defer between them by is_weapon.
    and take the item with the serial_number and check if the item_type is one of the headers and add the serial number,׳
    if it doesnt appear so we append new col in the header and set the serial_number there (we delete the item from the previos sheet)
    """
    if intention.is_weapon:
        # Move item to "מלאי נשקיה" from "מלאי אופטיקה"
        result = move_item("תקול לסדנא","מלאי נשקיה",  intention.item_type, intention.serial_number)
    else:
        # Move item to "מלאי אופטיקה" from "מלאי נשקיה"
        result = move_item("תקול לסדנא","מלאי אופטיקה", intention.item_type, intention.serial_number)

    append_to_sheet(result)
    return result