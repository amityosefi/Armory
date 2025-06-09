import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TabsNavigation from './route/TabsNavigation.tsx';
import SheetDataGrid from './SheetDataGrid';
import GoogleSheetsService from '../services/GoogleSheetsService';
import { creditSoldier } from '../services/SoldierService';
import type { SheetGroup } from '../types';
import { useGoogleSheetData } from './hooks/useGoogleSheetData.tsx';
import StatusMessageProps from './feedbackFromBackendOrUser/StatusMessageProps.tsx';
import AssignWeapon from './AssignWeapon.tsx';
import AcceptSoldier from './feedbackFromBackendOrUser/AcceptSoldierWeapon.tsx';
import { jsPDF } from 'jspdf';

// import NotoSansHebrew from '../fonts/NotoSansHebrew-normal';

interface SheetGroupPageProps {
    accessToken: string;
    sheetGroups: SheetGroup[];
}

const SheetGroupPage: React.FC<SheetGroupPageProps> = ({ accessToken, sheetGroups }) => {
    const { groupId } = useParams();
    const groupIndex = parseInt(groupId || '0');
    const currentGroup = sheetGroups[groupIndex] || sheetGroups[0];
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const [assignSoldier, setAssignSoldier] = useState(false);
    const [formValues, setFormValues] = useState({
        fullName: '',
        personalNumber: 0,
        phone: 0,
        weaponName: '',
        intentionName: '',
        serialNumber: '',
        signature: '',
    });
    const [selectedSerialInfo, setSelectedSerialInfo] = useState<{ value: string; rowIndex: number; colIndex: number } | null>(null);
    const [selectedOptic, setSelectedOptic] = useState<{ label: string; rowIndex: number; colIndex: number } | null>(null);
    const selectedSheet = currentGroup.sheets[activeTabIndex];
    const encodedRange = selectedSheet ? encodeURIComponent(selectedSheet.range) : '';
    const isGroupSheet = () => ['א', 'ב', 'ג', 'מסייעת', 'מכלול', 'פלסם', 'אלון'].includes(currentGroup.sheets[groupIndex]?.range);

    const { data: sheetQueryData, isLoading, error, refetch } = useGoogleSheetData(
        { accessToken, range: encodedRange },
        { processData: false, enabled: !!accessToken && !!encodedRange }
    );

    const [columnDefs, setColumnDefs] = useState<any[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [isCreditingInProgress, setIsCreditingInProgress] = useState(false);

    useEffect(() => {
        if (sheetQueryData && !isLoading) {
            if (!sheetQueryData.values?.length) {
                setSheetData([]);
                setColumnDefs([]);
                return;
            }
            const { columnDefs: cols, rowData } = GoogleSheetsService.processSheetData(sheetQueryData);
            if (cols.length > 0) cols[0] = { ...cols[0], checkboxSelection: true, headerCheckboxSelection: false, width: 60, flex: 0 };
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
        const msg = `החייל ${formValues.fullName} הוחתם על נשק ${formValues.weaponName} עם כוונת ${formValues.intentionName} ומספר סידורי ${formValues.serialNumber}`;
        const userEmail = localStorage.getItem('userEmail');
        let optic = formValues.intentionName;
        const update = [
            { sheetId: 439908422, rowIndex: selectedSerialInfo?.rowIndex, colIndex: selectedSerialInfo?.colIndex, value: '' },
        ];
        if (optic !== '') {
            optic = formValues.intentionName.startsWith('M5') ? 'M5' : 'מאפרו';
            update.push({ sheetId: 813181890, rowIndex: selectedOptic?.rowIndex, colIndex: selectedOptic?.colIndex, value: '' });
        }

        const response = await GoogleSheetsService.updateCalls({
            accessToken,
            updates: update,
            appendSheetId: 553027487,
            appendValues: [[msg, new Date().toString(), userEmail || '']],
            secondAppendSheetId: selectedSheet.id,
            secondAppendValues: [[formValues.fullName, formValues.personalNumber.toString(), formValues.phone.toString(), formValues.signature, new Date(), formValues.weaponName, optic, formValues.serialNumber]]
        });

        setShowMessage(true);
        setAssignSoldier(false);
        setShowDialog(false);
        setIsSuccess(response);
        setMessage(response ? msg : 'בעיה בהחתמת חייל');
        setFormValues({ fullName: '', personalNumber: 0, phone: 0, weaponName: '', intentionName: '', serialNumber: '', signature: '' });
        refetch();
    };

    const downloadData = (row: Record<string, string>) => {
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text(`פרטי משתמש - ${row['שם_מלא'] || 'ללא שם'}`, 10, 10);
        let y = 20;
        Object.entries(row).forEach(([key, value]) => {
            if (value && key !== 'rowIndex') {
                doc.text(`${key.replace(/_/g, ' ')}: ${value}`, 10, y);
                y += 8;
            }
        });
        doc.save(`${row['שם_מלא']}_${row['מספר_אישי'] || 'נתונים'}.pdf`);
    };

    const handleCreditSoldier = async (row: any) => {
        try {
            setIsCreditingInProgress(true);
            const colOpticIndex = columnDefs.findIndex(col => col.field === 'הערות');
            const headers = columnDefs.slice(colOpticIndex + 1).map(col => col.field || col.headerName);
            const response = await creditSoldier(accessToken, sheetGroups, row, headers, selectedSheet.range);
            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? 'החייל זוכה בהצלחה!' : 'בעיה בזיכוי החייל');
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

    const creditButton = selectedRow && groupIndex === 0 && (
        <button 
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm" 
            onClick={() => handleCreditSoldier(selectedRow)}
            disabled={isCreditingInProgress}
        >
            {isCreditingInProgress ? (
                <span className="flex items-center">
                    מעבד...
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                </span>
            ) : 'זיכוי חייל'}
        </button>
    );
    
    const downloadedData = selectedRow && groupIndex === 0 && (
        <button className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm" onClick={() => downloadData(selectedRow)}>
            הורדת דף החתמה לחייל
        </button>
    );

    const assignWeaponButton = isGroupSheet() && (
        <button className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm" onClick={() => setAssignSoldier(true)}>
            החתמת חייל
        </button>
    );

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">{currentGroup.name}</h2>

            <TabsNavigation sheets={currentGroup.sheets} activeTabIndex={activeTabIndex} onTabChange={handleTabChange} creditButton={creditButton} downloadedData={downloadedData} assignWeaponButton={assignWeaponButton} />

            {assignSoldier && (
                <AssignWeapon
                    accessToken={accessToken}
                    formValues={formValues}
                    setFormValues={setFormValues}
                    onConfirm={handleConfirmNewSoldier}
                    onCancel={() => {
                        setFormValues({ fullName: '', personalNumber: 0, phone: 0, weaponName: '', intentionName: '', serialNumber: '', signature: '' });
                        setAssignSoldier(false);
                    }}
                    setSelectedSerialInfo={setSelectedSerialInfo}
                    setSelectedOptic={setSelectedOptic}
                    setShowDialog={setShowDialog}
                    setAssignSoldier={setAssignSoldier}
                />
            )}

            {showDialog && (
                <AcceptSoldier
                    onConfirm={handleConfirmNewSoldier}
                    onCancel={() => {
                        setFormValues({ fullName: '', personalNumber: 0, phone: 0, weaponName: '', intentionName: '', serialNumber: '', signature: '' });
                        setAssignSoldier(false);
                    }}
                />
            )}

            {showMessage && (
                <StatusMessageProps isSuccess={isSuccess} message={message} onClose={() => setMessage('')} />
            )}

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
                <SheetDataGrid accessToken={accessToken} columnDefs={columnDefs} rowData={sheetData} selectedSheet={selectedSheet} onRowSelected={setSelectedRow} />
            ) : (
                <div className="bg-white shadow-lg rounded-lg p-6 text-center">
                    <p className="text-gray-700">אין מידע זמין עבור גליון זה.</p>
                </div>
            )}
        </div>
    );
};

export default SheetGroupPage;
