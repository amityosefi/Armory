import React, { useEffect, useRef, useState } from "react";

type AddOpticToGroupColumnProps = {
    headerGroup: string[];
    opticsHeaders: string[];
    chosenNewOptic: string;
    setChosenNewOptic: (val: string) => void;
    onClose: () => void;
    onConfirm: () => void;
};

const AddOpticToGroupColumn: React.FC<AddOpticToGroupColumnProps> = ({
                                                                         headerGroup,
                                                                         opticsHeaders,
                                                                         chosenNewOptic,
                                                                         setChosenNewOptic,
                                                                         onClose,
                                                                         onConfirm,
                                                                     }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    const availableOptions = opticsHeaders.filter(
        (optic) => !headerGroup.includes(optic) && optic !== "M5" && optic !== "מפרו" && optic !== 'מארס'
    );

    const handleMouseDownOutside = (e: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleMouseDownOutside);
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);

        return () => {
            document.removeEventListener("mousedown", handleMouseDownOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    const handleConfirm = () => {
        if (!chosenNewOptic) return;
        setChosenNewOptic(chosenNewOptic);
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
                ref={modalRef}
                className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-screen overflow-y-auto"
            >
                <h2 className="text-lg font-bold mb-4 text-right">הוספת כוונת</h2>

                <div className="mb-4">
                    <label className="block mb-2 text-right font-medium">בחר כוונת:</label>
                    <select
                        className="w-full border border-gray-300 rounded px-3 py-2 text-right"
                        value={chosenNewOptic}
                        onChange={(e) => setChosenNewOptic(e.target.value)}
                    >
                        <option value="" disabled>
                            בחר כוונת...
                        </option>
                        {availableOptions.map((optic) => (
                            <option key={optic} value={optic}>
                                {optic}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-between">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`font-bold py-2 px-4 rounded text-white ${
                            chosenNewOptic
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-blue-300 cursor-not-allowed"
                        }`}
                        disabled={!chosenNewOptic}
                    >
                        אישור
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddOpticToGroupColumn;
