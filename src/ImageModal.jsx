import React, { useEffect } from 'react';

const ImageModal = ({ imageUrl, onClose }) => {
    useEffect(() => {
        if (!imageUrl) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [imageUrl, onClose]);

    if (!imageUrl) return null;

    return (
        <div className="modal-overlay image-preview-overlay" onClick={onClose} role="dialog" aria-label="画像拡大表示">
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                <button 
                    className="modal-close-btn image-preview-close" 
                    onClick={onClose}
                    aria-label="閉じる"
                    title="閉じる (ESC)"
                >
                    ×
                </button>
                <img 
                    src={imageUrl} 
                    alt="拡大画像プレビュー" 
                    className="modal-image-large zoomable-image" 
                    onClick={onClose}
                    title="クリックして閉じる"
                />
            </div>
        </div>
    );
};

export default ImageModal;
