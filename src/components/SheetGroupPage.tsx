import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import TabsNavigation from './route/TabsNavigation.tsx';
import SheetDataGrid from './SheetDataGrid';
import GoogleSheetsService from '../services/GoogleSheetsService';
import {creditSoldier} from '../services/SoldierService';
import type {SheetGroup} from '../types';
import {useGoogleSheetData} from './hooks/useGoogleSheetData.tsx';
import StatusMessageProps from "./feedbackFromBackendOrUser/StatusMessageProps.tsx";
import AssignWeapon from "./AssignWeapon.tsx";
import AcceptSoldier from "./feedbackFromBackendOrUser/AcceptSoldierWeapon.tsx";

interface SheetGroupPageProps {
    accessToken: string;
    sheetGroups: SheetGroup[];
}

const SheetGroupPage: React.FC<SheetGroupPageProps> = ({accessToken, sheetGroups}) => {
    const {groupId} = useParams();
    const groupIndex = parseInt(groupId || "0");
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [selectedRow, setSelectedRow] = useState<any | null>(false);
    const [formValues, setFormValues] = useState({
        fullName: '',
        personalNumber: 0,
        phone: 0,
        weaponName: '',
        intentionName: '',
        serialNumber: '',
        signature: '',
    });
    const [selectedSerialInfo, setSelectedSerialInfo] = useState<{
        value: string;
        rowIndex: number;
        colIndex: number;
    } | null>(null);
    const [selectedOptic, setSelectedOptic] = useState<{
        label: string;
        rowIndex: number;
        colIndex: number;
    } | null>(null);

    // Make sure groupIndex is valid
    const currentGroup = groupIndex >= 0 && groupIndex < sheetGroups.length
        ? sheetGroups[groupIndex]
        : sheetGroups[0];

    // Get the currently selected sheet
    const selectedSheet = currentGroup.sheets[activeTabIndex];
    const encodedRange = selectedSheet ? encodeURIComponent(selectedSheet.range) : '';

    function isGroupSheet(): boolean {
        const groupName = currentGroup.sheets[groupIndex]?.range;

        const groupNames = ['א', 'ב', 'ג', 'מסייעת', 'מכלול', 'פלסם', 'אלון'];
        return groupNames.includes(groupName);
    }

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
    const [assignSoldier, setAssignSoldier] = useState(false);

    const [showMessage, setShowMessage] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState('');

    const [showDialog, setShowDialog] = useState(false);


    // Process data when query results change
    useEffect(() => {
        if (sheetQueryData && !isLoading) {
            if (!sheetQueryData.values || sheetQueryData.values.length === 0) {
                setSheetData([]);
                setColumnDefs([]);
                return;
            }

            // Process the data using our service
            const {columnDefs: cols, rowData} = GoogleSheetsService.processSheetData(sheetQueryData);

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


    async function handleConfirmNewSoldier() {
        const msg = `החייל ${formValues.fullName} הוחתם על נשק ${formValues.weaponName} עם כוונת ${formValues.intentionName} ומספר סידורי ${formValues.serialNumber}`;
        const userEmail = localStorage.getItem('userEmail');

        let optic = formValues.intentionName;
        const update = [];
        update.push({
            sheetId: 439908422,
            rowIndex: selectedSerialInfo?.rowIndex,
            colIndex: selectedSerialInfo?.colIndex,
            value: ''
        });
        if (optic !== '') {
            optic = formValues.intentionName.startsWith("M5") ? "M5" : "מאפרו"
            update.push({
                sheetId: 813181890,
                rowIndex: selectedOptic?.rowIndex,
                colIndex: selectedOptic?.colIndex,
                value: ''
            });
        }

        const response = await GoogleSheetsService.updateCalls({
            accessToken: accessToken,
            updates: update,
            appendSheetId: 553027487,
            appendValues: [[msg, new Date().toString(), userEmail ? userEmail : ""]],
            secondAppendSheetId: selectedSheet.id,
            secondAppendValues: [[formValues.fullName, formValues.personalNumber.toString(), formValues.phone.toString(), formValues.signature, new Date(), formValues.weaponName, optic, formValues.serialNumber]]

        });
        setShowMessage(true);
        setAssignSoldier(false);
        setShowDialog(false);
        setIsSuccess(response);
        setMessage(response ? msg : `בעיה בהחתמת חייל`);
        setFormValues({
            fullName: "",
            personalNumber: 0,
            phone: 0,
            weaponName: "",
            intentionName: "",
            serialNumber: "",
            signature: "",
        });

        refetch();
    }

    // Function to handle crediting soldier
    const handleCreditSoldier = async (selectedRow: any) => {

        const colOpticIndex = columnDefs.findIndex(val => val.field === 'הערות');
        try {

            const headersStartingFromG = columnDefs
                .slice(colOpticIndex + 1)
                .map(column => column.field || column.headerName);
            const response = await creditSoldier(
                accessToken,
                sheetGroups,
                selectedRow,
                headersStartingFromG,
                selectedSheet.range
            );

            setShowMessage(true);
            setIsSuccess(response);
            setMessage(response ? 'החייל זוכה בהצלחה!' : `בעיה בזיכוי החייל`);

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

    const assignWeaponButton = (isGroupSheet() && (

            <button
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm"
                onClick={() => {
                    setAssignSoldier(true);
                }}
            >
                החתמת חייל
            </button>
        )
    );

    // @ts-ignore
    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">{currentGroup.name}</h2>

            <TabsNavigation
                sheets={currentGroup.sheets}
                activeTabIndex={activeTabIndex}
                onTabChange={handleTabChange}
                creditButton={creditButton}
                assignWeaponButton={assignWeaponButton}
            />
            {assignSoldier && (
                <div>
                    <AssignWeapon
                        accessToken={accessToken}
                        formValues={formValues}
                        setFormValues={setFormValues}
                        onConfirm={ handleConfirmNewSoldier}
                        onCancel={() => {
                            setFormValues({
                                fullName: "",
                                personalNumber: 0,
                                phone: 0,
                                weaponName: "",
                                intentionName: "",
                                serialNumber: "",
                                signature: "",
                            });
                            setAssignSoldier(false);
                        }}
                        setSelectedSerialInfo={setSelectedSerialInfo}
                        selectedOptic={null}
                        setShowDialog={setShowDialog}
                        setAssignSoldier={setAssignSoldier}
                    />
                </div>
            )}

            {showDialog && (
                <div>
                    <AcceptSoldier
                        onConfirm={handleConfirmNewSoldier}
                        onCancel={() => {
                            setFormValues({
                                fullName: "",
                                personalNumber: 0,
                                phone: 0,
                                weaponName: "",
                                intentionName: "",
                                serialNumber: "",
                                signature: "",
                            });
                            setAssignSoldier(false);
                        }}
                    />
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

            {/* Content Area */}
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
            ) : sheetData.length > 0 ? (
                <SheetDataGrid
                    accessToken={accessToken}
                    columnDefs={columnDefs}
                    rowData={sheetData}
                    selectedSheet={selectedSheet}
                    onRowSelected={setSelectedRow}
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