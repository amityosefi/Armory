import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import TabsNavigation from './TabsNavigation';
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
        <div className="ag-theme-alpine w-full h-[70vh] ag-rtl">
          <AgGridReact
            columnDefs={columnDefs}
            rowData={sheetData}
            domLayout="normal"
            enableRtl={true}
            defaultColDef={{
              flex: 1,
              minWidth: 100,
              resizable: true
            }}
          />
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg p-6 text-center">
          <p className="text-gray-700">אין מידע זמין עבור גליון זה.</p>
        </div>
      )}
    </div>
  );
};

export default SheetGroupPage;
