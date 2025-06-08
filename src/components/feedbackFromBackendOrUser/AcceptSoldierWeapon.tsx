// ConfirmDialog.tsx
import React from "react";

interface AcceptSoldierProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const AcceptSoldier: React.FC<AcceptSoldierProps> = ({onConfirm, onCancel}) => {

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-md max-w-sm text-center">
                <p className="mb-4">
                    מספר אישי או פלאפון לא נמצא בדו"ח 1.<br/>ניתן לוודא מול השלישות שהחייל התחייל ואם כן לחץ אישור.
                </p>
                <div className="flex justify-around">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        onClick={onConfirm}
                    >
                        ניתן להחתים את החייל
                    </button>
                    <button
                        className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        onClick={onCancel}
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcceptSoldier;
