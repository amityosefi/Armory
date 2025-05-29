// ConfirmDialog.tsx
import React from "react";

interface ConfirmDialogProps {
    show: boolean;
    clickedCellInfo: { colName: string; value: string } | null;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({show, clickedCellInfo, onConfirm, onCancel}) => {
    if (!show || !clickedCellInfo) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-md max-w-sm text-center">
                <p className="mb-4">
                    האם אתה בטוח שאתה רוצה לזכות את האמצעי
                    <strong> {clickedCellInfo.colName} </strong>
                    <strong>{clickedCellInfo.value}</strong>?
                </p>
                <div className="flex justify-around">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        onClick={onConfirm}
                    >
                        כן, לזכות את האמצעי
                    </button>
                    <button
                        className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
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
