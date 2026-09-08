import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import './product-details-modal.css';

/**
 * 商品の詳細情報を表示するモーダルコンポーネント。
 * キーボード（左右矢印キーでの商品移動、ESCキーでの終了）に対応。
 * 
 * @param {Object} props
 * @param {import('./types/product').Product} props.product - 対象の商品オブジェクト
 * @param {() => void} props.onClose - モーダルを閉じるイベントハンドラ
 * @param {FileSystemDirectoryHandle} [props.dirHandle] - 画像フォルダのディレクトリハンドル
 * @param {() => void} props.onNext - 次の商品を表示するイベントハンドラ
 * @param {() => void} props.onPrev - 前の商品を表示するイベントハンドラ
 * @param {boolean} props.hasNext - 次の商品があるかどうか
 * @param {boolean} props.hasPrev - 前の商品があるかどうか
 * @returns {React.JSX.Element | null} モーダルのJSX要素
 */
const ProductDetailsModal = ({ product, onClose, dirHandle, imageFilesMap, customerFileName, onNext, onPrev, hasNext, hasPrev }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [availableImages, setAvailableImages] = useState([]);
    const [isSwitching, setIsSwitching] = useState(false);

    // Trigger fade animation on image or product change
    useEffect(() => {
        let timer;
        const animFrame = requestAnimationFrame(() => {
            setIsSwitching(true);
            timer = setTimeout(() => setIsSwitching(false), 200);
        });
        return () => {
            cancelAnimationFrame(animFrame);
            if (timer) clearTimeout(timer);
        };
    }, [currentImageIndex, product]);

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
        let isCancelled = false;
        /** @type {string[]} */
        const createdUrls = [];

        /**
         * 対象商品の画像が存在するかどうかをローカルフォルダまたはスマホメモリマップから非同期にチェックします。
         * 
         * @returns {Promise<void>}
         */
        const checkImages = async () => {
            if (!product) return;

            /** @type {Array<{url: string, suffix: string, source: string}>} */
            const images = [];
            const suffixes = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.webp', '.WEBP'];

            // 1. スマホ環境（メモリマップ）からの高速探索
            if (imageFilesMap && imageFilesMap.size > 0) {
                const customerPrefix = customerFileName ? customerFileName.replace(/\.[^/.]+$/, '').trim().toLowerCase() : '';
                const codeMatch = customerPrefix.match(/^([0-9a-z]+)/i);
                const customerCode = codeMatch ? codeMatch[1].toLowerCase() : '';

                const prefixOptions = Array.from(new Set([
                    customerPrefix ? `${customerPrefix}/` : '',
                    customerCode ? `${customerCode}/` : '',
                    customerCode ? `${customerCode}_` : '',
                    customerPrefix ? `${customerPrefix}_` : '',
                    ''
                ])).filter(Boolean);
                if (!prefixOptions.includes('')) prefixOptions.push('');

                const orderNo = String(product['受注№'] || '').trim();

                for (const suffix of suffixes) {
                    if (isCancelled) break;
                    const baseCand = `${orderNo}${suffix}`;
                    const lowerCand = baseCand.toLowerCase();
                    const candidates = Array.from(new Set([baseCand, lowerCand]));

                    let foundFile = null;
                    for (const prefix of prefixOptions) {
                        for (const cand of candidates) {
                            for (const ext of extensions) {
                                const targetKey = `${prefix}${cand}${ext}`;
                                const file = imageFilesMap.get(targetKey);
                                if (file) {
                                    foundFile = file;
                                    break;
                                }
                            }
                            if (foundFile) break;
                        }
                        if (foundFile) break;
                    }

                    if (foundFile) {
                        const url = URL.createObjectURL(foundFile);
                        createdUrls.push(url);
                        images.push({ url, suffix: suffix || 'メイン', source: 'memory' });
                    }
                }
            } else if (dirHandle) {
                // 2. PC環境（File System Access API）からの探索
                for (const suffix of suffixes) {
                    for (const ext of extensions) {
                        if (isCancelled) break;
                        try {
                            const filename = `${product['受注№']}${suffix}${ext}`;
                            const fileHandle = await dirHandle.getFileHandle(filename);
                            if (isCancelled) break;

                            if (fileHandle) {
                                const file = await fileHandle.getFile();
                                if (isCancelled) break;

                                const url = URL.createObjectURL(file);
                                if (isCancelled) {
                                    URL.revokeObjectURL(url);
                                    break;
                                }
                                createdUrls.push(url);
                                images.push({ url, suffix: suffix || 'メイン', source: 'local' });
                                break; // このsuffixが見つかったので次のsuffixへ
                            }
                        } catch {
                            // ファイルが存在しない場合は継続
                        }
                    }
                }
            }

            if (isCancelled) {
                createdUrls.forEach(url => URL.revokeObjectURL(url));
                return;
            }

            setAvailableImages((prevImages) => {
                prevImages.forEach((img) => {
                    if (img.url && img.url.startsWith('blob:')) {
                        URL.revokeObjectURL(img.url);
                    }
                });
                return images;
            });
            setCurrentImageIndex(0);
        };

        checkImages();

        return () => {
            isCancelled = true;
            createdUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [product, dirHandle, imageFilesMap, customerFileName]);

    // モーダル全体がアンマウントされた際のクリーンアップ
    useEffect(() => {
        return () => {
            setAvailableImages((prevImages) => {
                prevImages.forEach((img) => {
                    if (img.url && img.url.startsWith('blob:')) {
                        URL.revokeObjectURL(img.url);
                    }
                });
                return [];
            });
        };
    }, []);

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
        <div className="product-details-modal-overlay" onClick={onClose}>
            {hasPrev && (
                <button
                    className="product-nav-btn prev"
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    title="前の商品 (←)"
                >
                    <ChevronLeft size={48} />
                </button>
            )}

            <div className="product-details-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <div className="product-details-layout">
                    <div className="product-details-image-section">
                        {availableImages.length > 0 ? (
                            <div className="product-details-main-image-container">
                                {currentImage ? (
                                    <img
                                        src={currentImage.url}
                                        alt={`${product['タイトル']} - ${currentImage.suffix}`}
                                        className={`product-details-image ${isSwitching ? 'switching' : ''}`}
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
                            </div>
                        ) : (
                            <div className="no-image"><ImageIcon size={64} /></div>
                        )}
                    </div>
                    <div className="product-details-info-section">
                        <div className="modal-header-container">
                            <span className={`product-badge ${product['種別'] === '既製品' ? 'ready-made' : 'custom-made'}`}>
                                {product['種別']}
                            </span>
                            <h2 className="modal-title">
                                {product['種別'] === '既製品' ? product['商品名'] : (product['タイトル'] || product['商品名'])}
                            </h2>
                        </div>

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
                            <div className="info-grid single-column">
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
                        {/* 印刷情報 */}
                        {(product['表色数'] != null || product['裏色数'] != null || product['総色数'] != null) && (
                            <div className="info-section">
                                <h3 className="section-title">印刷情報</h3>
                                <div className="info-grid single-column">
                                    {product['表色数'] != null && (
                                        <div className="info-row">
                                            <span className="info-label">表色数</span>
                                            <span className="info-value">{product['表色数']}</span>
                                        </div>
                                    )}
                                    {product['裏色数'] != null && (
                                        <div className="info-row">
                                            <span className="info-label">裏色数</span>
                                            <span className="info-value">{product['裏色数']}</span>
                                        </div>
                                    )}
                                    {product['総色数'] != null && (
                                        <div className="info-row">
                                            <span className="info-label">総色数</span>
                                            <span className="info-value">{product['総色数']}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 価格・数量 */}
                        <div className="info-section highlight">
                            <h3 className="section-title">価格・数量</h3>
                            <div className="info-grid single-column">
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
                                {product['印刷代'] != null && (
                                    <div className="info-row highlight">
                                        <span className="info-label">印刷代</span>
                                        <span className="info-value">
                                            {product['印刷代'] ? `¥${parseFloat(product['印刷代']).toLocaleString()}` : '-'}
                                        </span>
                                    </div>
                                )}
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
