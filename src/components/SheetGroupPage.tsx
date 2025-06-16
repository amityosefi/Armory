import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import TabsNavigation from './route/TabsNavigation';
import SheetDataGrid from './SheetDataGrid';
import GoogleSheetsService from '../services/GoogleSheetsService';
import {creditSoldier} from '../services/SoldierService';
import type {SheetGroup} from '../types';
import {useGoogleSheetData} from './hooks/useGoogleSheetData';
import StatusMessageProps from './feedbackFromBackendOrUser/StatusMessageProps';
import AssignWeapon from './AssignWeapon';
import AcceptSoldier from './feedbackFromBackendOrUser/AcceptSoldierWeapon';
import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import googleSheetsService from "../services/GoogleSheetsService";

import '../fonts/NotoSansHebrew-normal';
import PromptNewWeaponOrOptic from "./PromptNewWeaponOrOptic";
import PromptNewSerialWeaponOrOptic from "./PromptNewSerialWeaponOrOptic";
import AddOpticToGroupColumn from "./AddOpticToGroupColumn";
import {useNavigate} from "react-router-dom";
import SoldierCardPage from "./SoldierCardPage";

interface SheetGroupPageProps {
    accessToken: string;
    sheetGroups: SheetGroup[];
}

const SheetGroupPage: React.FC<SheetGroupPageProps> = ({accessToken, sheetGroups}) => {
    const {groupId} = useParams();
    const groupIndex = parseInt(groupId || '0');
    const currentGroup = sheetGroups[groupIndex] || sheetGroups[0];
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const [assignSoldier, setAssignSoldier] = useState(false);
    const [addOpticColumn, setAddOpticColumn] = useState(false);
    const [openSoldierCard, setOpenSoldierCard] = useState(false);
    const [formValues, setFormValues] = useState({
        fullName: '',
        personalNumber: null,
        phone: null,
        weaponName: '',
        intentionName: '',
        serialNumber: '',
        signature: '',
    });
    const [selectedSerialInfo, setSelectedSerialInfo] = useState<{
        value: string;
        rowIndex: number;
        colIndex: number
    } | null>(null);
    const [selectedOptic, setSelectedOptic] = useState<{
        label: string;
        rowIndex: number;
        colIndex: number
    } | null>(null);
    const selectedSheet = currentGroup.sheets[activeTabIndex];
    const encodedRange = selectedSheet ? encodeURIComponent(selectedSheet.range) : '';
    const isGroupSheet = () => ['א', 'ב', 'ג', 'מסייעת', 'מכלול', 'פלסם', 'אלון'].includes(currentGroup.sheets[groupIndex]?.range);

    const {data: sheetQueryData, isLoading, error, refetch} = useGoogleSheetData(
        {accessToken, range: encodedRange},
        {processData: false, enabled: !!accessToken && !!encodedRange}
    );

    const navigate = useNavigate();
    const [newWeaponOrOpticName, setNewWeaponOrOpticName] = useState('');
    const [newSerialWeaponOrOpticName, setNewSerialWeaponOrOpticName] = useState('');
    const [chosenWeaponOrOptic, setChosenWeaponOrOptic] = useState('');
    const [chosenNewOptic, setChosenNewOptic] = useState('');
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

    const doc = new jsPDF();
    doc.setFont('NotoSansHebrew'); // use your font

    const [columnDefs, setColumnDefs] = useState<any[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [isCreditingInProgress, setIsCreditingInProgress] = useState(false);

    const [promptNewWeaponOrOptic, setPromptNewWeaponOrOptic] = useState(false);
    const [newSerialWeaponOrOptic, setNewSerialWeaponOrOptic] = useState(false);

    useEffect(() => {
        if (sheetQueryData && !isLoading) {
            if (!sheetQueryData.values?.length) {
                setSheetData([]);
                setColumnDefs([]);
                return;
            }
            const {columnDefs: cols, rowData} = GoogleSheetsService.processSheetData(sheetQueryData);
            if (cols.length > 0) cols[0] = {
                ...cols[0],
                checkboxSelection: true,
                headerCheckboxSelection: false,
                width: 60,
                flex: 0
            };
            setColumnDefs(cols);
            setSheetData(rowData);
        }
    }, [sheetQueryData, isLoading]);


    useEffect(() => {
        if (currentGroup.sheets.length > 0) handleTabChange(0);
    }, [currentGroup]);

    const handleTabChange = (sheetIndex: number) => {
        setActiveTabIndex(sheetIndex);
        setSelectedRow(null);
    };

    const handleConfirmNewSoldier = async () => {
        let msg;
        setShowDialog(false);
        if (formValues.intentionName)
            msg = `החייל ${formValues.fullName} הוחתם על נשק ${formValues.weaponName} עם כוונת ${formValues.intentionName} מסד ${formValues.serialNumber} ${selectedSheet.name}`;
        else
            msg = `החייל ${formValues.fullName} הוחתם על נשק ${formValues.weaponName} בלי כוונת מסד ${formValues.serialNumber} ${selectedSheet.name}מ`;
        const userEmail = localStorage.getItem('userEmail');
        let optic = formValues.intentionName;
        const update = [
            {
                sheetId: 439908422,
                rowIndex: selectedSerialInfo?.rowIndex,
                colIndex: selectedSerialInfo?.colIndex,
                value: ''
            },
        ];
        if (optic !== '') {
            optic = formValues.intentionName.startsWith('M5') ? 'M5' : 'מפרו';
            update.push({
                sheetId: 813181890,
                rowIndex: selectedOptic?.rowIndex,
                colIndex: selectedOptic?.colIndex,
                value: ''
            });
        }

        // @ts-ignore
        const response = await GoogleSheetsService.updateCalls({
            accessToken,
            updates: update,
            appendSheetId: 553027487,
            appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail || '']],
            secondAppendSheetId: selectedSheet.id,
            secondAppendValues: [[formValues.fullName, String(formValues.personalNumber), String(formValues.phone), formValues.signature, new Date().toLocaleString('he-IL'), formValues.weaponName, optic, formValues.serialNumber]]
        });

        setShowMessage(true);
        setAssignSoldier(false);
        setIsSuccess(response);
        setMessage(response ? msg : 'בעיה בהחתמת חייל');
        setFormValues({
            fullName: '',
            personalNumber: null,
            phone: null,
            weaponName: '',
            intentionName: '',
            serialNumber: '',
            signature: ''
        });
        refetch();
    };


