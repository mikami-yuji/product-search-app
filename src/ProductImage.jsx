import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCachedImage, cacheImage } from './utils/imageCache';

/**
 * @param {Object} props
 * @param {FileSystemDirectoryHandle} [props.dirHandle]
 * @param {string} props.filename
 * @param {string} [props.productCode]
 * @param {string} [props.productType]
 * @param {string} [props.materialName]
 * @param {string} [props.className]
 * @param {function} [props.onClick]
 * @returns {React.ReactElement}
 */
const ProductImage = ({ dirHandle, filename, className, onClick }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [error, setError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect();
                    }
                });
            },
            { rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let objectUrl = null;

        /**
         * @returns {Promise<void>}
         */
        const loadImage = async () => {
            // 1. キャッシュから読み込みを試みる (オフライン対応)
            try {
                const cachedBlob = await getCachedImage(filename);
                if (cachedBlob) {
                    objectUrl = URL.createObjectURL(cachedBlob);
                    setImageUrl(objectUrl);
                    setError(false);
                    return;
                }
            } catch (err) {
                console.error("Error loading cached image:", err);
            }

            // 2. Viteローカル開発サーバーからの自動配信を試みる
            if (filename) {
                try {
                    const response = await fetch(`/_local_images/${filename}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        // オフライン用にキャッシュを保存
                        try {
                            await cacheImage(filename, blob);
                        } catch (err) {
                            console.error("Failed to cache dev server image:", err);
                        }
                        objectUrl = URL.createObjectURL(blob);
                        setImageUrl(objectUrl);
                        setError(false);
                        return;
                    }
                } catch (err) {
                    console.log("Local dev server image not available, falling back:", err.message);
                }
            }

            // 3. ローカルの画像フォルダ (File System Access API) からの読み込みを試みる
            if (dirHandle && filename) {
                try {
                    const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
                    let fileHandle = null;

                    for (const ext of extensions) {
                        try {
                            try {
                                fileHandle = await dirHandle.getFileHandle(`${filename}${ext}`);
                                if (fileHandle) break;
                            } catch {
                                // ファイルが見つからない場合はスキップ
                            }

                            try {
                                fileHandle = await dirHandle.getFileHandle(`${filename}A${ext}`);
                                if (fileHandle) break;
                            } catch {
                                // ファイルが見つからない場合はスキップ
                            }
                        } catch {
                            // 例外は無視して次の候補を試す
                        }
                    }

                    if (fileHandle) {
                        const file = await fileHandle.getFile();

                        // オフライン用にキャッシュを保存
                        try {
                            await cacheImage(filename, file);
                        } catch (err) {
                            console.error("Failed to cache image:", err);
                        }

                        objectUrl = URL.createObjectURL(file);
                        setImageUrl(objectUrl);
                        setError(false);
                        return;
                    }
                } catch (err) {
                    console.error("Error loading local image:", err);
                }
            }

            // 画像が見つからなかった場合
            setError(true);
        };

        loadImage();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [dirHandle, filename, isVisible]);

    if (!isVisible) {
        return <div ref={imgRef} className={`product-image-container ${className || ''} placeholder`} style={{ minHeight: '100px', background: '#f0f0f0' }} />;
    }

    if (error || !imageUrl) {
        return <div className={`no-image ${className || ''}`}><ImageIcon size={24} /></div>;
    }

    return (
        <div
            className={`product-image-container ${className || ''}`}
            onClick={() => onClick && onClick(imageUrl)}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <img
                src={imageUrl}
                alt={filename}
                className="product-thumbnail"
                onError={(e) => {
                    console.error(`Failed to load image: ${imageUrl}`);
                    e.target.style.display = 'none';
                    setError(true);
                }}
            />
        </div>
    );
};

// Memoize to prevent unnecessary re-renders when props haven't changed
export default React.memo(ProductImage);
