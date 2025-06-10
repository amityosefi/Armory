import React, {  useRef, useState, useEffect } from 'react';
import {AgGridReact} from 'ag-grid-react';
import GoogleSheetsService from "../services/GoogleSheetsService";
import ConfirmDialog from "./feedbackFromBackendOrUser/DialogCheckForRemoval.tsx";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps.tsx";
import type {GridReadyEvent, GridApi} from 'ag-grid-community';
import ComboBoxEditor from './ComboBoxEditor';
import {useGoogleSheetData} from "./hooks/useGoogleSheetData.tsx";


interface SheetDataGridProps {
    accessToken: string;
    columnDefs: any[];
    rowData: any[];
    selectedSheet: {
    name: string
    range: string
    id: number
};
    onRowSelected?: (row: any) => void;
}

const SheetDataGrid: React.FC<SheetDataGridProps> = ({
                                                         accessToken,
                                                         columnDefs: incomingColumnDefs,
                                                         rowData,
                                                         selectedSheet: selectedSheet,
                                                         onRowSelected
                                                     }) => {

    const {
        data: sheetQueryData,
        refetch
    } = useGoogleSheetData(
        {
            accessToken,
            range: selectedSheet.range
        },
        {
            // Don't process data here, we'll do it with custom logic below
            processData: false,
            enabled: !!accessToken
        }
    );
    const {
        data: opticsData,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "מלאי אופטיקה"
        },
        {
            // Don't process data here, we'll do it with custom logic below
            processData: false,
            enabled: !!accessToken
        }
    );

    const {
        data: weaponData,
    } = useGoogleSheetData(
        {
            accessToken,
            range: "מלאי נשקיה"
        },
        {
            // Don't process data here, we'll do it with custom logic below
            processData: false,
            enabled: !!accessToken
        }
    );


    const [dropdownOptions, setDropdownOptions] = useState<{ rowIndex: number, colIndex: number, value: string }[]>([]);
    const [showComboBox, setShowComboBox] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<typeof dropdownOptions>([]);

    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const comboBoxRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                comboBoxRef.current &&
                !comboBoxRef.current.contains(event.target as Node)
            ) {
                setShowComboBox(false);
            }
        }

        if (showComboBox) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showComboBox]);

    const columnDefs = incomingColumnDefs.map(col => {
        const hoverExcludedFields = ['סוג_נשק', 'שם_מלא', 'הערות'];
        const shouldEnableHover = !hoverExcludedFields.includes(col.field);

        // Add condition for your dropdown editable field, e.g. 'מספר_סידורי'

        return {
            ...col,
            editable: ['הערות', 'שם_מלא'].includes(col.field),
            pinned: col.field === 'שם_מלא' && !(window.innerWidth <= 768) ? 'right' : undefined, // Only pin on non-mobile devices
            filterParams: {
                filterOptions: ['contains'],
                suppressAndOrCondition: true,
            },
            cellEditor: ['הערות', 'שם_מלא'].includes(col.field) ? 'agTextCellEditor' : undefined,
            cellEditorParams: ['הערות', 'שם_מלא'].includes(col.field)
                    ? {maxLength: 100}
                    : undefined,
            cellClass: shouldEnableHover && isGroupSheet() ? 'hover-enabled' : undefined,
            hide: ['חתימה','זמן_חתימה','פלאפון','מספר_אישי'].includes(col.field)
        };
    });


    const gridApiRef = useRef<GridApi | null>(null);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [event, setEvent] = useState<{
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


    function isGroupSheet(){
        const groupName = selectedSheet.range;
        const groupNames = ['א', 'ב', 'ג', 'מסייעת','מכלול','פלסם','אלון']; // List your פלוגות sheets here
        return groupNames.includes(groupName);
    }

    function handleOldValue(rowIndex: number, colIName: string, value: any) {
        const api = gridApiRef.current;
        if (!api) return;
        const rowNode = api.getDisplayedRowAtIndex(rowIndex);
        rowNode?.setDataValue(colIName, value);
    }


    // @ts-ignore
    async function handleEmptyCellClicked(event: any) : Promise<boolean> {
        let col = event.colDef.field;
        let uniqueOptions;
        if (event.colDef.field === 'כוונת') {
            const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(opticsData.values, "מפרולייט");
            const valuesForAssign2 = GoogleSheetsService.findValuesUnderHeader(opticsData.values, 'M5');
            console.log("valuesForAssign", valuesForAssign);
            console.log("valuesForAssign2", valuesForAssign2);
            const uniqueOptionsMap = new Map<string, { rowIndex: number, colIndex: number, value: string }>();
            valuesForAssign.forEach(item => {
                if (!uniqueOptionsMap.has('מפרולייט ' + item.value)) {
                    uniqueOptionsMap.set('מפרולייט ' + item.value, {...item, value: 'מפרולייט ' + item.value});
                }
            });
            valuesForAssign2.forEach(item => {
                if (!uniqueOptionsMap.has('M5 ' + item.value)) {
                    uniqueOptionsMap.set('M5 ' + item.value, {...item, value: 'M5 ' + item.value});
                }
            });
            uniqueOptions = Array.from(uniqueOptionsMap.values());
            // feel here the missing input
        } else {
            // @ts-ignore
            const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(opticsData.values, col);
            const uniqueOptionsMap = new Map<string, { rowIndex: number, colIndex: number, value: string }>();
            valuesForAssign.forEach(item => {
                if (!uniqueOptionsMap.has(item.value)) {
                    uniqueOptionsMap.set(item.value, item);
                }
            });
            uniqueOptions = Array.from(uniqueOptionsMap.values());
        }
            setDropdownOptions(uniqueOptions);
            setFilteredOptions(uniqueOptions);
            setShowComboBox(true);
            setHighlightedIndex(0); // reset highlighted index
            setSearchText('');

    }

    // @ts-ignore
    async function onClickedOptic(event: any) : Promise<boolean> {

        // let col = event.colDef.field;
        // let value = event.value;
        // if (col === 'כוונת' && value) {
        //     col = value;
        //     value = "1";
        // }
        if (!isGroupSheet() || ['סוג_נשק', 'שם_מלא', 'הערות'].includes(event.colDef.field))
            { // @ts-ignore
                return;
            }
        setEvent({
            rowIndex: event.rowIndex,
            colName: event.colDef.field,
            value: event.value,
            oldValue: event.oldValue,
            row: event.data,
            colIndex: event.column
        });
        if (event.value !== undefined && event.value !== null && event.value !== '') {
            // @ts-ignore
            if (event.colDef.field === 'כוונת') {
                // @ts-ignore
                setEvent((prev) => ({...prev, value: "1", colName: prev?.row['כוונת']}));
            }
            else if (event.colDef.field === 'מסד') {
                // @ts-ignore
                setEvent((prev) => ({...prev, colName: prev?.row['סוג_נשק']}));
            }
            setShowConfirmDialog(true);
        }
        else
            await handleEmptyCellClicked(event);

    }

    async function handleConfirmOpticCredit() {
        if (event) {
            const userEmail = localStorage.getItem('userEmail');
            const msg = event.row["שם_מלא"] + " זיכה " + event.colName + " " + event.value;
            const columnFields = columnDefs.map(col => col.field);
                let rowCol;
                let colIndex;
                let sheetid;
                let anotherUpdate;
            if (columnFields.includes(event.colName) || event.colName === "M5" || event.colName === "מאפרולייט") {
                rowCol = GoogleSheetsService.findInsertIndex(opticsData.values, event.colName);
                colIndex = event.colName === "M5" || event.colName === "מאפרולייט" ? 'כוונת' : event.colName;
                sheetid = 813181890;
                handleOldValue(event.rowIndex, colIndex, "");
            } else {
                rowCol = GoogleSheetsService.findInsertIndex(weaponData.values, event.colName);
                colIndex = 'מסד';
                sheetid = 439908422;
                anotherUpdate = {
                    sheetId: selectedSheet.id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: columnDefs.findIndex(col => col.field === 'סוג_נשק'),
                    value: ""
                }
                handleOldValue(event.rowIndex, 'מסד', "");
                handleOldValue(event.rowIndex, 'סוג_נשק', "");
            }
            const update = [
                {
                    sheetId: sheetid,
                    rowIndex: rowCol.row,
                    colIndex: rowCol.col,
                    value: event.value
                },
                {
                    sheetId: selectedSheet.id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: columnDefs.findIndex(col => col.field === colIndex),
                    value: ""
                }];
            if (anotherUpdate)
                update.push(anotherUpdate);

            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: update,
                appendSheetId: 553027487,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });
            setShowMessage(true);
            setShowConfirmDialog(false);
            setIsSuccess(response);
            setMessage(response ? msg : ` בעיה בזיכוי ${event.colName}`);
            refetch()
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
        }
    }

    async function handleSelectOption(option: { rowIndex: number, colIndex: number, value: string }) {
        setShowComboBox(false);
        const userEmail = localStorage.getItem('userEmail');
        if (!event) {
            console.error("event is null");
            return;
        }
        const msg = `האמרל ${event.colName} ${option.value} הוחתם בהצלחה לחייל ${event.row["שם_מלא"]} `;
        const response = await GoogleSheetsService.updateCalls({
            accessToken: accessToken,
            updates: [
                {
                    sheetId: 813181890,
                    rowIndex: option.rowIndex,
                    colIndex: option.colIndex,
                    value: ""
                },
                {
                    sheetId: selectedSheet.id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: columnDefs.findIndex(c => c.field === event.colName),
                    value: option.value
                }],
            appendSheetId: 553027487,
            appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
        });
        setShowMessage(true);
        setIsSuccess(response);
        setMessage(response ? msg : ` בעיה בהחתמת האמרל ${event.colName}`);
        refetch()
        if (response) {
            handleOldValue(event.rowIndex, event.colName, option.value);
        }
    }

    async function changeNameOrComment(event: any) {
        if (isRevertingNameOrComment.current) {
            // Skip if we're inside a manual revert
            isRevertingNameOrComment.current = false;
            return;
        }
        if (event.colDef.field === 'הערות' || event.colDef.field === 'שם_מלא') {
            const userEmail = localStorage.getItem('userEmail');
            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: [{
                    sheetId: selectedSheet.id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: columnDefs.findIndex(c => c.field === event.colDef.field),
                    value: event.newValue ?? ""
                }],
                appendSheetId: 553027487,
                appendValues: [["חייל " + event.data["שם_מלא"] + " שינה " + event.colDef.field + ': ' + event.newValue, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });


            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? `${event.colDef.field} עודכן בהצלחה ` : ` בעיה בעדכון ${event.colDef.field}`);
            if (!response) {
                isRevertingNameOrComment.current = true;
                event.node.setDataValue(event.column.getId(), event.oldValue);
            }
            refetch();
        }

    }

    // @ts-ignore
    return (
        <>
            {showComboBox && (
                <div
                    ref={comboBoxRef}
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
                        minWidth: 150,
                        resizable: true
                    }}
                    rowSelection="single"
                    isRowSelectable={() => isGroupSheet()}
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

                {showConfirmDialog && event && (
                    <div>
                        <ConfirmDialog
                            clickedCellInfo={event}
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
