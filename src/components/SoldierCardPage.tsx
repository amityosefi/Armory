// src/pages/SoldierCardPage.tsx
import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useGoogleSheetData } from "./hooks/useGoogleSheetData";
import Spinner from "./Spinner";
import { sheetGroups } from "../constants";
import GoogleSheetsService from "../services/GoogleSheetsService";

interface SoldierCardPageProps {
    accessToken: string;
}

const SoldierCardPage: React.FC<SoldierCardPageProps> = ({ accessToken }) => {
    // const location = useLocation();
    const navigate = useNavigate();
    const { sheetName, soldierIndex } = useParams();

    const soldierRange = sheetName ? `${sheetName}!A${soldierIndex}:Z${soldierIndex}` : '';
    const { data, isLoading: isLoadingSoldier, refetch } = useGoogleSheetData(
        { accessToken, range: soldierRange },
        { processData: false, enabled: !!accessToken }
    );

    const headerRange = sheetName ? `${sheetName}!A1:Z1` : '';
    const { data: headerData, isLoading: isLoadingHeaders } = useGoogleSheetData(
        { accessToken, range: headerRange },
        { processData: false, enabled: !!accessToken && !!headerRange }
    );
    const [isMutating, setIsMutating] = useState(false);
    const isLoading = isLoadingSoldier || isLoadingHeaders || isMutating;
    let row: Record<string, any> = {};

    if (data?.values && data.values.length > 0) {
        // Fetch headers for mapping

        const headers = headerData?.values?.[0] || [];
        const values = data.values[0];
        headers.forEach((header: string, idx: number) => {
            row[header] = values[idx] || '';
        });
    }

    async function changeNameOrComment(fieldName: string) {
        setIsMutating(true);
        const val = editableFields[fieldName] || '';
        const rowIndex = parseInt(soldierIndex || '0', 10) - 1;
        const sheetId = sheetGroups.flatMap(group => group.sheets)
            .find(sheet => sheet.range === sheetName)?.id;
        let msg = '';
        if (sheetName === 'טבלת נשקיה')
            msg = 'חתימה מול החטיבה שונתה ל' + val + ' מהערך הקודם ' + row[fieldName];
        else
            msg = "חייל " + row["שם מלא"] + " שינה " + fieldName + ': ' + val + ' מהערך הקודם ' + row[fieldName];
        if (fieldName === 'הערות' || fieldName === 'שם מלא' || fieldName === 'פלאפון') {
            const userEmail = localStorage.getItem('userEmail');
            // Find colIndex dynamically from headers
            const headers = headerData?.values?.[0] || [];
            const colIndex = headers.indexOf(fieldName);
            if (colIndex === -1) {
                alert('שגיאה: לא נמצא עמודה עבור ' + fieldName);
                return;
            }
            console.log(JSON.stringify(
                {
                    sheetId: sheetId,
                    rowIndex,
                    colIndex,
                    value: editableFields[fieldName] ?? ""

                }));

            await GoogleSheetsService.updateCalls({
                accessToken: accessToken,
                updates: [{
                    sheetId: sheetId,
                    rowIndex,
                    colIndex,
                    value: editableFields[fieldName] ?? ""
                }],
                appendSheetId: 1070971626,
                appendValues: [[msg, new Date().toLocaleString('he-IL'), userEmail ? userEmail : ""]]
            });
            refetch();
            setIsMutating(false);
            // setShowMessage(true);
            // setIsSuccess(response);
            // setMessage(response ? msg : ` בעיה בעדכון ${event.colDef.field}`);
            // refetch();
            // if (!response) {
            //     isRevertingNameOrComment.current = true;
            //     event.node.setDataValue(event.column.getId(), event.oldValue);
            // }
        }

    }

    const handleDownload = () => {
        // your downloadData(row) logic here
    };

    const handleCredit = () => {
        // credit logic here
    };

    // Editable fields state
    const [editableFields, setEditableFields] = useState({
        פלאפון: row['פלאפון'] || '',
        הערות: row['הערות'] || '',
        'שם מלא': row['שם מלא'] || '',
    });
    const [editingField, setEditingField] = useState<string | null>(null);

    // Sync editableFields with row when data loads
    React.useEffect(() => {
        setEditableFields({
            פלאפון: row['פלאפון'] || '',
            הערות: row['הערות'] || '',
            'שם מלא': row['שם מלא'] || '',
        });
    }, [row['פלאפון'], row['הערות'], row['שם מלא']]);

    const handleFieldChange = (field: string, value: string) => {
        setEditableFields(prev => ({ ...prev, [field]: value }));
    };

    const handleEditField = (field: string) => setEditingField(field);
    const handleSaveField = (field: string) => {
        // Here you would update the data in Google Sheets or backend
        changeNameOrComment(editingField);
        setEditingField(null);
    };

    return isLoading ? <Spinner /> : (
        <div className="flex flex-col items-center justify-center w-full h-[83vh] max-w-3/4">
            <div className="bg-white shadow-lg rounded-lg p-8 w-full">
                <div className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded"
                    >
                        חזור
                    </button>
                    <h2 className="text-2xl font-bold text-center"><EditableWithPencil
                        title
                        label="שם מלא"
                        value={editableFields['שם מלא']}
                        displayValue={row['שם מלא'] || '-'}
                        isEditing={editingField === 'שם מלא'}
                        onEdit={() => handleEditField('שם מלא')}
                        onChange={val => handleFieldChange('שם מלא', val)}
                        onSave={() => handleSaveField('שם מלא')}
                    /></h2>
                    <span className="text-gray-600 text-sm px-6 opacity-0 pointer-events-none">a</span>
                </div>

                {/* Info Card */}
                <div className="mb-6 grid grid-cols-3 md:grid-cols-2 gap-6">
                    <InfoField label="מספר אישי" value={row['מספר אישי'] || '-'} />
                    <InfoField label="פלוגה" value={sheetName || ''} />
                    <EditableWithPencil
                        label="פלאפון"
                        value={editableFields['פלאפון']}
                        displayValue={row['פלאפון'] || '-'}
                        isEditing={editingField === 'פלאפון'}
                        onEdit={() => handleEditField('פלאפון')}
                        onChange={val => handleFieldChange('פלאפון', val)}
                        onSave={() => handleSaveField('פלאפון')}
                    />
                    <InfoField label="תאריך נוכחי" value={new Date().toLocaleString('he-IL')} />
                    <InfoField label="תאריך חתימה" value={row['זמן חתימה'] || '-'} />
                    <EditableWithPencil
                        label="הערות"
                        value={editableFields['הערות']}
                        displayValue={row['הערות'] || '-'}
                        isEditing={editingField === 'הערות'}
                        onEdit={() => handleEditField('הערות')}
                        onChange={val => handleFieldChange('הערות', val)}
                        onSave={() => handleSaveField('הערות')}
                    />
                </div>

                {/* Signature */}
                <div className="text-center mb-6">
                    <div className="mb-2 font-semibold">חתימת החייל</div>
                    {row['חתימה'] ? (
                        <img
                            src={row['חתימה']}
                            alt="חתימה"
                            className="mx-auto border w-40 h-24 object-contain"
                        />
                    ) : (
                        <div className="mx-auto border w-40 h-24 flex items-center justify-center text-gray-400 italic">
                            אין חתימה
                        </div>
                    )}
                </div>


                {/* Action Buttons */}
                <div className="flex flex-row-reverse gap-4 justify-center mt-8">
                    <button
                        onClick={handleDownload}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
                    >
                        החתמה להורדה דף
                    </button>
                    <button
                        onClick={handleCredit}
                        className="bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-6 rounded"
                    >
                        זיכוי חייל
                    </button>
                </div>
            </div>
        </div>
    );

    // Helper component for field display
    function InfoField({ label, value }: { label: string, value: string }) {
        return (
            <div className="flex flex-col">
                <span className="text-xs text-gray-600">{label}</span>
                <span className="font-medium text-base">{value}</span>
            </div>
        );
    }

    // Editable field with pencil icon
    function EditableWithPencil({ label, value, displayValue, isEditing, onEdit, onChange, onSave, title }: {
        label: string,
        value: string,
        displayValue: string,
        isEditing: boolean,
        onEdit: () => void,
        onChange: (val: string) => void,
        onSave: () => void,
        title?: boolean
    }) {
        // Store the original value to revert on Escape
        const [originalValue, setOriginalValue] = useState(value);
        React.useEffect(() => {
            if (isEditing) setOriginalValue(value);
        }, [isEditing]);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Escape') {
                onChange(originalValue); // revert
                setEditingField(null); // exit edit mode
            } else if (e.key === 'Enter') {
                onSave();
            }
        };

        return (
            <div className="flex flex-col relative">
                {!title && <span className="text-xs text-gray-600">{label}</span>}
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            className="font-medium text-base border rounded px-2 py-1"
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            autoFocus
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            onClick={onSave}
                            className="text-green-600 hover:text-green-800 text-lg font-bold"
                            title="שמור"
                        >
                            ✔
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className={`${title ? 'text-2xl' : 'font-medium text-base'} `}>{displayValue}</span>
                        <button
                            onClick={() => { setOriginalValue(value); onEdit(); }}
                            className="text-gray-400 hover:text-gray-700"
                            title="ערוך"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.789l-4 1 1-4 12.362-12.302z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        );
    }
};

export default SoldierCardPage;
