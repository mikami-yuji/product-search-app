import React from 'react';

const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <img src={imageUrl} alt="拡大画像" className="modal-image-large" />
            </div>
        </div>
    );
};

export default ImageModal;
