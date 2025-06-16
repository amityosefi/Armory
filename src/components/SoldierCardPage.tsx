// src/pages/SoldierCardPage.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SoldierCardPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { row, sheetName } = location.state || {};
    if (!row) return <div>אין נתונים</div>;

    const formatKey = (key: string) => key.replace(/_/g, ' ');
    const primaryKeys = ['שם_מלא', 'מספר_אישי', 'פלאפון', 'זמן_חתימה'];
    const excludeKeys = ['חתימה', 'rowIndex'];

    const handleDownload = () => {
        // your downloadData(row) logic here
    };

    const handleCredit = () => {
        // credit logic here
    };

    // @ts-ignore
    return (
        <div className="p-6 max-w-4xl mx-auto" dir="rtl">
            <h2 className="text-xl font-bold text-center mb-6">טופס חתימת חייל - גדוד 8101</h2>

            <div className="flex justify-between text-sm mb-4">
                <div>תאריך נוכחי: {new Date().toLocaleString('he-IL')}</div>
                <div>שם מלא: {row['שם_מלא'] || '-'}</div>
            </div>

            <div className="flex justify-between text-sm mb-4">
                <div>תאריך חתימה: {row['זמן_חתימה'] || '-'}</div>
                <div>מספר אישי: {row['מספר_אישי'] || '-'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6 border p-3 rounded bg-gray-50">
                <div><strong>פלוגה:</strong> {sheetName}</div>
                <div><strong>פלאפון:</strong> {row['פלאפון'] || '-'}</div>
            </div>

            <div className="text-sm space-y-2 mb-6 px-2">
                <div>• הנני מצהיר/ה כי ביצעתי מטווח יום + לילה בסוג הנשק הנ״ל שעליו אני חותם.</div>
                <div>• הנני בקיא בהפעלתו ובהוראות הבטיחות בנושא אחזקת הנשק כולל שימוש במק פורק.</div>
                <div>• הנשק יוחזר לנשקייה נקי ומשומן - ואחת לחודש יבצע בדיקת נשק.</div>
                <div>• החייל/ת ביצע/ה בוחן לנשק אישי ובוחן למק פורק.</div>
                <div>• הנשק ינופק באישור השלישות.</div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm border p-3 rounded bg-gray-50 mb-6">
                <div><strong>שם מלא:</strong> {row['שם_מלא'] || '-'}</div>
                <div><strong>מספר אישי:</strong> {row['מספר_אישי'] || '-'}</div>
                <div><strong>פלוגה:</strong> {sheetName}</div>
            </div>

            {row['חתימה'] && (
                <div className="text-center mb-6">
                    <div className="mb-2 font-semibold">חתימת החייל</div>
                    <img
                        src={row['חתימה']}
                        alt="חתימה"
                        className="mx-auto border w-40 h-24 object-contain"
                    />
                </div>
            )}

            {/*<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">*/}
            {/*    {Object.entries(row)*/}
            {/*        .filter(([key, val]) => val && !primaryKeys.includes(key) && !excludeKeys.includes(key))*/}
            {/*        .map(([key, val]) => (*/}
            {/*            <div*/}
            {/*                key={key}*/}
            {/*                className="border rounded p-2 bg-gray-100 flex flex-col"*/}
            {/*            >*/}
            {/*                <span className="text-xs text-gray-600">{formatKey(key)}</span>*/}
            {/*                <span className="font-medium">{val}</span>*/}
            {/*            </div>*/}
            {/*        ))}*/}
            {/*</div>*/}

            <div className="flex justify-between mt-8">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                    ביטול
                </button>
                <button
                    onClick={handleDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    החתמה להורדה דף
                </button>
                <button
                    onClick={handleCredit}
                    className="bg-red-300 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    זיכוי חייל
                </button>
            </div>
        </div>
    );
};

export default SoldierCardPage;
