from fastapi import APIRouter
from pydantic import BaseModel
from app.services.response_logger import append_to_sheet
from app.services.google_sheets_service import *
router = APIRouter()

class ItemToRepair(BaseModel):
    is_weapon: bool
    item_type: str
    serial_number: str


@router.post("/")
def send_item(intention: ItemToRepair):
    """
    we move item from:
    מלאי נשקיה׳׳
    מלאי אופטיקה׳
    and we defer between them by is_weapon.
    and take the item with the serial_number and check if the item_type is one of the headers and add the serial number,׳
    if it doesnt appear so we append new col in the header and set the serial_number there (we delete the item from the previos sheet)
    """
    if intention.is_weapon:
        # Move item from "מלאי נשקיה" to "מלאי אופטיקה"
        result = move_item("מלאי נשקיה", "תקול לסדנא", intention.item_type, intention.serial_number)
    else:
        # Move item from "מלאי אופטיקה" to "מלאי נשקיה"
        result = move_item("מלאי אופטיקה", "תקול לסדנא", intention.item_type, intention.serial_number)

    append_to_sheet(result)
    return result



def move_item(source_sheet_name, target_sheet_name, item_type, serial_number):
    """
    Moves an item from the source sheet to the target sheet.
    If the item type does not exist as a header in the target sheet, a new column is added.
    """
    try:
        ws_source = sheet.worksheet(source_sheet_name)
        # Get headers and data from the source sheet
        source_headers = ws_source.row_values(1)
        if item_type not in source_headers:
            return {"error": f"Item type '{item_type}' not found in source sheet '{source_sheet_name}'"}

        # Find the column index for the item type
        col_index = source_headers.index(item_type) + 1
        col_values = ws_source.col_values(col_index)[1:]  # Skip header

        # Check if the serial number exists in the column
        if serial_number not in col_values:
            return {"error": f"Serial number '{serial_number}' not found under item type '{item_type}' in '{source_sheet_name}'"}

        # Remove the serial number from the source sheet
        row_index = col_values.index(serial_number) + 2  # Account for header and 0-based index
        ws_source.update_cell(row_index, col_index, "")

        # Get headers from the target sheet
        target_sheet = sheet.worksheet(target_sheet_name)
        target_headers = target_sheet.row_values(1)
        if item_type not in target_headers:
            # Add a new column for the item type in the target sheet
            target_sheet.update_cell(1, len(target_headers) + 1, item_type)
            target_headers.append(item_type)

        # Find the column index for the item type in the target sheet
        target_col_index = target_headers.index(item_type) + 1
        target_col_values = target_sheet.col_values(target_col_index)[1:]  # Skip header

        # Add the serial number to the next empty row in the target column
        # Find the first empty cell in the column
        for i, value in enumerate(target_col_values, start=2):  # Start from row 2 (skip header)
            if value == "":
                next_empty_row = i
                break
        else:
            # Default to the last empty spot if no empty cell is found
            next_empty_row = len(target_col_values) + 2  # Account for header and 0-based index
        target_sheet.update_cell(next_empty_row, target_col_index, serial_number)
        return {"success": f"Serial number '{serial_number}' moved from '{source_sheet_name} to 'תקול לסדנא'"}

    except Exception as e:
        return {"error": str(e)}