import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCachedImage, cacheImage } from './utils/imageCache';

/**
 * @typedef {Object} ProductImageProps
 * @property {FileSystemDirectoryHandle} [dirHandle] - ディレクトリハンドル
 * @property {string} filename - 画像ファイル名
 * @property {string} [productCode] - 商品コード
 * @property {string} [productType] - 商品種別
 * @property {string} [materialName] - 材質名称
 * @property {string} [className] - CSSクラス名
 * @property {function} [onClick] - クリック時のコールバック
 */

/**
 * 商品画像を表示するコンポーネント。キャッシュ、ローカルサーバー、File System APIからの非同期ロードを処理します。
 * 
 * @param {ProductImageProps} props - プロパティ
 * @returns {React.ReactElement} - レンダリング要素
 */
const ProductImage = ({ dirHandle, filename, className, onClick }) => {
    /** @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]} */
    const [imageUrl, setImageUrl] = useState(null);
    /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
    const [error, setError] = useState(false);
    /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
    const [isVisible, setIsVisible] = useState(false);
    /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
    const [isLoaded, setIsLoaded] = useState(false);
    /** @type {React.RefObject<HTMLDivElement>} */
    const imgRef = useRef(null);

    // Reset loaded state on image source change
    useEffect(() => {
        const animFrame = requestAnimationFrame(() => {
            setIsLoaded(false);
        });
        return () => cancelAnimationFrame(animFrame);
    }, [imageUrl, filename]);

    useEffect(() => {
        /** @type {IntersectionObserver} */
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

        return () => {
            observer.disconnect();
        };
    }, []);

    // imageUrl の更新時に古い blob URL を安全に破棄するカスタム関数
    /**
     * 画像URLステートを更新し、古い blob: URL があれば適切に解放します。
     * 
     * @param {string|null} newUrl - 新しい画像URL
     * @returns {void}
     */
    const updateImageUrl = (newUrl) => {
        setImageUrl((prevUrl) => {
            if (prevUrl && prevUrl.startsWith('blob:') && prevUrl !== newUrl) {
                URL.revokeObjectURL(prevUrl);
            }
            return newUrl;
        });
    };

    // コンポーネントが完全にアンマウントされた際のクリーンアップ
    useEffect(() => {
        return () => {
            setImageUrl((prevUrl) => {
                if (prevUrl && prevUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(prevUrl);
                }
                return null;
            });
        };
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let isCancelled = false;

        /**
         * 各種ソースから画像を非同期でロードします。
         * 
         * @returns {Promise<void>}
         */
        const loadImage = async () => {
            // 1. キャッシュから読み込みを試みる (オフライン対応)
            try {
                const cachedBlob = await getCachedImage(filename);
                if (isCancelled) return;

                // キャッシュデータの健全性チェック (画像データであること)
                if (cachedBlob && cachedBlob instanceof Blob && cachedBlob.type.startsWith('image/')) {
                    const objectUrl = URL.createObjectURL(cachedBlob);
                    if (isCancelled) {
                        URL.revokeObjectURL(objectUrl);
                        return;
                    }
                    updateImageUrl(objectUrl);
                    setError(false);
                    return;
                } else if (cachedBlob) {
                    console.warn(`Invalid cached image detected for ${filename}. Cached item is not a valid image Blob.`, cachedBlob);
                }
            } catch (err) {
                console.error("Error loading cached image:", err);
            }

            // 2. Viteローカル開発サーバーからの自動配信を試みる
            if (filename) {
                try {
                    const response = await fetch(`/_local_images/${filename}`);
                    if (isCancelled) return;

                    if (response.ok) {
                        // 本番環境での SPA rewrite による HTML データ誤認を防ぐため Content-Type を厳格に確認
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.startsWith('image/')) {
                            const blob = await response.blob();
                            // オフライン用にキャッシュを保存
                            try {
                                await cacheImage(filename, blob);
                            } catch (err) {
                                console.error("Failed to cache dev server image:", err);
                            }
                            if (isCancelled) return;

                            const objectUrl = URL.createObjectURL(blob);
                            if (isCancelled) {
                                URL.revokeObjectURL(objectUrl);
                                return;
                            }
                            updateImageUrl(objectUrl);
                            setError(false);
                            return;
                        } else {
                            console.log(`Local dev server response for ${filename} is not an image. Content-Type:`, contentType);
                        }
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
                        if (isCancelled) return;
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

                    if (isCancelled) return;

                    if (fileHandle) {
                        const file = await fileHandle.getFile();

                        // オフライン用にキャッシュを保存
                        try {
                            await cacheImage(filename, file);
                        } catch (err) {
                            console.error("Failed to cache image:", err);
                        }
                        if (isCancelled) return;

                        const objectUrl = URL.createObjectURL(file);
                        if (isCancelled) {
                            URL.revokeObjectURL(objectUrl);
                            return;
                        }
                        updateImageUrl(objectUrl);
                        setError(false);
                        return;
                    }
                } catch (err) {
                    console.error("Error loading local image:", err);
                }
            }

            if (!isCancelled) {
                setError(true);
            }
        };

        loadImage();

        return () => {
            isCancelled = true;
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
                className={`product-thumbnail image-fade-in ${isLoaded ? 'loaded' : ''}`}
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    console.error(`Failed to load image: ${imageUrl}`);
                    setError(true);
                }}
            />
        </div>
    );
};

// Memoize to prevent unnecessary re-renders when props haven't changed
export default React.memo(ProductImage);
