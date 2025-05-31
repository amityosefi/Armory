import React, {useRef, useState} from 'react';
import {AgGridReact} from 'ag-grid-react';
import GoogleSheetsService from "../services/GoogleSheetsService";
import {DEFAULT_SPREADSHEET_ID} from '../constants';
import ConfirmDialog from "./feedbackFromBackendOrUser/DialogCheckForRemoval.tsx";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps.tsx";
import type {GridReadyEvent, GridApi} from 'ag-grid-community';
import ComboBoxEditor from './ComboBoxEditor';


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


    const [dropdownOptions, setDropdownOptions] = useState<{ rowIndex: number, colIndex: number, value: string }[]>([]);
    const [showComboBox, setShowComboBox] = useState(false);
    const [searchText, setSearchText] = useState('');

    const [filteredOptions, setFilteredOptions] = useState<typeof dropdownOptions>([]);

    const [highlightedIndex, setHighlightedIndex] = useState(0);


    const columnDefs = incomingColumnDefs.map(col => {
        const hoverExcludedFields = ['מספר_סידורי', 'סוג_נשק', 'מסד'];
        const shouldEnableHover = !hoverExcludedFields.includes(col.field);

        // Add condition for your dropdown editable field, e.g. 'מספר_סידורי'
        const isDropdownField = col.field === 'מספר_סידורי';

        return {
            ...col,
            editable: ['הערות', 'שם_מלא'].includes(col.field) || isDropdownField,
            cellEditor: isDropdownField ? 'comboBoxEditor' : ['הערות', 'שם_מלא'].includes(col.field) ? 'agTextCellEditor' : undefined,
            cellEditorParams: isDropdownField
                ? {values: dropdownOptions}
                : ['הערות', 'שם_מלא'].includes(col.field)
                    ? {maxLength: 200}
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
        setClickedCellInfo({
            rowIndex: event.rowIndex,
            colName: event.colDef.field,
            value: value,
            oldValue: event.oldValue,
            row: data,
            colIndex: event.column
        });
        if ((value !== undefined && value !== null && value !== '') && !headersNames.includes(col.toString())) {
            setShowConfirmDialog(true);
        } else {
            const reactQueryGet = await GoogleSheetsService.fetchSheetData(accessToken, "מלאי אופטיקה");
            const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(reactQueryGet.values, event.colDef.field);
            const uniqueOptionsMap = new Map<string, { rowIndex: number, colIndex: number, value: string }>();
            valuesForAssign.forEach(item => {
                if (!uniqueOptionsMap.has(item.value)) {
                    uniqueOptionsMap.set(item.value, item);
                }
            });
            const uniqueOptions = Array.from(uniqueOptionsMap.values());
            setDropdownOptions(uniqueOptions);
            setFilteredOptions(uniqueOptions);
            setShowComboBox(true);
            setHighlightedIndex(0); // reset highlighted index
            setSearchText('');
        }
    }

    async function handleConfirmOpticCredit() {
        if (clickedCellInfo) {
            const msg = clickedCellInfo.row["שם_מלא"] + " זיכה " + clickedCellInfo.colName + " " + clickedCellInfo.value;
            const reactQueryGet = await GoogleSheetsService.fetchSheetData(accessToken, "מלאי אופטיקה");
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
            setShowMessage(true);
            setShowConfirmDialog(false);
            setIsSuccess(response);
            setMessage(response ? msg : ` בעיה בזיכוי ${clickedCellInfo.colName}`);
            handleOldValue(clickedCellInfo.rowIndex, clickedCellInfo.colName, "");
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
        }
    }

    async function handleSelectOption(option: { rowIndex: number, colIndex: number, value: string }) {
        setShowComboBox(false);
        if (!clickedCellInfo) {
            console.error("clickedCellInfo is null");
            return;
        }
        const msg = `האמרל ${clickedCellInfo.colName} ${option.value} הוחתם בהצלחה לחייל ${clickedCellInfo.row["שם_מלא"]} `;
        const response = await GoogleSheetsService.updateCalls({
            accessToken: accessToken,
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            updates: [
                {
                    sheetId: 813181890,
                    rowIndex: option.rowIndex,
                    colIndex: option.colIndex,
                    value: ""
                },
                {
                    sheetId: currentGroup[groupIndex].id,
                    rowIndex: clickedCellInfo.rowIndex + 1,
                    colIndex: columnDefs.findIndex(c => c.headerName === clickedCellInfo.colName),
                    value: option.value
                }],
            appendSheetId: 553027487,
            appendValues: [[msg, new Date().toString()]]
        });
        setShowMessage(true);
        setIsSuccess(response);
        setMessage(response ? msg : ` בעיה בהחתמת האמרל ${clickedCellInfo.colName}`);
        if (response) {
            handleOldValue(clickedCellInfo.rowIndex, clickedCellInfo.colName, option.value);
        }
    }

    async function changeNameOrComment(event: any) {
        if (isRevertingNameOrComment.current) {
            // Skip if we're inside a manual revert
            isRevertingNameOrComment.current = false;
            return;
        }
        if (event.colIndex === 4 || event.colIndex === 5) {

            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                spreadsheetId: DEFAULT_SPREADSHEET_ID,
                updates: [{
                    sheetId: currentGroup[groupIndex].id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: event.colDef.field === "שם_מלא" ? 4 : 5,
                    value: event.newValue ?? ""
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

    }

    // @ts-ignore
    return (
        <>
            {showComboBox && (
                <div
                    className="absolute z-50 bg-white shadow-xl rounded-lg w-72 border border-gray-300 animate-fadeIn backdrop-blur-md"
                    style={{top: 100, left: 100}} // Optional: make dynamic later
                    role="listbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                            handleSelectOption(filteredOptions[highlightedIndex]);
                        } else if (e.key === 'Escape') {
                            setShowComboBox(false);
                        }
                    }}
                >
                    <div className="p-2 border-b border-gray-200">
                        <input
                            type="text"
                            placeholder="🔍 חיפוש..."
                            className="w-full p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setHighlightedIndex(0);
                            }}
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto">
                        {filteredOptions.map((option, idx) => (
                            <li
                                key={`${option.value}-${option.rowIndex}-${option.colIndex}`}
                                className={`p-2 px-4 cursor-pointer transition-colors ${
                                    idx === highlightedIndex
                                        ? 'bg-blue-600 text-white'
                                        : 'hover:bg-gray-100'
                                }`}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                onClick={() => {
                                    handleSelectOption(option);
                                }}
                            >
                                {option.value}
                            </li>
                        ))}
                    </ul>
                </div>
            )}


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
                    components={{
                        comboBoxEditor: ComboBoxEditor,
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
                            rowData['rowIndex'] = event.rowIndex; // Add index to rowData
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
            </div>
        </>
    );
};

export default SheetDataGrid;