// Helper to reverse only Hebrew words, not numbers or English
    const mirrorHebrewSmart = (str: string) => {
        return str
            .split(/\s+/)
            .map(word =>
                /[\u0590-\u05FF]/.test(word) ? word.split('').reverse().join('') : word
            )
            .reverse() // Reverse word order too
            .join(' ');
    };

    const downloadData = (row: any) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        let y = 10;

        doc.addFont('NotoSansHebrew-normal.ttf', 'NotoSansHebrew', 'normal');
        doc.setFont('NotoSansHebrew');
        doc.setFontSize(12);

        // Title in the center
        doc.setFontSize(18);
        doc.text(mirrorHebrewSmart('טופס חיתמת חייל גדוד .1018'), pageWidth / 2, y, {align: 'center'});
        y += 10;

        // Right-up: date and time
        const dateStr = new Date().toLocaleString('he-IL').split(' ');
        doc.setFontSize(10);
        doc.text(mirrorHebrewSmart(`שם מלא: ${row['שם_מלא'] || ''}`), pageWidth - margin, y, {align: 'right'});
        doc.text(mirrorHebrewSmart('תאריך נוכחי: '), margin, y, {align: 'left'});

        y += 10;
        doc.text(mirrorHebrewSmart(`מספר אישי: ${row['מספר_אישי'] || ''}`), pageWidth - margin, y, {align: 'right'});
        doc.text(dateStr[1] + ' ' + dateStr[0], margin, y, {align: 'left'});

        y += 10;
        doc.text(mirrorHebrewSmart('תאריך חתימה: '), margin, y, {align: 'left'});

        y += 10;
        doc.text(mirrorHebrewSmart(row['זמן_חתימה']), margin, y, {align: 'left'});

        // Section: פלוגה + פלאפון
        y += 15;
        autoTable(doc, {
            startY: y,
            body: [[mirrorHebrewSmart('פלוגה'), mirrorHebrewSmart('פלאפון')],
                [mirrorHebrewSmart(selectedSheet.name), mirrorHebrewSmart(row['פלאפון'] || '')]],
            styles: {font: 'NotoSansHebrew', halign: 'right'},
            margin: {left: margin, right: margin},
        });

        // Dot notes
        // @ts-ignore
        y = doc.lastAutoTable.finalY + 15;
        const notes = [
            'הנני מצהיר/ה כי ביצעתי מטווח יום + לילה בסוג הנשק הנ״ל שעליו אני חותם.',
            'הנני בקיא בהפעלתו ובהוראות הבטיחות בנושא אחזקת הנשק כולל שימוש במק פורק.',
            'הנשק יוחזר לנשקייה נקי ומשומן - ואחת לחודש יבצע בדיקת נשק.',
            'החייל/ת ביצע/ה בוחן לנשק אישי ובוחן למק פורק.',
            'הנשק ינופק באישור השלישות.',
        ];

        doc.setFontSize(12);
        notes.forEach((line, i) => {
            doc.text(`${mirrorHebrewSmart(line)} •`, pageWidth - margin, y + i * 8, {align: 'right'});
        });

        // Table with user info
        y += notes.length * 8 + 15;
        autoTable(doc, {
            startY: y,
            body: [[
                mirrorHebrewSmart('שם מלא'),
                mirrorHebrewSmart('מספר אישי'),
                mirrorHebrewSmart('פלוגה')
            ],
                [
                    mirrorHebrewSmart(row['שם_מלא'] || ''),
                    mirrorHebrewSmart(row['מספר_אישי'] || ''),
                    mirrorHebrewSmart(selectedSheet.name)
                ]],
            styles: {
                font: 'NotoSansHebrew',
                halign: 'right',
            },
            headStyles: {
                halign: 'right',
            },
            margin: {left: margin, right: margin},
        });


        // Signature label
        // @ts-ignore
        y = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(mirrorHebrewSmart('חתימת החייל'), pageWidth / 2, y, {align: 'center'});

        // Add signature image if available
        // y += 5;
        if (row['חתימה']) {
            try {
                doc.addImage(row['חתימה'], 'PNG', pageWidth / 2 - 40, y, 80, 50); // Bigger and centered
            } catch (e) {
                console.error('Error adding signature:', e);
            }
        }

        // Table of all nonempty values (excluding keys we already used)
        y += 40;

        const kvPairs = Object.entries(row)
            .filter(([key, val]) =>
                val &&
                !['חתימה', 'rowIndex', 'מספר_אישי', 'שם_מלא', 'פלאפון', 'זמן_חתימה'].includes(key)
            )
            .map(([val, key]) => [
                mirrorHebrewSmart(val),
                mirrorHebrewSmart(String(key).replace(/_/g, ' '))
            ]);

        autoTable(doc, {
            startY: y,
            body: [...[[mirrorHebrewSmart('מסד'), mirrorHebrewSmart('אמצעי')]], ...kvPairs],
            styles: {font: 'NotoSansHebrew', halign: 'right'},
            margin: {left: margin, right: margin},
        });

        // Save PDF
        const filename = `${row['שם_מלא'] || 'משתמש'}_${row['מספר_אישי'] || 'טופס'}.pdf`;
        doc.save(filename);
    };

    const handleCreditSoldier = async (row: any) => {

        let msg = '';
        try {

            msg = Object.entries(row)
                .filter(([_, value]) => value !== '')
                .map(([key, value]) => {
                    if (key !== 'rowIndex' && key !== 'חתימה') {
                        if (key === 'שם_מלא') {
                            return `החייל: ${value} זיכה `;
                        }
                        return `${key}: ${value}`;
                    }
                })
                .join(', ');

            setIsCreditingInProgress(true);
            const colOpticIndex = columnDefs.findIndex(col => col.field === 'הערות');
            const headers = columnDefs.slice(colOpticIndex + 1).map(col => col.field || col.headerName);
            const response = await creditSoldier(accessToken, sheetGroups, row, headers, selectedSheet.range);
            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? msg + " " + selectedSheet.name : 'בעיה בזיכוי החייל');
            if (response)
                await googleSheetsService.updateCalls({
                    accessToken: accessToken,
                    updates: [],
                    appendSheetId: 553027487,
                    appendValues: [[msg, new Date().toLocaleString('he-IL'), localStorage.getItem('userEmail') || '']]
                });
            refetch();
        } catch (error) {
            console.error('Error crediting soldier:', error);
            setShowMessage(true);
            setIsSuccess(false);
            setMessage('שגיאה בזיכוי החייל');
        } finally {
            setIsCreditingInProgress(false);
        }
    };

    async function handleNewWeaponOrOptic() {
        setIsCreditingInProgress(true);
        const updates = [{
            sheetId: selectedSheet.id,
            rowIndex: 0,
            colIndex: sheetQueryData.values[0].length,
            value: newWeaponOrOpticName
        }];
        const msg = 'ל ' + selectedSheet.range + 'נוסף סוג חדש בשם: ' + newWeaponOrOpticName;
        let response = false;
        const flag = await GoogleSheetsService.executeBatchUpdate(accessToken, [
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": selectedSheet.id,
                        "gridProperties": {
                            "columnCount": sheetQueryData.values[0].length + 5
                        }
                    },
                    "fields": "gridProperties.columnCount"
                }
            }
        ])
        if (flag) {
            response = await GoogleSheetsService.updateCalls({
                    accessToken: accessToken,
                    updates: updates,
                    appendSheetId: 553027487,
                    appendValues: [[msg, new Date().toLocaleString('he-IL'), localStorage.getItem('userEmail') || '']],

                }
            );
        }
        setShowMessage(true);
        setMessage(response && response ? msg : 'בעיה בהוספת נשק או כוונת');
        setIsSuccess(response && response);
        setPromptNewWeaponOrOptic(false);
        setNewWeaponOrOpticName('')
        setIsCreditingInProgress(false);
        refetch();

    }

    async function handleConfirmNewOptic() {

        console.log('Chosen new optic:', chosenNewOptic);
        console.log('selectedSheet:', selectedSheet.id);
        console.log('columnDefs.map(row => row.headerName).length:', columnDefs.map(row => row.headerName).length);
        const msg = 'ל' + selectedSheet.name + ' נוסף אמרל חדש: ' + chosenNewOptic;
        setIsCreditingInProgress(true);
        // @ts-ignore
        let response = false;
        const flag = await GoogleSheetsService.executeBatchUpdate(accessToken, [
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": selectedSheet.id,
                        "gridProperties": {
                            "columnCount": sheetQueryData.values[0].length + 5
                        }
                    },
                    "fields": "gridProperties.columnCount"
                }
            }
        ])
        if (flag) {
            response = await GoogleSheetsService.updateCalls({
                    accessToken: accessToken,
                    updates: [{

                        sheetId: selectedSheet.id,
                        rowIndex: 0,
                        colIndex: columnDefs.map(row => row.headerName).length,
                        value: chosenNewOptic
                    }],
                    appendSheetId: 553027487,
                    appendValues: [[msg, new Date().toLocaleString('he-IL'), localStorage.getItem('userEmail') || '']],

                }
            );
        }
        setChosenNewOptic('');
        setShowMessage(true);
        setMessage(response ? msg : 'בעיה בהוספת אמרל לפלוגה');
        setIsSuccess(response);
        setAddOpticColumn(false);
        setIsCreditingInProgress(false);
        refetch();
    }

    async function handleNewSerialWeaponOrOptic() {
        const rowCol = GoogleSheetsService.findInsertIndex(sheetQueryData.values, chosenWeaponOrOptic);
        setIsCreditingInProgress(true);

        const updates = [{
            sheetId: selectedSheet.id,
            rowIndex: rowCol.row, //need to change
            colIndex: rowCol.col, // need to change
            value: newSerialWeaponOrOpticName
        }];
        const msg = 'ל' + selectedSheet.name + ' נוסף צ חדש: ' + newSerialWeaponOrOpticName + 'תחת' + chosenWeaponOrOptic;
        const response = await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: updates,
                appendSheetId: 553027487,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), localStorage.getItem('userEmail') || '']],

            }
        );
        setShowMessage(true);
        setMessage(response ? msg : 'בעיה בהוספת נשק או כוונת');
        setIsSuccess(response);
        setNewSerialWeaponOrOptic(false);
        setChosenWeaponOrOptic('');
        setNewSerialWeaponOrOpticName('');
        setIsCreditingInProgress(false);
        refetch();
    }

    const creditButton = selectedRow && groupIndex === 0 && (
        <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
            onClick={() => handleCreditSoldier(selectedRow)}
            disabled={isCreditingInProgress}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span
                        className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : 'זיכוי חייל'}
        </button>
    );

    const downloadedData = selectedRow && groupIndex === 0 && (
        <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
            onClick={() => downloadData(selectedRow)}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span
                        className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : 'דף החתמה להורדה'}
        </button>
    );

    const addOpticToGroup = isGroupSheet() && !selectedRow && (
        <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
            onClick={() => setAddOpticColumn(true)}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span
                        className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : 'הוספת אמרל'}
        </button>
    );

    const assignWeaponButton = isGroupSheet() && !selectedRow && (
        <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
            onClick={() => setAssignSoldier(true)}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span
                        className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : 'החתמת חייל'}
        </button>
    );

    const addWeaponOrOptic = ['מלאי נשקיה', 'מלאי אופטיקה'].includes(selectedSheet.range) && (
        <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
            onClick={() => setPromptNewWeaponOrOptic(true)}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span
                        className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : selectedSheet.range === 'מלאי נשקיה' ? 'הוספת נשק חדש' : 'הוספת אמרל חדש'}
        </button>
    );

    const addNewSerialWeaponOrOptic = ['מלאי נשקיה', 'מלאי אופטיקה'].includes(selectedSheet.range) && (
        <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
            onClick={() => setNewSerialWeaponOrOptic(true)}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span
                        className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : 'הוספת מסד חדש'}
        </button>
    );

    const showSoldierModal = isGroupSheet() && selectedRow && (
        <button
            onClick={() => navigate('/soldier-card', {
                state: {
                    row: selectedRow,
                    sheetName: selectedSheet.name
                }
            })}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
        >
            כרטיסיית חייל
        </button>
    );

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">{currentGroup.name}</h2>

            <TabsNavigation sheets={currentGroup.sheets} activeTabIndex={activeTabIndex} onTabChange={handleTabChange}
                            creditButton={creditButton} downloadedData={downloadedData}
                            assignWeaponButton={assignWeaponButton} addWeaponOrOptic={addWeaponOrOptic}
                            addNewSerialWeaponOrOptic={addNewSerialWeaponOrOptic} addOpticToGroup={addOpticToGroup}
                // showSoldierModal={showSoldierModal}
            />
            {/*{openSoldierCard && (*/}
            {/*    <SoldierCardPage*/}
            {/*        row={selectedRow}*/}
            {/*        onCancel={() => setOpenSoldierCard(false)}*/}
            {/*        creditSoldier={async () => {*/}
            {/*            // handleConfirmAction(soldierRowData);*/}
            {/*            await handleCreditSoldier(selectedRow);*/}
            {/*            setOpenSoldierCard(false);*/}
            {/*        }}*/}
            {/*        downloadedData={() => {*/}
            {/*            downloadData(selectedRow);*/}
            {/*        }}*/}
            {/*        sheetName={selectedSheet.name}*/}
            {/*    />*/}
            {/*)}*/}


            {addOpticColumn && (
                <AddOpticToGroupColumn
                    headerGroup={columnDefs.map(row => row.headerName)}
                    opticsHeaders={opticsData.values[0]}
                    chosenNewOptic={chosenNewOptic}
                    setChosenNewOptic={setChosenNewOptic}
                    onClose={() => {
                        setAddOpticColumn(false);
                        setChosenNewOptic('');
                    }}
                    onConfirm={handleConfirmNewOptic}
                />
            )}

            {assignSoldier && (
                <AssignWeapon
                    accessToken={accessToken}
                    formValues={formValues}
                    setFormValues={setFormValues}
                    onConfirm={handleConfirmNewSoldier}
                    onCancel={() => {
                        setFormValues({
                            fullName: '',
                            personalNumber: null,
                            phone: null,
                            weaponName: '',
                            intentionName: '',
                            serialNumber: '',
                            signature: ''
                        });
                        setAssignSoldier(false);
                    }}
                    setSelectedSerialInfo={setSelectedSerialInfo}
                    setSelectedOptic={setSelectedOptic}
                    setShowDialog={setShowDialog}
                    setAssignSoldier={setAssignSoldier}
                />
            )}

            {promptNewWeaponOrOptic && (
                <PromptNewWeaponOrOptic
                    sheetName={selectedSheet.range}
                    accessToken={accessToken}
                    newWeaponOrOpticName={newWeaponOrOpticName}
                    setNewWeaponOrOpticName={setNewWeaponOrOpticName}
                    onCancel={() => {
                        setPromptNewWeaponOrOptic(false);
                        setNewWeaponOrOpticName('');
                    }}
                    onConfirm={handleNewWeaponOrOptic}
                />
            )}

            {newSerialWeaponOrOptic && (
                <PromptNewSerialWeaponOrOptic
                    sheetName={selectedSheet.range}
                    chosenWeaponOrOptic={chosenWeaponOrOptic}
                    setChosenWeaponOrOptic={setChosenWeaponOrOptic}
                    accessToken={accessToken}
                    newSerialWeaponOrOpticName={newSerialWeaponOrOpticName}
                    setNewSerialWeaponOrOpticName={setNewSerialWeaponOrOpticName}
                    onCancel={() => {
                        setNewSerialWeaponOrOptic(false);
                        setNewSerialWeaponOrOpticName('');
                        setNewSerialWeaponOrOpticName('')
                    }}
                    onConfirm={handleNewSerialWeaponOrOptic}
                />
            )}


            {showDialog && (
                <AcceptSoldier
                    onConfirm={handleConfirmNewSoldier}
                    onCancel={() => {
                        setFormValues({
                            fullName: '',
                            personalNumber: null,
                            phone: null,
                            weaponName: '',
                            intentionName: '',
                            serialNumber: '',
                            signature: ''
                        });
                        setAssignSoldier(false);
                    }}
                />
            )}

            {showMessage && (
                <StatusMessageProps isSuccess={isSuccess} message={message} onClose={() => setMessage('')}/>
            )}

            {isLoading ? (
                <div className="flex flex-col justify-center items-center h-64">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-700">טוען מידע...</p>
                </div>
            ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Error:</p>
                    <p>{error instanceof Error ? error.message : 'Failed to fetch sheet data'}</p>
                </div>
            ) : sheetData.length > 0 || isCreditingInProgress ? (
                <SheetDataGrid accessToken={accessToken} columnDefs={columnDefs} rowData={sheetData}
                               selectedSheet={selectedSheet} onRowSelected={setSelectedRow}
                               refetch={refetch}/>
            ) : (
                <div className="bg-white shadow-lg rounded-lg p-6 text-center">
                    <p className="text-gray-700">אין מידע זמין עבור גליון זה.</p>
                </div>
            )}
        </div>
    );
};

export default SheetGroupPage;
