import React, { useEffect, useRef } from "react";

interface ConfirmDialogProps {
    isGroupSheet: number;
    clickedCellInfo: { colName: string; value: string } | null;
    onConfirm: () => void;
    onCancel: () => void;
    onRemoveItem: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isGroupSheet, clickedCellInfo, onConfirm, onCancel, onRemoveItem }) => {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onCancel]);

    if (!clickedCellInfo) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
                ref={dialogRef}
                className="relative bg-white p-6 rounded shadow-md max-w-sm text-center border border-gray-300"
            >
                {/* כפתור X בצד שמאל למעלה */}
                <button
                    className="absolute top-2 left-2 text-gray-500 hover:text-gray-700 text-lg font-bold"
                    onClick={onCancel}
                    aria-label="Close"
                >
                    ×
                </button>

                <p className="mb-4 text-gray-800">
                    האם אתה בטוח שאתה רוצה
                    {isGroupSheet === 0 ? ' לזכות את האמצעי ' : isGroupSheet === 1 ? ' להעביר לתקול לסדנא את האמצעי ' : 'להעביר למלאי את האמצעי' }
                    <strong> {clickedCellInfo.colName} </strong>
                    <strong> {clickedCellInfo.value} </strong>?
                </p>
                <div className="flex justify-around mt-4">
                    <button
                        className="bg-green-500 text-white px-2 py-2 rounded hover:bg-green-600"
                        onClick={onConfirm}
                    >
                        {isGroupSheet === 0 ? 'כן, לזכות את האמצעי' : isGroupSheet === 1 ? 'להעביר לתקול לסדנא' : 'להעביר למלאי'}
                    </button>
                    {
                        isGroupSheet === 1 && (
                            <button
                                className="bg-red-500 text-white px-2 py-2 rounded hover:bg-red-600"
                                onClick={onRemoveItem}
                            >
                                למחוק אמצעי
                            </button>
                        )
                    }
                    <button
                        className="bg-gray-300 px-2 py-2 rounded hover:bg-gray-400"
                        onClick={onCancel}
                    >
                        לא
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
