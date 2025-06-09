import GoogleSheetsService from './GoogleSheetsService';
import type { SheetGroup } from '../types';

/**
 * Credits a weapon to a soldier by adding it to the armory inventory
 */
export const creditSoldier = async (
  accessToken: string, 
  sheetGroups: SheetGroup[],
  selectedRow: any,
  headersStartingFromG: string[],
  sheetName: string
): Promise<boolean> => {
  // Find both required sheets in the sheet groups
  const sheets = sheetGroups.flatMap(group => 
    group.sheets.map(sheet => ({ sheet, group }))
  );
  
  const armoryInventorySheet = sheets.find(item => item.sheet.name === 'מלאי נשקיה')?.sheet;
  const opticalInventorySheet = sheets.find(item => item.sheet.name === 'מלאי אופטיקה')?.sheet;

  try {
    // Collect all requests for batch update
    const batchRequests = [];

    // PART 1: Handle armory inventory sheet
    // Get data from the armory inventory sheet
    const encodedArmoryRange = encodeURIComponent(armoryInventorySheet.range);
    const armoryResult = await GoogleSheetsService.fetchSheetData(accessToken, encodedArmoryRange);

    const weaponType = selectedRow['סוג_נשק'];
    const serial = selectedRow['מסד'];

    // Extract the header row to find the column for weaponType
    const armoryHeaderRow = armoryResult.values[0] || [];
    const weaponColumnIndex = armoryHeaderRow.findIndex(
      (header: string) => header === weaponType
    );
    
    if (weaponColumnIndex === -1) {
      console.log(`לא נמצא עמודה עבור סוג הנשק: ${weaponType}`);
      return false;
    }

    // Add request to update armory inventory
    batchRequests.push({
      appendCells: {
        sheetId: armoryInventorySheet.id,
        rows: [{
          values: Array(weaponColumnIndex).fill({ userEnteredValue: { stringValue: '' } }).concat([
            { userEnteredValue: { stringValue: serial } }
          ])
        }],
        fields: 'userEnteredValue'
      }
    });
    
    // PART 2: Handle optical inventory sheet
    // Get data from the optical inventory sheet
    const encodedOpticalRange = encodeURIComponent(opticalInventorySheet.range);
    const opticalResult = await GoogleSheetsService.fetchSheetData(accessToken, encodedOpticalRange);
    
    if (opticalResult.error) {
      console.log(`Google Sheets API error: ${opticalResult.error.message}`);
      return false;
    }
    
    if (!opticalResult.values) {
      console.log('No data found in optical inventory sheet');
      return false;
    }
    
    // Determine the next row to insert data
    
    // Check the 'כוונת' field value
    const sightType = selectedRow?.['כוונת'];
    
    // Prepare optical inventory update row
    const opticalHeaderRow = opticalResult.values[0] || [];
    
    // Create a complete row for the optics sheet
    const opticsRow = Array(opticalHeaderRow.length).fill({ userEnteredValue: { stringValue: '' } });
    
    // Set M5 or מפרו in the appropriate column
    if (sightType === 'M5') {
      opticsRow[2] = { userEnteredValue: { stringValue: '1' } }; // Column C (index 2)
    } else if (sightType === 'מפרו') {
      opticsRow[0] = { userEnteredValue: { stringValue: '1' } }; // Column A (index 0)
    }
    
    // Update each column from headersStartingFromG in the appropriate position
    for (const header of headersStartingFromG) {
      const value = selectedRow?.[header] || '';
      const columnIndex = opticalHeaderRow.findIndex((h:string) => h === header);
      
      if (columnIndex !== -1) {
        opticsRow[columnIndex] = { userEnteredValue: { stringValue: value } };
      }
    }
    
    // Add request to update optical inventory
    batchRequests.push({
      appendCells: {
        sheetId: opticalInventorySheet.id,
        rows: [{ values: opticsRow }],
        fields: 'userEnteredValue'
      }
    });
    
    // PART 3: Remove the soldier from the soldier sheet
    if (selectedRow.rowIndex !== -1) {
      // Find the sheet ID for the current sheet
      const sheetInfo = sheets.find(item => item.sheet.range === sheetName);
      if (!sheetInfo || !sheetInfo.sheet.id) {
        console.log(`Could not find sheet ID for: ${sheetName}`);
        return false;
      }
      
      const sheetId = sheetInfo.sheet.id;
      const rowIndexToRemove = selectedRow.rowIndex;
      
      // Add request to remove row
      batchRequests.push({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: rowIndexToRemove + 1,
            endIndex: rowIndexToRemove + 2
          }
        }
      });
    }
    
    // Execute all operations in a single batch update
    const batchUpdateSuccess = await GoogleSheetsService.executeBatchUpdate(
      accessToken, 
      batchRequests
    );
    
    if (!batchUpdateSuccess) {
      console.log('Failed to complete batch update operations');
      return false;
    }
    
    console.log('Successfully credited soldier with batch update');

  } catch (error) {
    console.log('Error crediting soldier:', error);
    return false;
  }
  return true;
};
