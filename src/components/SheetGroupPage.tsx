import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TabsNavigation from './TabsNavigation';
import SheetDataGrid from './SheetDataGrid';
import GoogleSheetsService from '../services/GoogleSheetsService';
import { DEFAULT_SPREADSHEET_ID } from '../constants';
import type { SheetGroup } from '../types';

interface SheetGroupPageProps {
  accessToken: string;
  sheetGroups: SheetGroup[];
}

const SheetGroupPage: React.FC<SheetGroupPageProps> = ({ accessToken, sheetGroups }) => {
  const { groupId } = useParams();
  const groupIndex = parseInt(groupId || "0");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_selectedRow, setSelectedRow] = useState<any | null>(null);
  const spreadsheetId = DEFAULT_SPREADSHEET_ID;

  // Make sure groupIndex is valid
  const currentGroup = groupIndex >= 0 && groupIndex < sheetGroups.length 
    ? sheetGroups[groupIndex] 
    : sheetGroups[0];

  // Function to fetch data based on sheet selection
  const fetchSheetData = async (sheetIndex: number) => {
    setActiveTabIndex(sheetIndex);
    const selectedSheet = currentGroup.sheets[sheetIndex];
    
    setLoading(true);
    setError(null);
    setSelectedRow(null);

    try {
      const encodedRange = encodeURIComponent(selectedSheet.range);
      console.log(`Fetching sheet: ${spreadsheetId} with range: ${selectedSheet.range}`);
      
      const result = await GoogleSheetsService.fetchSheetData(accessToken, spreadsheetId, encodedRange);
      console.log('API Response:', result);

      if (result.error) {
        throw new Error(`Google Sheets API error: ${result.error.message}`);
      }

      if (!result.values || result.values.length === 0) {
        setSheetData([]);
        setColumnDefs([]);
        throw new Error('No data found in the specified range');
      }

      // Process the data using our service
      const { columnDefs: cols, rowData } = GoogleSheetsService.processSheetData(result);

      // Add checkbox selection to first column
      if (cols.length > 0) {
        cols[0] = {
          ...cols[0],
          checkboxSelection: true,
          headerCheckboxSelection: false,
          width: 60,
          flex: 0,
        };
      }

      setColumnDefs(cols);
      setSheetData(rowData);
      console.log(`Processed ${rowData.length} rows of data`);
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sheet data');
      setSheetData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for the first tab when the component mounts or group changes
  useEffect(() => {
    if (currentGroup && currentGroup.sheets.length > 0) {
      fetchSheetData(0);
    }
  }, [currentGroup]);

  // Function to handle crediting soldier
  const handleCreditSoldier = async (weaponType: string, serial: string) => {
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
      setError('לא נמצא גליון מלאי נשקיה');
      return;
    }

    setLoading(true);
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

      // Determine the next row to insert data
      const nextRow = result.values.length + 1;
      
      // Prepare data for insertion
      // Assuming the columns in מלאי נשקיה are ordered as: Type, Serial, etc.
      // You might need to adjust column positions based on actual sheet structure
      const range = `${armoryInventorySheet.name}!A${nextRow}:B${nextRow}`;
      const values = [[weaponType, serial]];
      
      // Insert data into the armory inventory sheet
      await GoogleSheetsService.appendSheetData(
        accessToken,
        spreadsheetId,
        range,
        values
      );

      // Show success message
      alert(`חייל זוכה בהצלחה! נוסף ${weaponType} מספר ${serial} למלאי הנשקיה`);
      
      // Refresh current sheet data
      fetchSheetData(activeTabIndex);
      
    } catch (error) {
      console.error('Error crediting soldier:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בזיכוי החייל');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{currentGroup.name}</h2>
      
      {/* Tabs Navigation */}
      <TabsNavigation 
        sheets={currentGroup.sheets} 
        activeTabIndex={activeTabIndex} 
        onTabChange={fetchSheetData} 
      />

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700">טוען מידע...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      ) : sheetData.length > 0 ? (
        <SheetDataGrid
          columnDefs={columnDefs}
          rowData={sheetData}
          groupIndex={groupIndex}
          onRowSelected={setSelectedRow}
          onCreditSoldier={handleCreditSoldier}
        />
      ) : (
        <div className="bg-white shadow-lg rounded-lg p-6 text-center">
          <p className="text-gray-700">אין מידע זמין עבור גליון זה.</p>
        </div>
      )}
    </div>
  );
};

export default SheetGroupPage;
