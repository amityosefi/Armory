import React, {useRef, useState} from 'react';
import {AgGridReact} from 'ag-grid-react';
import GoogleSheetsService from "../services/GoogleSheetsService";
import {DEFAULT_SPREADSHEET_ID} from '../constants';
import ConfirmDialog from "./feedbackFromBackendOrUser/DialogCheckForRemoval.tsx";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps.tsx";
import type { GridReadyEvent, GridApi } from 'ag-grid-community';


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
        const hoverExcludedFields = ['מספר_סידורי', 'סוג_נשק', 'מסד'];
        const shouldEnableHover = !hoverExcludedFields.includes(col.field);

        return {
            ...col,
            editable: ['הערות', 'שם_מלא'].includes(col.field),
            cellEditor: ['הערות', 'שם_מלא'].includes(col.field) ? 'agTextCellEditor' : undefined,
            cellEditorParams: ['הערות', 'שם_מלא'].includes(col.field)
                ? { maxLength: 200 }
                : undefined,
            cellClass: shouldEnableHover ? 'hover-enabled' : undefined,
        };
    });

    const gridApiRef = useRef<GridApi | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [clickedCellInfo, setClickedCellInfo] = useState<{
        rowIndex: number;
        colName: string;
        value: any;
        oldValue: any;
        row: any;
        colIndex: number;
    } | null>(null);


    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const gridRef = useRef<AgGridReact>(null);
    const isRevertingNameOrComment = useRef(false);
    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');

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

    function handleOldValue(rowIndex: number, colIName: string, value: any) {
        const api = gridApiRef.current;
        if (!api) return;
        const rowNode = api.getDisplayedRowAtIndex(rowIndex);
        rowNode?.setDataValue(colIName, value);
    }


    async function onClickedOptic(event: any) {

        const col = event.colDef.field;
        const value = event.value;
        const data = event.data; // Get the entire row data
        const headersNames = ['מספר_סידורי', 'סוג_נשק', 'מסד', 'שם_מלא', 'הערות']
        if ((value !== undefined && value !== null && value !== '') && !headersNames.includes(col.toString())) {
            setClickedCellInfo({
                rowIndex: event.rowIndex,
                colName: event.colDef.field,
                value: value,
                oldValue: event.oldValue,
                row: data,
                colIndex: event.column
            });
            setShowConfirmDialog(true);
        }
        else{
            const reactQueryGet = await GoogleSheetsService.fetchSheetData(accessToken, DEFAULT_SPREADSHEET_ID, "מלאי אופטיקה");
            const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(reactQueryGet.values, event.colDef.field);
            const dropdownOptions = [...new Set(valuesForAssign.map(item => item.value))];
            console.log(dropdownOptions);
        }
    }

    async function handleConfirmOpticCredit() {
        if (clickedCellInfo) {
            const msg = clickedCellInfo.row["שם_מלא"] + " זיכה " + clickedCellInfo.colName + " " + clickedCellInfo.value;
            const reactQueryGet = await GoogleSheetsService.fetchSheetData(accessToken, DEFAULT_SPREADSHEET_ID, "מלאי אופטיקה");
            const rowCol = GoogleSheetsService.findInsertIndex(reactQueryGet.values, clickedCellInfo.colName);

            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                spreadsheetId: DEFAULT_SPREADSHEET_ID,
                updates: [
                    {
                        sheetId: 813181890,
                        rowIndex: rowCol.row,
                        colIndex: rowCol.col,
                        value: clickedCellInfo.value
                    },
                    {
                        sheetId: currentGroup[groupIndex].id,
                    rowIndex: clickedCellInfo.rowIndex + 1,
                    colIndex: columnDefs.findIndex(c => c.headerName === clickedCellInfo.colName),
                    value: ""
                }],
                appendSheetId: 553027487,
                appendValues: [[msg, new Date().toString()]]
            });
            setShowConfirmDialog(false);
            setIsSuccess(response);
            setMessage(response ? msg : ` בעיה בזיכוי ${clickedCellInfo.colName}`);
            handleOldValue(clickedCellInfo.rowIndex, clickedCellInfo.colName, "")
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
        }
    }

    async function changeNameOrComment(event: any) {
        if (isRevertingNameOrComment.current) {
            // Skip if we're inside a manual revert
            isRevertingNameOrComment.current = false;
            return;
        }
        const response = await GoogleSheetsService.updateCalls({
            accessToken: accessToken,
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            updates: [{
                sheetId: currentGroup[groupIndex].id,
                rowIndex: event.rowIndex + 1,
                colIndex: event.colDef.field === "שם_מלא" ? 4 : 5,
                value: event.newValue  ?? ""
            }],
            appendSheetId: 553027487,
            appendValues: [["חייל " + event.data["שם_מלא"] + " שינה " + event.colDef.field, new Date().toString()]]
        });


        setShowMessage(true);
        setIsSuccess(response);
        setMessage(response ? `${event.colDef.field} עודכן בהצלחה ` : ` בעיה בעדכון ${event.colDef.field}`);
        if (!response) {
            isRevertingNameOrComment.current = true;
            event.node.setDataValue(event.column.getId(), event.oldValue);
        }

    }

    return (
        <>
            {showMessage && (
                <div>
                    <StatusMessageProps
                        isSuccess={isSuccess}
                        message={message}
                        onClose={() => setMessage('')}
                    />
                </div>
            )}
            <div className="ag-theme-alpine w-full h-[70vh] ag-rtl">
                <AgGridReact
                    className="ag-theme-alpine"
                    ref={gridRef}
                    onGridReady={(params: GridReadyEvent) => {
                        gridApiRef.current = params.api;
                    }}
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
                        onClickedOptic(event);
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
                />

                {showConfirmDialog && clickedCellInfo && (
                    <div>
                        <ConfirmDialog
                            show={showConfirmDialog}
                            clickedCellInfo={clickedCellInfo}
                            onConfirm={() => handleConfirmOpticCredit()}
                            onCancel={() => setShowConfirmDialog(false)}
                        />
                    </div>
                )}

                {selectedRow && (
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
