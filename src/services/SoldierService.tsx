import GoogleSheetsService from './GoogleSheetsService';
import type { SheetGroup } from '../types';

/**
 * Credits a weapon to a soldier by adding it to the armory inventory
 */
export const creditSoldier = async (
  accessToken: string, 
  spreadsheetId: string,
  weaponType: string, 
  serial: string, 
  sheetGroups: SheetGroup[]
): Promise<void> => {
  // Find the מלאי נשקיה sheet in the sheet groups
  let armoryInventorySheetGroup = null;
  let armoryInventorySheet = null;
  
  for (let i = 0; i < sheetGroups.length; i++) {
    const group = sheetGroups[i];
    for (let j = 0; j < group.sheets.length; j++) {
      if (group.sheets[j].name === 'מלאי נשקיה') {
        armoryInventorySheetGroup = group;
        armoryInventorySheet = group.sheets[j];
        break;
      }
    }
    if (armoryInventorySheetGroup) break;
  }

  if (!armoryInventorySheet) {
    throw new Error('לא נמצא גליון מלאי נשקיה');
  }

  try {
    // Get the next available row in the armory inventory sheet
    const encodedRange = encodeURIComponent(armoryInventorySheet.range);
    const result = await GoogleSheetsService.fetchSheetData(accessToken, spreadsheetId, encodedRange);
    
    if (result.error) {
      throw new Error(`Google Sheets API error: ${result.error.message}`);
    }

    if (!result.values) {
      throw new Error('No data found in armory inventory sheet');
    }

    // Extract the header row to find the column for weaponType
    const headerRow = result.values[0] || [];
    const columnIndex = headerRow.findIndex(
      (header: string) => header === weaponType
    );
    
    if (columnIndex === -1) {
      throw new Error(`לא נמצא עמודה עבור סוג הנשק: ${weaponType}`);
    }
    
    // Determine the next row to insert data
    const nextRow = result.values.length + 1;
    
    // Convert column index to letter (A, B, C, etc.)
    const columnLetter = String.fromCharCode(65 + columnIndex); // A=65 in ASCII
    
    // Prepare data for insertion with serial in the correct column
    const range = `${armoryInventorySheet.name}!${columnLetter}${nextRow}:${columnLetter}${nextRow}`;
    
    // Create a row with the serial in the right position
    const values = [[serial]];
    
    // Insert data into the armory inventory sheet
    await GoogleSheetsService.appendSheetData(
      accessToken,
      spreadsheetId,
      range,
      values
    );
  } catch (error) {
    console.error('Error crediting soldier:', error);
    throw error;
  }
};
