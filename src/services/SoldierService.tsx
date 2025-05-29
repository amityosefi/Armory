import GoogleSheetsService from './GoogleSheetsService';
import type { SheetGroup } from '../types';

/**
 * Credits a weapon to a soldier by adding it to the armory inventory
 */
export const creditSoldier = async (
  accessToken: string, 
  sheetGroups: SheetGroup[],
  selectedRow: any,
  headersStartingFromG: string[]
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
    const armoryResult = await GoogleSheetsService.fetchSheetData(accessToken, encodedArmoryRange);
    
    if (armoryResult.error) {
      throw new Error(`Google Sheets API error: ${armoryResult.error.message}`);
    }

    if (!armoryResult.values) {
      throw new Error('No data found in armory inventory sheet');
    }

    const weaponType = selectedRow['סוג_נשק']; // Get weapon type from selected row
    const serial = selectedRow['מסד']; // Get serial number from selected row

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
    console.log("matan: ", armoryRange);
    // Create a row with the serial in the right position
    const armoryValues = [[serial]];
    
    // Insert data into the armory inventory sheet
    await GoogleSheetsService.appendSheetData(
      accessToken,
      armoryRange,
      armoryValues
    );
    
    // PART 2: Handle optical inventory sheet
    // Get data from the optical inventory sheet
    const encodedOpticalRange = encodeURIComponent(opticalInventorySheet.range);
    const opticalResult = await GoogleSheetsService.fetchSheetData(accessToken, encodedOpticalRange);
    
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
    
    // First, create a new empty row in the optics sheet
    // We'll use column A as our anchor point to create the row
    await GoogleSheetsService.updateGoogleSheetCell({
      accessToken,
      sheetName: opticalInventorySheet.name,
      rowIndex: opticalNextRow,
      colIndex: sightType === 'M5' ? 3 : 1, // Column D or B
      value: ['M5', 'מפרו'].includes(sightType) ? '1' : ''
    });

    // Fetch the optical sheet headers to map correctly
    const opticalHeaderRow = opticalResult.values[0] || [];

    // Update each column from headersStartingFromG in the appropriate position
    for (const header of headersStartingFromG) {
      const value = selectedRow?.[header] || '';
      
      // Find the matching column in the optics sheet
      const columnIndex = opticalHeaderRow.findIndex(h => h === header);
      
      // If column exists in the optics sheet, update it
      if (columnIndex !== -1) {
        await GoogleSheetsService.updateGoogleSheetCell({
          accessToken,
          sheetName: opticalInventorySheet.name,
          rowIndex: opticalNextRow,
          colIndex: columnIndex,
          value: value
        });
      }
    }

      } catch (error) {
    console.error('Error crediting soldier:', error);
    throw error;
  }
};
