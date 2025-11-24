import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

const ProductDetailsModal = ({ product, onClose, dirHandle, onNext, onPrev, hasNext, hasPrev }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [availableImages, setAvailableImages] = useState([]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && hasNext) {
                onNext();
            } else if (e.key === 'ArrowLeft' && hasPrev) {
                onPrev();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasNext, hasPrev, onNext, onPrev, onClose]);

    useEffect(() => {
        const checkImages = async () => {
            if (!product) return;

            const images = [];
            const suffixes = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

            if (dirHandle) {
                // Check local images
                for (const suffix of suffixes) {
                    for (const ext of extensions) {
                        try {
                            const filename = `${product['受注№']}${suffix}${ext}`;
                            const fileHandle = await dirHandle.getFileHandle(filename);
                            if (fileHandle) {
                                const file = await fileHandle.getFile();
                                const url = URL.createObjectURL(file);
                                images.push({ url, suffix, source: 'local' });
                                break; // Found this suffix, move to next
                            }
                        } catch (e) {
                            // File doesn't exist, continue
                        }
                    }
                }
            }

            setAvailableImages(images);
            setCurrentImageIndex(0);
        };

        checkImages();

        return () => {
            // Cleanup local URLs
            availableImages.forEach(img => {
                if (img.source === 'local') {
                    URL.revokeObjectURL(img.url);
                }
            });
        };
    }, [product, dirHandle]);

    const handlePrevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : availableImages.length - 1));
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev < availableImages.length - 1 ? prev + 1 : 0));
    };

    if (!product) return null;

    const currentImage = availableImages[currentImageIndex];

    return (
        <div className="modal-overlay" onClick={onClose}>
            {hasPrev && (
                <button
                    className="product-nav-btn prev"
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    title="前の商品 (←)"
                >
                    <ChevronLeft size={48} />
                </button>
            )}

            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <div className="modal-body">
                    <div className="modal-image">
                        {availableImages.length > 0 ? (
                            <>
                                {currentImage ? (
                                    <img
                                        src={currentImage.url}
                                        alt={`${product['タイトル']} - ${currentImage.suffix}`}
                                        className="modal-product-image"
                                    />
                                ) : (
                                    <div className="no-image"><ImageIcon size={64} /></div>
                                )}

                                {availableImages.length > 1 && (
                                    <>
                                        <button className="image-nav-btn prev" onClick={handlePrevImage}>
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button className="image-nav-btn next" onClick={handleNextImage}>
                                            <ChevronRight size={24} />
                                        </button>
                                        <div className="image-indicator">
                                            {currentImageIndex + 1} / {availableImages.length}
                                            {currentImage && ` (${currentImage.suffix})`}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="no-image"><ImageIcon size={64} /></div>
                        )}
                    </div>
                    <div className="modal-details">
                        <h2 className="modal-title">{product['種別'] === '既製品' ? product['商品名'] : product['タイトル']}</h2>

                        {/* 基本情報 */}
                        <div className="info-section">
                            <h3 className="section-title">基本情報</h3>
                            <div className="info-grid">
                                <div className="info-row">
                                    <span className="info-label">受注№</span>
                                    <span className="info-value">{product['受注№']}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">種別</span>
                                    <span className="info-value">{product['種別']}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">商品コード</span>
                                    <span className="info-value">{product['商品コード']}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">JANコード</span>
                                    <span className="info-value">{product['JANコード']}</span>
                                </div>
                            </div>
                        </div>

                        {/* 仕様 */}
                        <div className="info-section">
                            <h3 className="section-title">仕様</h3>
                            <div className="info-grid">
                                <div className="info-row">
                                    <span className="info-label">形状</span>
                                    <span className="info-value">{product['形状']}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">重量</span>
                                    <span className="info-value">{product['重量']}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">材質名称</span>
                                    <span className="info-value">{product['材質名称']}</span>
                                </div>
                            </div>
                        </div>

                        {/* 印刷情報 */}
                        {(product['表色数'] || product['裏色数'] || product['総色数'] || product['印刷代']) && (
                            <div className="info-section">
                                <h3 className="section-title">印刷情報</h3>
                                <div className="info-grid">
                                    {product['表色数'] && (
                                        <div className="info-row">
                                            <span className="info-label">表色数</span>
                                            <span className="info-value">{product['表色数']}</span>
                                        </div>
                                    )}
                                    {product['裏色数'] && (
                                        <div className="info-row">
                                            <span className="info-label">裏色数</span>
                                            <span className="info-value">{product['裏色数']}</span>
                                        </div>
                                    )}
                                    {product['総色数'] && (
                                        <div className="info-row">
                                            <span className="info-label">総色数</span>
                                            <span className="info-value">{product['総色数']}</span>
                                        </div>
                                    )}
                                    {product['印刷代'] && (
                                        <div className="info-row">
                                            <span className="info-label">印刷代</span>
                                            <span className="info-value">{product['印刷代']}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 価格・数量 */}
                        <div className="info-section highlight">
                            <h3 className="section-title">価格・数量</h3>
                            <div className="info-grid">
                                <div className="info-row highlight">
                                    <span className="info-label">受注数</span>
                                    <span className="info-value">{product['受注数']}</span>
                                </div>
                                <div className="info-row highlight">
                                    <span className="info-label">単価</span>
                                    <span className="info-value">
                                        {product['単価'] ? `¥${parseFloat(product['単価']).toLocaleString()}` : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* その他 */}
                        <div className="info-section">
                            <h3 className="section-title">その他</h3>
                            <div className="info-grid">
                                {product['直送先名称'] && (
                                    <div className="info-row">
                                        <span className="info-label">直送先名称</span>
                                        <span className="info-value">{product['直送先名称']}</span>
                                    </div>
                                )}
                                {product['最新受注日'] && (
                                    <div className="info-row">
                                        <span className="info-label">最新受注日</span>
                                        <span className="info-value">{product['最新受注日']}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {hasNext && (
                <button
                    className="product-nav-btn next"
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    title="次の商品 (→)"
                >
                    <ChevronRight size={48} />
                </button>
            )}
        </div>
    );
};

export default ProductDetailsModal;
