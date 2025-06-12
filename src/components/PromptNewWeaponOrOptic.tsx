import React, {useEffect, useState, useRef} from "react";
import {useGoogleSheetData} from "./hooks/useGoogleSheetData";

interface promptNewWeaponOrOpticProps {
    accessToken: string;
    newWeaponOrOpticName: string;
    onConfirm: () => void;
    onCancel: () => void;
    setNewWeaponOrOpticName?: (assign: string) => void;
    sheetName: string;
}

const PromptNewWeaponOrOptic: React.FC<promptNewWeaponOrOpticProps> = ({
                                                                           accessToken,
                                                                           newWeaponOrOpticName,
                                                                           onConfirm,
                                                                           onCancel,
                                                                           setNewWeaponOrOpticName,
                                                                           sheetName
                                                                       }) => {
    const {data: weaponsOrOptics} = useGoogleSheetData(
        {
            accessToken,
            range: sheetName,
        },
        {
            processData: false,
            enabled: !!accessToken,
        }
    );

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onCancel]);


    const isFormValid = () => {
        return newWeaponOrOpticName.trim() && !weaponsOrOptics.values[0].includes(newWeaponOrOpticName);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={modalRef} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-lg font-bold mb-4 text-right">החתמת חייל</h2>
                <div className="space-y-4">
                    {/* serial number */}
                    <div>
                        <label
                            className="block text-right font-medium">{sheetName === "מלאי נשקיה" ? 'סוג נשק חדש' : 'סוג אמרל חדש'}</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded text-right"
                            value={newWeaponOrOpticName}
                            onChange={(e) =>
                                setNewWeaponOrOpticName ? setNewWeaponOrOpticName(e.target.value) : ''
                            }
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-between mt-6">
                        <button
                            type="button"
                            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            onClick={onCancel}
                        >
                            ביטול
                        </button>
                        <button
                            type="button"
                            disabled={!isFormValid()}
                            className={`px-4 py-2 rounded text-white ${
                                isFormValid() ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
                            }`}
                            onClick={onConfirm}
                        >
                            {sheetName === "מלאי נשקיה" ? 'אשר סוג נשק חדש' : 'אשר סוג אמרל חדש'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptNewWeaponOrOptic;
