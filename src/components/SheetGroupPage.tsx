import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TabsNavigation from './route/TabsNavigation.tsx';
import SheetDataGrid from './SheetDataGrid';
import GoogleSheetsService from '../services/GoogleSheetsService';
import { creditSoldier } from '../services/SoldierService';
import type { SheetGroup } from '../types';
import { useGoogleSheetData } from './hooks/useGoogleSheetData.tsx';

interface SheetGroupPageProps {
  accessToken: string;
  sheetGroups: SheetGroup[];
}

const SheetGroupPage: React.FC<SheetGroupPageProps> = ({ accessToken, sheetGroups }) => {
  const { groupId } = useParams();
  const groupIndex = parseInt(groupId || "0");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // Make sure groupIndex is valid
  const currentGroup = groupIndex >= 0 && groupIndex < sheetGroups.length 
    ? sheetGroups[groupIndex] 
    : sheetGroups[0];
    
  // Get the currently selected sheet
  const selectedSheet = currentGroup.sheets[activeTabIndex];
  const encodedRange = selectedSheet ? encodeURIComponent(selectedSheet.range) : '';
  
  // Use the React Query hook
  const { 
    data: sheetQueryData,
    isLoading,
    error,
    refetch
  } = useGoogleSheetData(
    {
      accessToken,
      range: encodedRange
    },
    {
      // Don't process data here, we'll do it with custom logic below
      processData: false,
      enabled: !!accessToken && !!encodedRange
    }
  );
  
  // Derived state from query results
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  
  // Process data when query results change
  useEffect(() => {
    if (sheetQueryData && !isLoading) {
      if (!sheetQueryData.values || sheetQueryData.values.length === 0) {
        setSheetData([]);
        setColumnDefs([]);
        return;
      }
      
      // Process the data using our service
      const { columnDefs: cols, rowData } = GoogleSheetsService.processSheetData(sheetQueryData);
      
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
    }
  }, [sheetQueryData, isLoading]);

  // Function to change sheet tab
  const handleTabChange = (sheetIndex: number) => {
    setActiveTabIndex(sheetIndex);
    setSelectedRow(null);
  };

  // Fetch data for the first tab when the component mounts or group changes
  useEffect(() => {
    if (currentGroup && currentGroup.sheets.length > 0) {
      handleTabChange(0);
    }
  }, [currentGroup]);

  // Function to handle crediting soldier
  const handleCreditSoldier = async (selectedRow: any) => {
    try {
      const headersStartingFromG = columnDefs
        .slice(6) // Column G is at index 6 (A=0, B=1, etc.)
        .map(column => column.field || column.headerName);
      await creditSoldier(
        accessToken,
        sheetGroups,
        selectedRow,
        headersStartingFromG
      );
      
      // Show success message
      alert(`חייל זוכה בהצלחה! נוסף`);
      
      // Refresh current sheet data
      refetch();
      
    } catch (error) {
      console.error('Error crediting soldier:', error);
    }
  };

  // Create the credit button component conditionally
  const creditButton = selectedRow && groupIndex === 0 ? (
    <button
      className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
      onClick={() => {
          handleCreditSoldier(selectedRow);
      }}
    >
      זיכוי חייל
    </button>
  ) : null;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{currentGroup.name}</h2>
      
      {/* Tabs Navigation with credit button */}
      <TabsNavigation 
        sheets={currentGroup.sheets} 
        activeTabIndex={activeTabIndex} 
        onTabChange={handleTabChange} 
        creditButton={creditButton}
      />

      {/* Content Area */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700">טוען מידע...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error instanceof Error ? error.message : 'Failed to fetch sheet data'}</p>
        </div>
      ) : sheetData.length > 0 ? (
        <SheetDataGrid
          accessToken={accessToken}
          currentGroup={currentGroup.sheets}
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