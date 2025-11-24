import { useState } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, show: false }));
    };

    return {
        toast,
        showToast,
        hideToast
    };
};
