import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ErrorBanner = ({ error, onClose }) => {
    if (!error) return null;

    return (
        <div className="error-banner">
            <div className="error-content">
                <AlertCircle size={20} className="error-icon" />
                <span className="error-message">{error}</span>
            </div>
            {onClose && (
                <button onClick={onClose} className="error-close-btn" aria-label="エラーを閉じる">
                    <X size={18} />
                </button>
            )}
        </div>
    );
};

export default ErrorBanner;
