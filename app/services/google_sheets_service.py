# app/services/google_sheets_service.py
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from app.config import *

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
credentials = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_FILE, scope)
client = gspread.authorize(credentials)
sheet = client.open_by_key(GOOGLE_SHEET_ID)

def initialize_data():
    """Initialize the Google Sheet with necessary structure."""
    try:
        # Iterate through all worksheet names
        for name in worksheet_names:
            try:
                # Create the worksheet if it doesn't exist
                sheet.add_worksheet(title=name, rows="100", cols="40")
                print(f"Created worksheet: {name}")
            except gspread.exceptions.APIError:
                print(f"Worksheet {name} already exists.")
            finally:
                # Ensure headers are set for each sheet except מלאי נשקיה and מלאי אופטיקה
                if name not in ["מלאי נשקיה", "מלאי אופטיקה"]:
                    worksheet = sheet.worksheet(name)
                    current_headers = worksheet.row_values(1)
                    if current_headers != headers:
                        worksheet.clear()  # Clear the sheet
                        worksheet.append_row(headers)  # Add the required headers
                        print(f"Headers set for worksheet: {name}")
            ensure_intention_columns()
    except Exception as e:
        print(f"Error initializing data: {e}") #sdf

def append_row(sheet_name: str, row_data: list):
    """Appends a row to the specified sheet"""
    try:
        worksheet = sheet.worksheet(sheet_name)
        worksheet.append_row(row_data)
        return {"message": "Row added successfully"}
    except gspread.exceptions.WorksheetNotFound:
        return {"error": f"Sheet '{sheet_name}' not found."}

# Function to get the sheet by name
def get_sheet_by_name(sheet_name):
    sheet = client.open_by_key(GOOGLE_SHEET_ID)
    return sheet.worksheet(sheet_name)


def insert_row_before_summary(sheet_name: str, row_data: list):
    """Inserts a row before the summary row if exists, else appends normally"""
    worksheet = sheet.worksheet(sheet_name)
    all_values = worksheet.get_all_values()

    insert_index = len(all_values) + 1  # Default to append at bottom

    if all_values and all_values[-1][0] == "סיכום":
        insert_index = len(all_values)  # One before last

    worksheet.insert_row(row_data, index=insert_index)


def append_weapon_intention_serial(sheet_name, intention_type, serial_number):
    sheet = get_sheet_by_name(sheet_name)

    # Get the headers (weapon intention types)
    columns = sheet.row_values(1)

    # Check if the intention type column exists
    if intention_type in columns:
        col_idx = columns.index(intention_type) + 1

        # Get the current column values, skipping the header row
        current_column_values = sheet.col_values(col_idx)[1:]
        # Check if the serial number already exists in the column
        if intention_type in ["מאפרו", "M5"] and serial_number not in current_column_values:
            return {"message": f"Serial number {serial_number} already exists in {intention_type} column."}

        # Find the next empty row (first empty value in the column)
        next_empty_row_idx = len(current_column_values) + 2  # Starting from row 2

        for i, value in enumerate(current_column_values):
            if not value:  # Empty cell found
                next_empty_row_idx = i + 2  # Adding 2 to account for header and index being 0-based
                break

        # Add the serial number in the first empty slot in the column
        sheet.update_cell(next_empty_row_idx, col_idx, serial_number)
    else:
        # Add a new column for the weapon intention type
        sheet.add_cols(1)  # Add one new column
        sheet.update_cell(1, len(columns) + 1, intention_type)  # Add column header
        sheet.update_cell(2, len(columns) + 1, serial_number)  # Add the first serial number

    return {"message": f"Weapon intention '{intention_type}' with serial number '{serial_number}' added successfully."}


def get_worksheet(sheet_name: str):
    """Fetch a worksheet by its name."""
    try:
        worksheet = sheet.worksheet(sheet_name)
        return worksheet
    except gspread.exceptions.WorksheetNotFound:
        return None  # Return None if the worksheet is not found

def find_and_update(sheet_name: str, search_term: str, update_value: str):
    """Find a row based on a search term and update a specific cell in that row"""
    try:
        worksheet = sheet.worksheet(sheet_name)

        # Find the row that contains the search term (this can be modified depending on your use case)
        cell = worksheet.find(search_term)

        if cell:
            # Update the value in the cell (for example, updating the serial number or other data)
            worksheet.update_cell(cell.row, cell.col, update_value)
            return {"message": f"Successfully updated the cell for {search_term}."}
        else:
            return {"error": f"{search_term} not found."}
    except gspread.exceptions.WorksheetNotFound:
        return {"error": f"Sheet '{sheet_name}' not found."}

def find_item_in_stock_and_remove(sheet_name, item_name, serial_number):
    """Find an item by name and serial, and remove it from the sheet."""
    try:
        worksheet = sheet.worksheet(sheet_name)
        headers = worksheet.row_values(1)
        if item_name not in headers:
            return False

        col_index = headers.index(item_name) + 1
        column_values = worksheet.col_values(col_index)[1:]  # Skip header
        for i, value in enumerate(column_values, start=2):
            if value == serial_number:
                worksheet.update_cell(i, col_index, '')  # Clear the cell
                return True
        return False
    except Exception as e:
        print(f"Error in find_item_in_stock_and_remove: {e}")
        return False

