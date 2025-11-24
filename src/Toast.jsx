import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const bgColor = type === 'success' ? 'bg-white' : 'bg-white';
    const borderColor = type === 'success' ? 'border-l-4 border-[#067D62]' : 'border-l-4 border-[#CC0C39]';
    const iconColor = type === 'success' ? 'text-[#067D62]' : 'text-[#CC0C39]';

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] flex items-center gap-3 px-4 py-3 rounded shadow-lg ${bgColor} ${borderColor} min-w-[300px] max-w-[90vw] animate-slide-down`}>
            {type === 'success' ? (
                <CheckCircle className={iconColor} size={20} />
            ) : (
                <AlertCircle className={iconColor} size={20} />
            )}
            <p className="text-sm font-medium text-gray-800 flex-1">{message}</p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
