import React, {useEffect, useRef, useState} from 'react';
import {AgGridReact} from 'ag-grid-react';
import GoogleSheetsService from "../services/GoogleSheetsService";
import ConfirmDialog from "./feedbackFromBackendOrUser/DialogCheckForRemoval";
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps";
import type {GridApi, GridReadyEvent} from 'ag-grid-community';
import ComboBoxEditor from './ComboBoxEditor';
import {useGoogleSheetData} from "./hooks/useGoogleSheetData";
import {useParams, useNavigate} from 'react-router-dom';
import type { RowStyle } from 'ag-grid-community';
import { RowIndexWithCheckbox } from './RowIndexWithCheckbox';




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
    refetch: () => void;
}

const SheetDataGrid: React.FC<SheetDataGridProps> = ({
                                                         accessToken,
                                                         columnDefs: incomingColumnDefs,
                                                         rowData,
                                                         selectedSheet: selectedSheet,
                                                         onRowSelected,
                                                         refetch
                                                     }) => {

    // @ts-ignore
    const {
        data: opticsData, refetch: refetchOpticsData
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
        data: weaponData, refetch: refetchWeaponData
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
    const {
        data: sandaData, refetch: refetchSandaData
    } = useGoogleSheetData(
        {
            accessToken,
            range: "תקול לסדנא"
        },
        {
            // Don't process data here, we'll do it with custom logic below
            processData: false,
            enabled: !!accessToken
        }
    );

    const [dropdownOptions, setDropdownOptions] = useState<{ rowIndex: number, colIndex: number, value: string }[]>([]);
    const [dropdownOptionsWeapon, setDropdownOptionsWeapon] = useState<{ value: string }[]>([]);

    const [filteredOptions, setFilteredOptions] = useState<typeof dropdownOptions>([]);
    const [filteredOptionsWeapon, setFilteredOptionsWeapon] = useState<typeof dropdownOptionsWeapon>([]);

    const [showComboBoxWeapon, setShowComboBoxWeapon] = useState(false);
    const [showComboBox, setShowComboBox] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [searchTextWeapon, setSearchTextWeapon] = useState('');

    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [highlightedIndexWeapon, setHighlightedIndexWeapon] = useState(0);

    const [selectedWeapon, setSelectedWeapon] = useState('');

    const {rowIndex} = useParams();
    const navigate = useNavigate();

    const comboBoxRef = useRef<HTMLDivElement>(null);

    const savedFilterRef = useRef<any>(null);
    useEffect(() => {
        if (gridApiRef.current && savedFilterRef.current) {
            gridApiRef.current.setFilterModel(savedFilterRef.current);
            savedFilterRef.current = null; // reset to avoid reapplying
        }
    }, [rowData]);

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

    function isStockSheet() {
        return ['מלאי אופטיקה', 'תקול לסדנא', 'מלאי נשקיה'].includes(selectedSheet.range);
    }

    const columnDefs = [
        // 🧠 First, map all columns except 'שם_מלא'
        ...incomingColumnDefs
            .filter(col => col.field !== 'שם_מלא')
            .map(col => {
                const hoverExcludedFields = ['סוג_נשק', 'הערות'];
                const shouldEnableHover = !hoverExcludedFields.includes(col.field);

                const columnWidths: Record<string, number> = {
                    'הודעה': 500,
                    'זמן': 170,
                    'שם_משתמש': 200,
                };

                const width = columnWidths[col.field] ?? 150;

                return {
                    ...col,
                    editable: ['חתימה', 'הערות'].includes(col.field),
                    pinned: col.field === 'שם_אמצעי' ? 'right' : undefined,
                    filterParams: {
                        filterOptions: ['contains'],
                        suppressAndOrCondition: false,
                    },
                    cellEditor: ['הערות', 'חתימה'].includes(col.field) ? 'agTextCellEditor' : undefined,
                    cellEditorParams: ['חתימה', 'הערות'].includes(col.field)
                        ? { maxLength: 100 }
                        : undefined,
                    cellClass: shouldEnableHover && (isGroupSheet() || isStockSheet()) ? 'hover-enabled' : undefined,
                    hide:
                        (col.field === 'חתימה' && selectedSheet.name !== 'טבלת נשקיה') ||
                        ['זמן_חתימה', 'פלאפון', 'מספר_אישי'].includes(col.field),
                    width: width,
                };
            }),

        ...(isGroupSheet()
            ? [
                {
                    field: 'rowRealIndex',
                    headerName: 'מס',
                    pinned: 'right',
                    width: 60,
                    suppressMovable: true,
                    sortable: false,
                    filter: false,
                    editable: false,
                    valueGetter: (params: { node: { rowIndex: number } }) => params.node.rowIndex + 1,
                    cellRenderer: RowIndexWithCheckbox, // ✅ use your custom renderer
                },
                {
                    field: 'שם_מלא',
                    headerName: 'שם מלא',
                    pinned: 'right',
                    width: 150,
                    filter: true,
                    editable: true,
                    filterParams: {
                        filterOptions: ['contains'],
                        suppressAndOrCondition: false,
                    },
                    cellEditor: 'agTextCellEditor',
                    cellEditorParams: { maxLength: 100 },
                    cellClass: isGroupSheet() || isStockSheet() ? 'hover-enabled' : undefined,
                },
            ]
            : []),
    ];



    const gridApiRef = useRef<GridApi | null>(null);


    useEffect(() => {
        // Only try to scroll if gridApi is ready and rowData is loaded
        if (gridApiRef.current && rowData && rowData.length > 0) {
            if (rowIndex) {
                const rowIndexNumber = parseInt(rowIndex, 10);
                if (!isNaN(rowIndexNumber) && rowIndexNumber >= 0 && rowIndexNumber < rowData.length) {
                    gridApiRef.current.ensureIndexVisible(rowIndexNumber, 'middle');
                }
            }
        }
    }, [rowIndex, rowData, gridApiRef.current]);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [event, setEvent] = useState<{
        rowIndex: number;
        colName: string;
        value: any;
        oldValue: any;
        row: any;
        colIndex: number;
    } | null>(null);


    const gridRef = useRef<AgGridReact>(null);
    const isRevertingNameOrComment = useRef(false);
    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    function isGroupSheet() {
        const groupName = selectedSheet.range;
        const groupNames = ['א', 'ב', 'ג', 'מסייעת', 'מכלול', 'פלסם', 'אלון']; // List your פלוגות sheets here
        return groupNames.includes(groupName);
    }

    // @ts-ignore
    async function handleEmptyCellClicked(event: any): Promise<boolean> {
        if (isStockSheet()) {
            // @ts-ignore
            return;
        }
        let uniqueOptions;
        if (event.colName === 'כוונת') {
            const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(opticsData.values, 'מפרו');
            const valuesForAssign2 = GoogleSheetsService.findValuesUnderHeader(opticsData.values, 'M5');
            const valuesForAssign3 = GoogleSheetsService.findValuesUnderHeader(opticsData.values, 'מארס');
            const uniqueOptionsMap = new Map<string, { rowIndex: number, colIndex: number, value: string }>();
            valuesForAssign.forEach(item => {
                if (!uniqueOptionsMap.has('מפרו ' + item.value)) {
                    uniqueOptionsMap.set('מפרו ' + item.value, {...item, value: 'מפרו ' + item.value});
                }
            });
            valuesForAssign2.forEach(item => {
                if (!uniqueOptionsMap.has('M5 ' + item.value)) {
                    uniqueOptionsMap.set('M5 ' + item.value, {...item, value: 'M5 ' + item.value});
                }
            });
            valuesForAssign3.forEach(item => {
                if (!uniqueOptionsMap.has('מארס ' + item.value)) {
                    uniqueOptionsMap.set('מארס ' + item.value, {...item, value: 'מארס ' + item.value});
                }
            });
            uniqueOptions = Array.from(uniqueOptionsMap.values());
            // feel here the missing input
        } else if (event.colName === 'מסד') {
            const headers = weaponData.values[0];
            const headerOptions = headers.map((h: any) => ({value: h}));
            setDropdownOptionsWeapon(headerOptions)
            setFilteredOptionsWeapon(headerOptions);
            setShowComboBoxWeapon(true);
            setHighlightedIndexWeapon(0);
            setSearchTextWeapon('');
            // @ts-ignore
            return;

        } else {
            // @ts-ignore
            const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(opticsData.values, event.colName);
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
    async function onClickedOptic(event1: any): Promise<boolean> {
        // Redirect if first column is clicked
        if ( event1.colDef && event1.colDef.field === 'שם_מלא') {
            navigate(`/sheet/${selectedSheet.range}/soldier/${event1.data['rowRealIndex'] + 2}`);
            return false;
        }
        if (!isGroupSheet() && !isStockSheet() || ['סוג_נשק','rowRealIndex', 'שם_מלא', 'אמצעים', 'הערות'].includes(event1.colDef.field)) { // @ts-ignore
            return;
        }
        setEvent({
            rowIndex: event1.data.rowRealIndex,
            colName: event1.colDef.headerName,
            value: event1.value,
            oldValue: event1.oldValue,
            row: event1.data,
            colIndex: event1.column
        });

        if (event1.value !== undefined && event1.value !== null && event1.value !== '') {
            // @ts-ignore
            if (event1.colDef.field === 'כוונת') {
                // @ts-ignore
                setEvent((prev) => ({...prev, value: "1", colName: prev?.row['כוונת']}));
            } else if (event1.colDef.field === 'מסד') {
                // @ts-ignore
                setEvent((prev) => ({...prev, colName: prev?.row['סוג_נשק']}));
            }
            setShowConfirmDialog(true);
        } else
            await handleEmptyCellClicked(event);

    }

    async function handleConfirmOpticCredit() {
        setShowConfirmDialog(false);
        setIsLoading(true);

        if (gridApiRef.current) {
            savedFilterRef.current = gridApiRef.current.getFilterModel();
        }

        if (event) {

            const userEmail = localStorage.getItem('userEmail');
            const msg = event.row["שם_מלא"] + " זיכה " + event.colName + " " + event.value + " " + selectedSheet.name;
            const columnFields = columnDefs.map(col => col.headerName);
            let rowCol;
            let colIndex;
            let sheetid;
            let anotherUpdate;
            if (columnFields.includes(event.colName) || event.colName === "M5" || event.colName === "מפרו" || event.colName === "מארס") {
                rowCol = GoogleSheetsService.findInsertIndex(opticsData.values, event.colName);
                colIndex = event.colName === "M5" || event.colName === "מפרו" || event.colName === 'מארס' ? 'כוונת' : event.colName;
                sheetid = 1158402644;
            } else {
                rowCol = GoogleSheetsService.findInsertIndex(weaponData.values, event.colName);
                colIndex = 'מסד';
                sheetid = 262055601;
                anotherUpdate = {
                    sheetId: selectedSheet.id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: incomingColumnDefs.findIndex(col => col.field === 'סוג_נשק'),
                    value: ""
                }
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
                    colIndex: incomingColumnDefs.findIndex(col => col.headerName === colIndex),
                    value: ""
                }];
            if (anotherUpdate)
                update.push(anotherUpdate);

            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: update,
                appendSheetId: 1070971626,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });
            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? msg : ` בעיה בזיכוי ${event.colName}`);
            refetch();
            refetchOpticsData();
            refetchWeaponData();
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
            setIsLoading(false);
        }
    }

    async function handleSelectOption(option: { rowIndex: number, colIndex: number, value: string }) {
        setShowComboBox(false);
        setIsLoading(true);

        if (gridApiRef.current) {
            savedFilterRef.current = gridApiRef.current.getFilterModel();
        }

        const userEmail = localStorage.getItem('userEmail');
        if (!event) {
            console.error("event is null");
            return;
        }
        const updates = [];
        if (option.value === 'M5 1' || option.value === 'מפרו 1' || option.value === 'מארס 1') {
            option.value = option.value.split(' ')[0]; // Remove the "1" suffix

        }
        const firstUpdate = {
            sheetId: selectedSheet.id,
            rowIndex: event.rowIndex + 1,
            colIndex: incomingColumnDefs.findIndex(c => c.headerName === event.colName),
            value: option.value
        };
        updates.push(firstUpdate)

        let msg;
        let anotherUpdate;
        if (event.colName == 'מסד') {
            msg = `הנשק ${event.colName} ${option.value} הוחתם בהצלחה לחייל ${event.row["שם_מלא"]} ` + " " + selectedSheet.name;
            anotherUpdate = {
                sheetId: 262055601,
                rowIndex: option.rowIndex,
                colIndex: option.colIndex,
                value: ""
            };
            updates.push({
                sheetId: selectedSheet.id,
                rowIndex: event.rowIndex + 1,
                colIndex: incomingColumnDefs.findIndex(c => c.field === "סוג_נשק"),
                value: selectedWeapon
            })
            updates.push({
                sheetId: selectedSheet.id,
                rowIndex: event.rowIndex + 1,
                colIndex: incomingColumnDefs.findIndex(c => c.field === "זמן_חתימה"),
                value: new Date().toLocaleString('he-IL')
            })

        } else {
            msg = `האמרל ${event.colName} ${option.value} הוחתם בהצלחה לחייל ${event.row["שם_מלא"]} ` + " " + selectedSheet.name;
            anotherUpdate = {
                sheetId: 1158402644,
                rowIndex: option.rowIndex,
                colIndex: incomingColumnDefs.findIndex(c => c.field === "סוג_נשק"),
                value: ""
            };

        }
        updates.push(anotherUpdate);
        const response = await GoogleSheetsService.updateCalls({
            accessToken: accessToken,
            updates: updates,
            appendSheetId: 1070971626,
            appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
        });
        setShowMessage(true);
        setIsSuccess(response);
        setMessage(response ? msg : ` בעיה בהחתמת האמרל ${event.colName}`);
        refetch();
        refetchOpticsData();
        refetchWeaponData();
        setIsLoading(false);
    }

    async function handleSelectWeaponOption(option: { value: string }) {
        setSelectedWeapon(option.value)
        setShowComboBoxWeapon(false);
        const valuesForAssign = GoogleSheetsService.findValuesUnderHeader(weaponData.values, option.value);
        const uniqueOptionsMap = new Map<string, { rowIndex: number, colIndex: number, value: string }>();
        valuesForAssign.forEach(item => {
            if (!uniqueOptionsMap.has(item.value)) {
                uniqueOptionsMap.set(item.value, item);
            }
        });
        let uniqueOptions = Array.from(uniqueOptionsMap.values());
        setDropdownOptions(uniqueOptions);
        setFilteredOptions(uniqueOptions);
        setShowComboBox(true);
        setHighlightedIndex(0); // reset highlighted index
        setSearchText('');
    }

    async function changeNameOrComment(event: any) {
        if (isRevertingNameOrComment.current) {
            isRevertingNameOrComment.current = false;
            return;
        }
        let msg;
        if (selectedSheet.name === 'טבלת נשקיה')
            msg = 'חתימה מול החטיבה שונתה ל' + event.newValue;
        else
            msg = "חייל " + event.data["שם_מלא"] + " שינה " + event.colDef.field + ': ' + event.newValue;
        if (event.colDef.field === 'הערות') {
            const userEmail = localStorage.getItem('userEmail');
            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: [{
                    sheetId: selectedSheet.id,
                    rowIndex: event.data.rowRealIndex + 1,
                    colIndex: incomingColumnDefs.findIndex(c => c.field === event.colDef.field),
                    value: event.newValue ?? ""
                }],
                appendSheetId: 1070971626,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });


            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? msg : ` בעיה בעדכון ${event.colDef.field}`);
            refetch();
            if (!response) {
                isRevertingNameOrComment.current = true;
                event.node.setDataValue(event.column.getId(), event.oldValue);
            }
        }

    }

    async function handleConfirmOpticSadna() {
        setShowConfirmDialog(false);
        setIsLoading(true);
        if (event) {
            const userEmail = localStorage.getItem('userEmail');
            const msg = event.colName + " " + event.value + " הועבר לתקול לסדנא מ" + selectedSheet.name;

            const rowCol = GoogleSheetsService.findInsertIndex(sandaData.values, event.colName);
            const update = [
                {
                    sheetId: 1689612813,
                    rowIndex: rowCol.row,
                    colIndex: rowCol.col,
                    value: event.value
                },
                {
                    sheetId: selectedSheet.id,
                    rowIndex: event.rowIndex + 1,
                    colIndex: columnDefs.findIndex(col => col.headerName === event.colName),
                    value: ""
                }];

            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: update,
                appendSheetId: 1070971626,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });
            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? msg : `בעיה בהעברה לתקול לסדנא`);
            refetch();
            refetchOpticsData();
            refetchWeaponData();
            refetchSandaData();
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
            setIsLoading(false);
        }
    }

    async function handleConfirmOpticStock() {
        setShowConfirmDialog(false);
        setIsLoading(true);
        if (event) {
            const userEmail = localStorage.getItem('userEmail');
            let sheetTofireName = 'מלאי אופטיקה';
            let sheetTofireId = 1158402644;
            if (weaponData.values[0].includes(event.colName)) {
                sheetTofireName = 'מלאי נשקיה';
                sheetTofireId = 262055601;
            }
            const msg = event.colName + " " + event.value + " הועבר מתקול לסדנא ל" + sheetTofireName;

            const rowCol = GoogleSheetsService.findInsertIndex(opticsData.values, event.colName);
            const update = [
                {
                    sheetId: sheetTofireId,
                    rowIndex: rowCol.row,
                    colIndex: rowCol.col,
                    value: event.value
                },
                {
                    sheetId: 1689612813,
                    rowIndex: event.rowIndex + 1,
                    colIndex: incomingColumnDefs.findIndex(col => col.headerName === event.colName),
                    value: ""
                }];

            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: update,
                appendSheetId: 1070971626,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });
            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? msg : `בעיה בהעברה למלאי`);
            refetch();
            refetchOpticsData();
            refetchWeaponData();
            refetchSandaData();
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
            setIsLoading(false);
        }
    }

    async function handleConfirmOpticDelete() {
        setShowConfirmDialog(false);
        setIsLoading(true);
        if (event) {
            const userEmail = localStorage.getItem('userEmail');
            const msg = event.colName + " " + event.value + "זוכה מול החטיבה";
            const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: [
                    {
                        sheetId: selectedSheet.id,
                        rowIndex: event.row.rowRealIndex + 1,
                        colIndex: incomingColumnDefs.findIndex(c => c.headerName === event.colName),
                        value: ""
                    }
                ],
                appendSheetId: 1070971626,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });
            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? msg : `בעיה בהעברה למלאי`);
            refetch();
            refetchOpticsData();
            refetchWeaponData();
            refetchSandaData();
            if (!response) {
                isRevertingNameOrComment.current = true;
            }
            setIsLoading(false);
        }
    }

    // @ts-ignore
    return (
        <>
            {showComboBoxWeapon && (
                <div
                    ref={comboBoxRef}
                    className="absolute z-50 bg-white shadow-xl rounded-lg w-72 border border-gray-300 animate-fadeIn backdrop-blur-md"
                    style={{top: 100, left: 100}} // Optional: make dynamic later
                    role="listbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            setHighlightedIndexWeapon((prev) => Math.min(prev + 1, filteredOptions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                            setHighlightedIndexWeapon((prev) => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                            // @ts-ignore
                            handleSelectWeaponOption(filteredOptionsWeapon[highlightedIndexWeapon]);
                        } else if (e.key === 'Escape') {
                            setShowComboBoxWeapon(false);
                        }
                    }}
                >
                    <div className="p-2 border-b border-gray-200">
                        <input
                            type="text"
                            placeholder="🔍 חיפוש..."
                            className="w-full p-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                            value={searchTextWeapon}
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setHighlightedIndexWeapon(0);
                            }}
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto">
                        {filteredOptionsWeapon.map((option, idx) => (
                            <li
                                key={`${option.value}`}
                                className={`p-2 px-4 cursor-pointer transition-colors ${
                                    idx === highlightedIndex
                                        ? 'bg-blue-600 text-white'
                                        : 'hover:bg-gray-100'
                                }`}
                                onMouseEnter={() => setHighlightedIndexWeapon(idx)}
                                onClick={() => {
                                    // @ts-ignore
                                    handleSelectWeaponOption(option);
                                }}
                            >
                                {option.value}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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

            {isLoading ? (<div className="flex items-center gap-2 mt-2 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>טוען בקשה...</span>
            </div>) : (

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
                        getRowClass={(params) => {
                            // @ts-ignore
                            return params.node.rowIndex % 2 === 0 ? 'ag-row-even' : 'ag-row-odd';
                        }}
                        getRowStyle={(params): RowStyle | undefined => {
                            if (params.data?.הערות === 'מאופסן') {
                                return { backgroundColor: '#ffe5e5' }; // ✅ This now matches RowStyle
                            }
                            return undefined;
                        }}


                    columnDefs={columnDefs}
                    rowData={selectedSheet.range === 'תיעוד' ? [...rowData].reverse() : rowData}
                    rowHeight={24} // 👈 Shrink row height
                    headerHeight={28}
                    stopEditingWhenCellsLoseFocus={true}
                    domLayout="normal"
                    enableRtl={true}
                    defaultColDef={{
                    // flex: 1,
                    minWidth: 10,
                    sortable: true,
                    resizable: true,
                }}
                    rowSelection="single"
                    isRowSelectable={() => isGroupSheet()}
                    suppressRowClickSelection={true}
                    onCellClicked={(event1) => {
                    onClickedOptic(event1);
                }}
                    onCellValueChanged={async (event) => {
                    await changeNameOrComment(event);
                }}
                    onRowSelected={(event) => {
                    if (event.node && event.node.isSelected()) {
                        const rowData = event.data;
                        rowData['rowIndex'] = event.rowIndex; // Add index to rowData
                        if (onRowSelected) {
                            onRowSelected(rowData);
                        }
                    } else {
                        // When a checkbox is unchecked, check if any other row is selected
                        // before clearing the selectedRow state
                        if (gridRef.current) {
                            const selectedNodes = gridRef.current.api.getSelectedNodes();
                            if (selectedNodes.length === 0) {
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
                                isGroupSheet={isGroupSheet() ? 0 : selectedSheet.range === 'תקול לסדנא' ? 2 : 1}
                                clickedCellInfo={event}
                                onConfirm={() => {
                                    if (isGroupSheet())
                                        handleConfirmOpticCredit()
                                    else if (selectedSheet.range === 'תקול לסדנא')
                                        handleConfirmOpticStock()
                                    else handleConfirmOpticSadna()
                                }}
                                onCancel={() => setShowConfirmDialog(false)}
                                onRemoveItem={handleConfirmOpticDelete}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default SheetDataGrid;
