import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCachedImage, cacheImage } from './utils/imageCache';
import { findImageFileHandle } from './utils/imageLoader';
import { generateOrderNoVariants, normalizeOrderNumber } from './utils/imageKeyUtils';

/** @type {WeakMap<File, string>} */
const objectUrlCache = new WeakMap();

/**
 * Fileオブジェクトからキャッシュ済みのObject URLを取得、または生成します。
 * @param {File} file
 * @returns {string} Object URL
 */
const getOrCreateObjectURL = (file) => {
    if (objectUrlCache.has(file)) {
        return objectUrlCache.get(file);
    }
    const url = URL.createObjectURL(file);
    objectUrlCache.set(file, url);
    return url;
};

/**
 * @typedef {Object} ProductImageProps
 * @property {FileSystemDirectoryHandle} [dirHandle] - ディレクトリハンドル
 * @property {Map<string, File>} [imageFilesMap] - メモリ上の画像ファイルマップ（スマホ用）
 * @property {string} filename - 画像ファイル名（通常は受注№）
 * @property {string} [customerFileName] - 顧客ファイル名（例: "16152_トーベイ（株）.xlsx"）
 * @property {string} [productCode] - 商品コード
 * @property {string} [className] - CSSクラス名
 * @property {function} [onClick] - クリック時のコールバック
 */

/**
 * 商品画像を表示するコンポーネント。キャッシュ、ローカルサーバー、File System APIからの非同期ロードを処理します。
 * PCの一括フォルダ画像とスマホの顧客別サブフォルダ画像の両方に最適化されています。
 * 
 * @param {ProductImageProps} props - プロパティ
 * @returns {React.ReactElement} - レンダリング要素
 */
const ProductImage = ({ dirHandle, imageFilesMap, filename, customerFileName, productCode, className, onClick }) => {
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
            { rootMargin: '100px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    // imageUrl の更新時に古い blob URL を安全に破棄するカスタム関数
    const updateImageUrl = (newUrl) => {
        setIsLoaded(false);
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

        const loadImage = async () => {
            updateImageUrl(null);
            setError(false);
            const cleanKey = (val) => {
                if (!val) return '';
                return String(val)
                    .trim()
                    .replace(/,/g, '')
                    .replace(/\.0+$/, '')
                    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
            };

            const searchKeys = Array.from(new Set([
                cleanKey(filename),
                String(filename || '').trim()
            ])).filter(Boolean);

            // 0. メモリ内のファイルマップ (スマホ・受注Noのみ超高速O(1)探索)
            if (imageFilesMap && imageFilesMap.size > 0 && filename) {
                const searchVariants = generateOrderNoVariants(filename);
                for (const cand of searchVariants) {
                    const file = imageFilesMap.get(cand);
                    if (file) {
                        const objectUrl = getOrCreateObjectURL(file);
                        if (isCancelled) return;
                        updateImageUrl(objectUrl);
                        setError(false);
                        return;
                    }
                }
            }

            // 1. キャッシュから読み込みを試みる
            for (const key of searchKeys) {
                try {
                    const variants = [
                        key,
                        `${key}A`,
                        `${key}a`,
                        `${key}_1`,
                        `${key}_A`,
                        `${key}-1`,
                        `${key}-A`
                    ];
                    for (const variant of variants) {
                        const cachedBlob = await getCachedImage(variant);
                        if (isCancelled) return;

                        if (cachedBlob && cachedBlob instanceof Blob && cachedBlob.type.startsWith('image/')) {
                            const objectUrl = URL.createObjectURL(cachedBlob);
                            if (isCancelled) {
                                URL.revokeObjectURL(objectUrl);
                                return;
                            }
                            updateImageUrl(objectUrl);
                            setError(false);
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Error loading cached image:", err);
                }
            }

            // 2. ローカル開発サーバーからの自動配信を試みる
            for (const key of searchKeys) {
                try {
                    const response = await fetch(`/_local_images/${key}`);
                    if (isCancelled) return;

                    if (response.ok) {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.startsWith('image/')) {
                            const blob = await response.blob();
                            try {
                                await cacheImage(key, blob);
                            } catch {
                                // スキップ
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
                        }
                    }
                } catch {
                    // スキップ
                }
            }

            // 3. ローカルの画像フォルダ (File System Access API) から探索（PC直下一括＆スマホ顧客サブフォルダ両対応）
            if (dirHandle) {
                for (const key of searchKeys) {
                    try {
                        const fileHandle = await findImageFileHandle(dirHandle, key);
                        if (isCancelled) return;

                        if (fileHandle) {
                            const file = await fileHandle.getFile();
                            try {
                                await cacheImage(key, file);
                            } catch {
                                // スキップ
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
                        console.error("Error loading local image from dirHandle:", err);
                    }
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
    }, [dirHandle, imageFilesMap, filename, customerFileName, productCode, isVisible]);

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
                alt={filename || productCode}
                className={`product-thumbnail image-fade-in ${isLoaded ? 'loaded' : ''}`}
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    console.error(`Failed to load image for ${filename || productCode}`);
                    setError(true);
                }}
            />
        </div>
    );
};

export default React.memo(ProductImage);
