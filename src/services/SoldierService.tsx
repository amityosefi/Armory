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
  sheetGroups: SheetGroup[],
  selectedRow: any
): Promise<void> => {
  // Find both required sheets in the sheet groups
  const sheets = sheetGroups.flatMap(group => 
    group.sheets.map(sheet => ({ sheet, group }))
  );
  
  const armoryInventorySheet = sheets.find(item => item.sheet.name === 'מלאי נשקיה')?.sheet;
  const opticalInventorySheet = sheets.find(item => item.sheet.name === 'מלאי אופטיקה')?.sheet;

  if (!armoryInventorySheet) {
    throw new Error('לא נמצא גליון מלאי נשקיה');
  }
  
  if (!opticalInventorySheet) {
    throw new Error('לא נמצא גליון מלאי אופטיקה');
  }

  try {
    // PART 1: Handle armory inventory sheet
    // Get data from the armory inventory sheet
    const encodedArmoryRange = encodeURIComponent(armoryInventorySheet.range);
    const armoryResult = await GoogleSheetsService.fetchSheetData(accessToken, spreadsheetId, encodedArmoryRange);
    
    if (armoryResult.error) {
      throw new Error(`Google Sheets API error: ${armoryResult.error.message}`);
    }

    if (!armoryResult.values) {
      throw new Error('No data found in armory inventory sheet');
    }

    // Extract the header row to find the column for weaponType
    const armoryHeaderRow = armoryResult.values[0] || [];
    const weaponColumnIndex = armoryHeaderRow.findIndex(
      (header: string) => header === weaponType
    );
    
    if (weaponColumnIndex === -1) {
      throw new Error(`לא נמצא עמודה עבור סוג הנשק: ${weaponType}`);
    }
    
    // Determine the next row to insert data
    const armoryNextRow = armoryResult.values.length + 1;
    
    // Convert column index to letter (A, B, C, etc.)
    const weaponColumnLetter = String.fromCharCode(65 + weaponColumnIndex); // A=65 in ASCII
    
    // Prepare data for insertion with serial in the correct column
    const armoryRange = `${armoryInventorySheet.name}!${weaponColumnLetter}${armoryNextRow}:${weaponColumnLetter}${armoryNextRow}`;
    
    // Create a row with the serial in the right position
    const armoryValues = [[serial]];
    
    // Insert data into the armory inventory sheet
    await GoogleSheetsService.appendSheetData(
      accessToken,
      spreadsheetId,
      armoryRange,
      armoryValues
    );
    
    // PART 2: Handle optical inventory sheet
    // Get data from the optical inventory sheet
    const encodedOpticalRange = encodeURIComponent(opticalInventorySheet.range);
    const opticalResult = await GoogleSheetsService.fetchSheetData(accessToken, spreadsheetId, encodedOpticalRange);
    
    if (opticalResult.error) {
      throw new Error(`Google Sheets API error: ${opticalResult.error.message}`);
    }
    
    if (!opticalResult.values) {
      throw new Error('No data found in optical inventory sheet');
    }
    
    // Determine the next row to insert data
    const opticalNextRow = opticalResult.values.length + 1;
    
    // Check the 'כוונת' field value and prepare appropriate data for columns A and B
    const sightType = selectedRow?.['כוונת'];
    let columnAValue = null;
    let columnBValue = null;
    
    if (sightType === 'M5') {
      columnAValue = '1';
    } else if (sightType === 'מאפרו') {
      columnBValue = '1';
    }
    
    // Extract optical item values from the selected row
    const opticalItems = [
      selectedRow?.['עמית'] || null,
      selectedRow?.['עדי'] || null,
      selectedRow?.['עידו'] || null,
      selectedRow?.['ציין'] || null,
      selectedRow?.['אקילה'] || null,
      selectedRow?.['טריג'] || null,
      selectedRow?.['שחע'] || null,
      selectedRow?.['משקפת'] || null,
      selectedRow?.['שחמ'] || null
    ];
    
    // Create a combined array with all values (columns A through L)
    const combinedRowData = [columnAValue, columnBValue, ...opticalItems];
    
    // Insert all data in one call (columns A through L)
    const fullOpticalRange = `${opticalInventorySheet.name}!A${opticalNextRow}:L${opticalNextRow}`;
    await GoogleSheetsService.appendSheetData(
      accessToken,
      spreadsheetId,
      fullOpticalRange,
      [combinedRowData]
    );
  } catch (error) {
    console.error('Error crediting soldier:', error);
    throw error;
  }
};
