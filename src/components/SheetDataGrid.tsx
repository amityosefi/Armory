import React, { useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';

interface SheetDataGridProps {
  columnDefs: any[];
  rowData: any[];
  groupIndex: number;
  onRowSelected?: (row: any) => void;
  onCreditSoldier?: (weaponType: string, serial: string, selectedRow: any) => void; // Updated prop type
}

const SheetDataGrid: React.FC<SheetDataGridProps> = ({ 
  columnDefs, 
  rowData, 
  groupIndex,
  onRowSelected,
  onCreditSoldier
}) => {
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const gridRef = useRef<any>(null);

  // Function to handle crediting soldier
  const handleCreditSoldier = () => {
    if (selectedRow) {
      const weaponType = selectedRow['סוג_נשק']; // Get weapon type from selected row
      const serial = selectedRow['מסד']; // Get serial number from selected row
      
      console.log('Crediting soldier with weapon:', weaponType, 'serial:', serial);
      
      if (onCreditSoldier && weaponType && serial) {
        onCreditSoldier(weaponType, serial, selectedRow);
      }
    }
  };

  return (
    <>
      <div className="ag-theme-alpine w-full h-[70vh] ag-rtl">
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          rowData={rowData}
          domLayout="normal"
          enableRtl={true}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            resizable: true
          }}
          rowSelection="single"
          onRowSelected={(event) => {
            // We're only interested in selected rows
            if (event.node && event.node.isSelected()) {
              const rowData = event.data;
              setSelectedRow(rowData);
              if (onRowSelected) {
                onRowSelected(rowData);
              }
              console.log('Selected row:', rowData);
            } else {
              // When a checkbox is unchecked, check if any other row is selected
              // before clearing the selectedRow state
              if (gridRef.current) {
                const selectedNodes = gridRef.current.api.getSelectedNodes();
                if (selectedNodes.length === 0) {
                  setSelectedRow(null);
                  if (onRowSelected) {
                    onRowSelected(null);
                  }
                }
              }
            }
          }}
          onGridReady={(params) => {
            // Store grid API reference when grid is ready
            gridRef.current = params;
          }}
        />
        
        {selectedRow && groupIndex === 0 && (
          <div className="mt-4 flex justify-center">
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              onClick={handleCreditSoldier}
            >
              זיכוי חייל
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SheetDataGrid;
