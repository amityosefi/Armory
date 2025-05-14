# app/services/google_sheets_service.py
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from app.config import GOOGLE_SHEET_ID, SERVICE_ACCOUNT_FILE

scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]

credentials = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_FILE, scope)
client = gspread.authorize(credentials)
sheet = client.open_by_key(GOOGLE_SHEET_ID)


# Function to get the sheet by name
def get_sheet_by_name(sheet_name):
    sheet = client.open_by_key(GOOGLE_SHEET_ID)
    return sheet.worksheet(sheet_name)


# Function to append serial numbers for weapon intentions
def append_weapon_intention_serial(sheet_name, intention_type, serial_number):
    sheet = get_sheet_by_name(sheet_name)

    # Get the headers (weapon intention types)
    columns = sheet.row_values(1)

    # Check if the intention type column exists
    if intention_type in columns:
        col_idx = columns.index(intention_type) + 1

        # Check if the serial number already exists
        existing_serials = sheet.col_values(col_idx)[1:]  # Skip header row
        if serial_number in existing_serials:
            return {"message": f"Serial number {serial_number} already exists in {intention_type} column."}

        # Append serial number in the next available row under the respective intention type
        sheet.append_row([serial_number if idx == col_idx - 1 else '' for idx in range(len(columns))])
    else:
        # Add a new column for the weapon intention type
        sheet.add_cols(1)  # Add one new column
        sheet.update_cell(1, len(columns) + 1, intention_type)  # Add column header
        sheet.update_cell(2, len(columns) + 1, serial_number)  # Add the first serial number

    return {"message": f"Weapon intention '{intention_type}' with serial number '{serial_number}' added successfully."}


# Function to handle adding weapon to the stock
def append_weapon_serial(sheet_name, weapon_name, serial_number):
    sheet = get_sheet_by_name(sheet_name)

    # Get the headers (weapon types)
    columns = sheet.row_values(1)

    # Check if the weapon name column exists
    if weapon_name in columns:
        col_idx = columns.index(weapon_name) + 1

        # Check if the serial number already exists
        existing_serials = sheet.col_values(col_idx)[1:]  # Skip header row
        if serial_number in existing_serials:
            return {"message": f"Serial number {serial_number} already exists for weapon {weapon_name}."}

        # Append serial number in the next available row under the respective weapon type
        sheet.append_row([serial_number if idx == col_idx - 1 else '' for idx in range(len(columns))])
    else:
        # Add a new column for the weapon name
        sheet.add_cols(1)  # Add one new column
        sheet.update_cell(1, len(columns) + 1, weapon_name)  # Add column header
        sheet.update_cell(2, len(columns) + 1, serial_number)  # Add the first serial number

    return {"message": f"Weapon '{weapon_name}' with serial number '{serial_number}' added successfully."}