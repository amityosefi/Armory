import React, { useEffect } from 'react';

interface StatusMessageProps {
    isSuccess: boolean;
    message: string;
    onClose?: () => void;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ isSuccess, message, onClose }) => {
    useEffect(() => {
        if (!message) return;

        const timeout = setTimeout(() => {
            onClose?.();
        }, 5000);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div
            className={`relative mt-4 p-4 rounded text-sm font-medium shadow-md border transition-all ${
                isSuccess
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-red-100 text-red-800 border-red-300'
            }`}
        >
            {message}
            <button
                onClick={onClose}
                title="Dismiss (Esc)"
                className="absolute top-1 left-2 text-lg font-bold text-gray-500 hover:text-gray-800"
            >
                &times;
            </button>
        </div>
    );
};

export default StatusMessage;
