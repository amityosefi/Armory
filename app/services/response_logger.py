from fastapi import Request, Response
from fastapi.responses import JSONResponse
from app.services.google_sheets_service import sheet

def append_to_sheet(data):
    """
    Append data to the specified Google Sheet.
    """
    try:
        worksheet = sheet.worksheet("תיעוד")
        worksheet.append_row([str(data)])
    except Exception as e:
        print(f"Error appending to תיעוד: {e}")