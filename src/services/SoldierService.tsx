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
  sheetName: string,
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
    // @ts-ignore
    const encodedArmoryRange = encodeURIComponent(armoryInventorySheet.range);
    const armoryResult = await GoogleSheetsService.fetchSheetData(accessToken, encodedArmoryRange);

    const weaponType = selectedRow['סוג_נשק'];
    const serial = selectedRow['מסד'];

    // Extract the header row to find the column for weaponType
    const armoryHeaderRow = armoryResult.values[0] || [];
    const weaponColumnIndex = armoryHeaderRow.findIndex(
      (header: string) => header === weaponType
    );
    
    if (weaponColumnIndex !== -1) {
      // Find the right position to insert the data
      const insertPosition = await GoogleSheetsService.findInsertIndex(armoryResult.values, weaponType);

      // Add request to update armory inventory at the specific position
      if (armoryInventorySheet && armoryInventorySheet !== undefined) {

      batchRequests.push({
        updateCells: {
          start: {
            sheetId: armoryInventorySheet.id,
            rowIndex: insertPosition.row,
            columnIndex: insertPosition.col
          },
          rows: [{
            values: [{userEnteredValue: {stringValue: serial}}]
          }],
          fields: 'userEnteredValue'
        }
      });
    }
    } else {
      console.log(`לא נמצא עמודה עבור סוג הנשק: ${weaponType}`);
    }
    
    // PART 2: Handle optical inventory sheet
    // Get data from the optical inventory sheet
    // @ts-ignore
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
    
    // Extract the header row for optical inventory
    const opticalHeaderRow = opticalResult.values[0] || [];
    
    // Check the 'כוונת' field value
    const sightType = selectedRow?.['כוונת'];
    
    // If sight type exists, add it to the optical inventory with proper insertion
    if (sightType && sightType.trim() !== '') {
      // Find the column index for the sight type
      const sightTypeColumnIndex = opticalHeaderRow.findIndex((header: string) => header === sightType);
      
      if (sightTypeColumnIndex !== -1) {
        // Find the appropriate position to insert the sight data
        const insertPosition = GoogleSheetsService.findInsertIndex(opticalResult.values, sightType);

        // Add request to update optical inventory at the specific position
        if (opticalInventorySheet && opticalInventorySheet !== undefined) {
          batchRequests.push({
            updateCells: {
              start: {
                sheetId: opticalInventorySheet.id,
                rowIndex: insertPosition.row,
                columnIndex: insertPosition.col
              },
              rows: [{
                values: [{userEnteredValue: {stringValue: '1'}}]
              }],
              fields: 'userEnteredValue'
            }
          });
        }
      }
    }
    
    // Update each column from headersStartingFromG in the appropriate position
    for (const header of headersStartingFromG) {
      const value = selectedRow?.[header] || '';
      // Only proceed if there's a value to insert
      if (value && value.trim() !== '') {
        const columnIndex = opticalHeaderRow.findIndex((h: string) => h === header);
        
        if (columnIndex !== -1) {
          // Find the appropriate position to insert this specific header's data
          const insertPosition = GoogleSheetsService.findInsertIndex(opticalResult.values, header);

          // Add request to update optical inventory for this header
          if (opticalInventorySheet && opticalInventorySheet !== undefined) {
            batchRequests.push({
              updateCells: {
                start: {
                  sheetId: opticalInventorySheet.id,
                  rowIndex: insertPosition.row,
                  columnIndex: insertPosition.col
                },
                rows: [{
                  values: [{userEnteredValue: {stringValue: value}}]
                }],
                fields: 'userEnteredValue'
              }
            });
          }
        }
      }
    }
    
    // PART 3: Remove the soldier from the soldier sheet
    if (selectedRow.rowRealIndex !== -1) {
      // Find the sheet ID for the current sheet
      const sheetInfo = sheets.find(item => item.sheet.range === sheetName);
      if (!sheetInfo || !sheetInfo.sheet.id) {
        console.log(`Could not find sheet ID for: ${sheetName}`);
        return false;
      }
      
      const sheetId = sheetInfo.sheet.id;
      const rowIndexToRemove = selectedRow.rowRealIndex;
      
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
