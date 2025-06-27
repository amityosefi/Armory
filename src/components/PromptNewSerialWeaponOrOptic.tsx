import React, {useEffect, useState, useRef} from "react";
import {useGoogleSheetData} from "./hooks/useGoogleSheetData";

interface promptNewSerialWeaponOrOpticProps {
    accessToken: string;
    setChosenWeaponOrOptic: (assign: string) => void;
    chosenWeaponOrOptic: string
    newSerialWeaponOrOpticName: string;
    onConfirm: () => void;
    onCancel: () => void;
    setNewSerialWeaponOrOpticName: (assign: string) => void;
    sheetName: string;
}

const PromptNewSerialWeaponOrOptic: React.FC<promptNewSerialWeaponOrOpticProps> = ({
                                                                                       accessToken,
                                                                                       setChosenWeaponOrOptic,
                                                                                       chosenWeaponOrOptic,
                                                                                       newSerialWeaponOrOpticName,
                                                                                       onConfirm,
                                                                                       onCancel,
                                                                                       setNewSerialWeaponOrOpticName,
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

    const [serialNumbers, setSerialNumbers] = useState([]);

    useEffect(() => {
        if (!chosenWeaponOrOptic || !weaponsOrOptics?.values?.length) {
            setSerialNumbers([]);
            return;
        }

        const headers = weaponsOrOptics.values[0];
        const colIndex = headers.indexOf(chosenWeaponOrOptic);
        if (colIndex === -1) {
            setSerialNumbers([]);
            return;
        }

        const serials = weaponsOrOptics.values
            .slice(1)
            .map((row: any[]) => (row[colIndex]));

        setSerialNumbers(serials);
    }, [chosenWeaponOrOptic, weaponsOrOptics]);

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
        // @ts-ignore
        return newSerialWeaponOrOpticName.trim() && chosenWeaponOrOptic && (['M5', 'מפרו', 'מארס', 'מצפן', 'משקפת'].includes(chosenWeaponOrOptic) || !serialNumbers.includes(newSerialWeaponOrOpticName));
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={modalRef} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-lg font-bold mb-4 text-right">החתמת חייל</h2>
                <div className="space-y-4">

                    {/* Weapon Type */}
                    <div>
                        <label className="block text-right font-medium">סוג נשק</label>
                        <select
                            className="w-full border p-2 rounded text-right"
                            value={chosenWeaponOrOptic}
                            onChange={(e) =>
                                setChosenWeaponOrOptic(e.target.value)
                            }
                        >
                            <option value="">{sheetName === "מלאי נשקיה" ? 'בחר סוג נשק' : 'בחר סוג אמרל'}</option>
                            {weaponsOrOptics?.values?.[0]?.map((w: string, i: number) => (
                                <option key={i} value={w}>
                                    {w}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/*serial number */}
                    <div onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault(); // optional: prevent form submit or newline
                            onConfirm();
                        }
                    }}>
                        <label
                            className="block text-right font-medium">{sheetName === "מלאי נשקיה" ? 'מסד נשק חדש' : 'מסד אמרל חדש'}</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded text-right"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={newSerialWeaponOrOpticName}
                            onChange={(e) => {
                                setNewSerialWeaponOrOpticName ? setNewSerialWeaponOrOpticName(e.target.value) : ''
                            }
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

export default PromptNewSerialWeaponOrOptic;
