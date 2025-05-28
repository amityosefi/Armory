import React, {useRef, useState} from 'react';
import {AgGridReact} from 'ag-grid-react';
import GoogleSheetsService from "../services/GoogleSheetsService";
import {DEFAULT_SPREADSHEET_ID} from '../constants';
import ConfirmDialog from "./feedbackFromBackendOrUser/DialogCheckForRemoval.tsx";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps.tsx";


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

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [clickedCellInfo, setClickedCellInfo] = useState<{
        rowIndex: number;
        colName: string;
        value: any;
        row: any
    } | null>(null);

    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const gridRef = useRef<any>(null);
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

    function onClickedItemToRemove(event: any) {

        const col = event.colDef.field;
        const value = event.value;
        const data = event.data; // Get the entire row data
        const headersNames = ['מספר_סידורי', 'סוג_נשק', 'מסד', 'שם_מלא', 'הערות']
        if ((value !== undefined && value !== null && value !== '') && !headersNames.includes(col.toString())) {
            setClickedCellInfo({
                rowIndex: event.rowIndex,
                colName: event.colDef.field,
                value: value,
                row: data
            });
            setShowConfirmDialog(true);
        }
    }

    async function handleConfirm() {
        if (clickedCellInfo) {
            const colIndex = columnDefs.findIndex(c => c.headerName === clickedCellInfo.colName);
            const msg = clickedCellInfo.row["שם_מלא"] + " זיכה " + clickedCellInfo.colName + " " + clickedCellInfo.value;
            console.log( colIndex, msg);
            // const response = await GoogleSheetsService.updateCalls({
            //     accessToken: accessToken,
            //     spreadsheetId: DEFAULT_SPREADSHEET_ID,
            //     updateSheet: currentGroup[groupIndex].range,
            //     updateRowIndex: clickedCellInfo.rowIndex + 1, // Use clickedCellInfo.rowIndex or default to 0
            //     updateColIndex: colIndex,
            //     updateValue: '',
            //     appendSheet: 553027487,
            //     // appendSheet: "תיעוד",
            //     appendValues: [[msg, new Date().toString()]]
            // });
            // setShowConfirmDialog(false);
            // setIsSuccess(response);
            // setMessage(response ? msg : ` בעיה בזיכוי ${clickedCellInfo.colName}`);
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
                sheetName: currentGroup[groupIndex].id,
                rowIndex: event.rowIndex,
                colIndex: event.colDef.field === "שם_מלא" ? 4 : 5,
                value: event.newValue  ?? ""
            }],
            appendSheet: 553027487,
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
            </div>
        </>
    );
};

export default SheetDataGrid;