def assign_intention_to_person(group, full_name, intention_type, serial_number):
    ws = get_worksheet(group)
    if not ws:
        return {"error": f"Worksheet {group} not found."}

    headers = ws.row_values(1)

    # Ensure the "שם מלא" column exists
    try:
        name_col = headers.index("שם מלא") + 1
    except ValueError:
        return {"error": f"'שם מלא' column not found in {group} sheet."}

    # Ensure the intention type column exists
    if intention_type not in headers:
        col_index = len(headers) + 1
        ws.update_cell(1, col_index, intention_type)
    else:
        col_index = headers.index(intention_type) + 1

    # Find the row of the given full name
    name_cells = ws.col_values(name_col)
    for i, name in enumerate(name_cells[1:], start=2):  # Skip header
        if name.strip() == full_name.strip():
            # Check if intention cell is already filled
            existing_value = ws.cell(i, col_index).value
            if existing_value:
                return {"error": f"{full_name} already has an assigned intention '{intention_type}' in group '{group}'."}
            # Assign intention serial number
            ws.update_cell(i, col_index, serial_number)
            return {"message": f"Assigned intention '{intention_type}' to {full_name} in {group}."}

    return {"error": f"Person '{full_name}' not found in group '{group}'."}



def ensure_intention_columns():
    """Ensure all group sheets contain all intention types as columns."""
    intention_sheet = sheet.worksheet("מלאי אופטיקה")
    intentions = intention_sheet.row_values(1)
    intentions.remove("M5")
    intentions.remove("מאפרו")

    for group in worksheet_names:
        try:
            if group == "מלאי נשקיה" or group == "מלאי אופטיקה":
                continue
            ws = sheet.worksheet(group)
            current_columns = ws.row_values(1)

            missing = [intent for intent in intentions if intent not in current_columns]
            if missing:
                ws.add_cols(len(missing))
                for i, name in enumerate(missing, start=1):
                    ws.update_cell(1, len(current_columns) + i, name)

        except Exception as e:
            print(f"Error ensuring columns in group {group}: {e}") #


def insert_row_before_summary(sheet_name: str, row_data: list):
    """Inserts a row before the summary row if it exists, else appends normally"""
    worksheet = sheet.worksheet(sheet_name)
    all_values = worksheet.get_all_values()

    insert_index = len(all_values) + 1  # Default to append at bottom

    # Check if summary row exists
    if all_values and all_values[-1][0] == "סיכום":
        insert_index = len(all_values)  # One before the last row

    worksheet.insert_row(row_data, index=insert_index)


def append_weapon_serial(sheet_name, weapon_name, serial_number):
    sheet = get_sheet_by_name(sheet_name)

    # Get the headers (weapon types)
    columns = sheet.row_values(1)

    # Check if the weapon name column exists
    if weapon_name in columns:
        col_idx = columns.index(weapon_name) + 1

        # Get the current column values, skipping the header row
        current_column_values = sheet.col_values(col_idx)[1:]

        # Find the next empty row (first empty value in the column)
        next_empty_row_idx = len(current_column_values) + 2  # Starting from row 2

        for i, value in enumerate(current_column_values):
            if not value:  # Empty cell found
                next_empty_row_idx = i + 2  # Adding 2 to account for header and index being 0-based
                break

        # Add the serial number in the first empty slot in the column
        sheet.update_cell(next_empty_row_idx, col_idx, serial_number)
    else:
        # Add a new column for the weapon name
        sheet.add_cols(1)  # Add one new column
        sheet.update_cell(1, len(columns) + 1, weapon_name)  # Add column header
        sheet.update_cell(2, len(columns) + 1, serial_number)  # Add the first serial number

    return {"message": f"Weapon '{weapon_name}' with serial number '{serial_number}' added successfully."}


def update_summary_row(sheet_name):
    sheet = get_sheet_by_name(sheet_name)

    # Get the data excluding the summary row
    data = sheet.get_all_values()

    # Identify where the summary row is (assuming "סיכום" is in the last row)
    summary_row_idx = len(data) - 1

    # Check if the summary row exists
    if data[summary_row_idx][len(data[summary_row_idx])-1] != "סיכום":
        # If no summary row, insert a new one at the end
        sheet.append_row(["0"] * (len(data[0])) + ["סיכום"])
        summary_row_idx = len(data)  # Now it's the last row

    # Loop through each column and count the non-empty cells
    for col_idx in range(1, len(data[0])):  # Skipping "סיכום" column
        count = len([cell for cell in sheet.col_values(col_idx + 1) if cell]) - 1  # Exclude header
        # Update the summary row with the count value
        sheet.update_cell(summary_row_idx + 1, col_idx + 1, str(count))

    return {"message": "Summary row updated successfully."}


def insert_row_before_summary(sheet_name: str, row_data: list):
    """Inserts a row before the summary row if exists, else appends normally"""
    worksheet = sheet.worksheet(sheet_name)
    all_values = worksheet.get_all_values()

    insert_index = len(all_values) + 1  # Default to append at bottom

    if all_values and all_values[-1][0] == "סיכום":
        insert_index = len(all_values)  # One before last

    worksheet.insert_row(row_data, index=insert_index)