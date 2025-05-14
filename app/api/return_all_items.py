# app/api/return_all_items.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.google_sheets_service import *
from app.services.response_logger import append_to_sheet
router = APIRouter()

class ReturnAllRequest(BaseModel):
    full_name: str
    group: str

@router.post("/")
def return_all_items(req: ReturnAllRequest):
    ws = get_worksheet(req.group)
    lst = ["סידורי מספר", "נשק סוג", "כמות"    "כוונת", "מסד", "שם מלא", "הערות"]

    if not ws:
        return {"error": f"Worksheet for group '{req.group}' not found."}

    rows = ws.get_all_values()
    if not rows:
        return {"error": "Worksheet is empty."}

    headers = rows[0]
    returned = []
    updated_rows = []
    removed = False

    try:
        name_col_idx = headers.index("שם מלא")
    except ValueError:
        return {"error": "'שם מלא' column not found in sheet."}

    for row in rows[1:]:
        if len(row) < len(headers):
            row += [""] * (len(headers) - len(row))  # pad row to match headers

        if row[name_col_idx].strip() == req.full_name.strip():
            removed = True

            # Return weapon to "מלאי נשקיה"
            weapon_type = row[1].strip()
            weapon_serial = row[4].strip()
            if weapon_type and weapon_serial:
                append_weapon_intention_serial("מלאי נשקיה", weapon_type, weapon_serial)
                returned.append(weapon_serial)

            intention_type = row[3].strip()
            if intention_type:
                append_weapon_intention_serial("מלאי אופטיקה", intention_type, "1")

            # Return each intention using your helper function
            i = 7
            while i < len(headers):
                value = row[i].strip()
                if value:
                    append_weapon_intention_serial("מלאי אופטיקה", headers[i], value)
                    returned.append(value)
                i += 1

        else:
            updated_rows.append(row)

    if not removed:
        return {"error": f"{req.full_name} not found in group '{req.group}'."}

    # Rewrite the sheet without the removed person
    ws.clear()
    ws.append_row(headers)
    for r in updated_rows:
        ws.append_row(r)

    result = {
        "message": f"Returned all items for {req.full_name}",
        "returned_serials": returned
    }
    append_to_sheet(result)
    return result
