import React, {useRef, useState} from 'react';
import {AgGridReact} from 'ag-grid-react';
import GoogleSheetsService from "../services/GoogleSheetsService";
import {DEFAULT_SPREADSHEET_ID} from '../constants'
import ConfirmDialog from "../components/DialogCheckForRemoval";


interface SheetDataGridProps {
    accessToken: string;
    currentGroup: any[];
    columnDefs: any[];
    rowData: any[];
    groupIndex: number;
    onRowSelected?: (row: any) => void;
    onCreditSoldier?: (weaponType: string, serial: string, selectedRow: any) => void; // Updated prop type
}

const SheetDataGrid: React.FC<SheetDataGridProps> = ({
                                                         accessToken,
                                                         currentGroup,
                                                         columnDefs: incomingColumnDefs,
                                                         rowData,
                                                         groupIndex,
                                                         onRowSelected,
                                                         onCreditSoldier
                                                     }) => {
    const columnDefs = incomingColumnDefs.map(col => {
        if (col.field === 'הערות' || col.field === "שם_מלא") {
            return {
                ...col,
                editable: true,
                cellEditor: 'agTextCellEditor',
                cellEditorParams: {
                    maxLength: 200
                }
            };
        }
        return col;
    });
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [clickedCellInfo, setClickedCellInfo] = useState<{
        rowIndex: number;
        colId: string;
        value: any;
        row: any
    } | null>(null);

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

    function onClickedItemToRemove(event: any) {

        const col = event.colDef.field;
        const value = event.value;
        const data = event.data; // Get the entire row data
        const headersNames = ['מספר_סידורי', 'סוג_נשק', 'מסד', 'שם_מלא', 'הערות']
        if ((value !== undefined && value !== null && value !== '') && !headersNames.includes(col.toString())) {
            setClickedCellInfo({
                rowIndex: event.rowIndex,
                colId: event.colDef.field,
                value: value,
                row: data
            });
            setShowConfirmDialog(true);
        }
    }

    async function handleConfirm() {
        console.log("hey:", clickedCellInfo);
        setShowConfirmDialog(true);
    }

    async function changeNameOrComment(event: any) {
        await GoogleSheetsService.updateGoogleSheetCell({
            accessToken: accessToken, // Should come from a secure OAuth flow
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: currentGroup[groupIndex].range,
            rowIndex: event.rowIndex ? event.rowIndex + 1 : 0, // Use event.rowIndex or default to 0
            colIndex: event.colDef.field === "שם_מלא" ? 4 : 5, // Convert column letter to index
            value: event.newValue
        });
    }

    return (
        <>
            <div className="ag-theme-alpine w-full h-[70vh] ag-rtl">
                <AgGridReact
                    className="ag-theme-alpine"
                    ref={gridRef}
                    columnDefs={columnDefs}
                    rowData={rowData}
                    stopEditingWhenCellsLoseFocus={true}
                    domLayout="normal"
                    enableRtl={true}
                    defaultColDef={{
                        flex: 1,
                        minWidth: 100,
                        resizable: true
                    }}
                    rowSelection="single"
                    suppressRowClickSelection={true}
                    onCellClicked={(event) => {
                        onClickedItemToRemove(event);
                    }}
                    onCellValueChanged={async (event) => {
                        await changeNameOrComment(event);
                    }}
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
                {showConfirmDialog && clickedCellInfo && (
                    <div>
                        <ConfirmDialog
                            show={showConfirmDialog}
                            clickedCellInfo={clickedCellInfo}
                            onConfirm={() => handleConfirm()}
                            onCancel={() => setShowConfirmDialog(false)}
                        />
                    </div>
                )}

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
