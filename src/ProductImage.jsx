import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCachedImage, cacheImage } from './utils/imageCache';
import { findImageFileHandle } from './utils/imageLoader';
import { generateOrderNoVariants } from './utils/imageKeyUtils';

/** @type {WeakMap<File, string>} */
const objectUrlCache = new WeakMap();

/**
 * Fileオブジェクトから表示用URL (Blob URL または Data URL) を取得します。
 * iOS Safari等のBlob URLバグ対策として FileReader による Data URL 読み込みもサポート。
 * @param {File} file
 * @returns {Promise<string>}
 */
const getFileImageUrl = (file) => {
    return new Promise((resolve) => {
        if (!file) {
            resolve('');
            return;
        }
        if (objectUrlCache.has(file)) {
            resolve(objectUrlCache.get(file));
            return;
        }
        try {
            const url = URL.createObjectURL(file);
            if (url && url.startsWith('blob:')) {
                objectUrlCache.set(file, url);
                resolve(url);
                return;
            }
        } catch {
            // スキップして FileReader へフォールバック
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            if (dataUrl) {
                objectUrlCache.set(file, dataUrl);
            }
            resolve(dataUrl);
        };
        reader.onerror = () => {
            resolve('');
        };
        reader.readAsDataURL(file);
    });
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
const ProductImage = ({ dirHandle, imageFilesMap, filename, customerFileName, driveFolderUrl, driveImagesMap, className, onClick }) => {
    /** @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]} */
    const [imageUrl, setImageUrl] = useState(null);
    /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
    const [error, setError] = useState(false);
    /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} */
    const [isVisible, setIsVisible] = useState(false);
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
        // スマホでメモリマップ(imageFilesMap)またはDrive連携が存在する場合は遅延ロードの不発を防ぐため即時読み込みを許可
        const shouldLoadDirectly = Boolean(
            (imageFilesMap && imageFilesMap.size > 0) || 
            driveFolderUrl || 
            (driveImagesMap && driveImagesMap.size > 0)
        );
        if (!isVisible && !shouldLoadDirectly) return;

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

            // 0. メモリ内のファイルマップ (スマホ・選択中顧客サブフォルダ優先O(1)探索) - 受注№のみで検索
            if (imageFilesMap && imageFilesMap.size > 0 && filename) {
                const searchVariants = generateOrderNoVariants(filename);
                const extensions = ['', '.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.webp', '.WEBP'];

                // 選択中の顧客名・顧客コードを抽出
                const customerPrefix = customerFileName ? customerFileName.replace(/\.[^/.]+$/, '').trim().toLowerCase() : '';
                const codeMatch = customerPrefix.match(/^([0-9a-z]+)/i);
                const customerCode = codeMatch ? codeMatch[1].toLowerCase() : '';

                // 検索プレフィックス候補（優先順: 顧客フォルダ名/ > 顧客コード/ > アンダースコア連結 > 単体キー）
                const prefixOptions = Array.from(new Set([
                    customerPrefix ? `${customerPrefix}/` : '',
                    customerCode ? `${customerCode}/` : '',
                    customerCode ? `${customerCode}_` : '',
                    customerPrefix ? `${customerPrefix}_` : '',
                    ''
                ])).filter(Boolean);
                if (!prefixOptions.includes('')) prefixOptions.push('');

                for (const prefix of prefixOptions) {
                    for (const cand of searchVariants) {
                        for (const ext of extensions) {
                            const targetKey = `${prefix}${cand}${ext}`;
                            const file = imageFilesMap.get(targetKey);
                            if (file) {
                                const objectUrl = await getFileImageUrl(file);
                                if (isCancelled) return;
                                if (objectUrl) {
                                    updateImageUrl(objectUrl);
                                    setError(false);
                                    return;
                                }
                            }
                        }
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

            // 4. Google Drive 共有画像フォールバック（CORSブロックを回避し即時描画）
            if (driveFolderUrl && filename) {
                let matchedFileId = null;
                if (driveImagesMap && driveImagesMap.size > 0) {
                    const searchVariants = generateOrderNoVariants(filename);
                    for (const cand of searchVariants) {
                        const fileId = driveImagesMap.get(cand);
                        if (fileId) {
                            matchedFileId = fileId;
                            break;
                        }
                    }
                }

                if (matchedFileId) {
                    const driveUrl = `https://lh3.googleusercontent.com/d/${matchedFileId}`;
                    if (!isCancelled) {
                        updateImageUrl(driveUrl);
                        setError(false);
                        return;
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
    }, [dirHandle, imageFilesMap, filename, customerFileName, driveFolderUrl, driveImagesMap, isVisible]);

    if (!isVisible) {
        return <div ref={imgRef} className={`product-image-container ${className || ''} placeholder`} style={{ minHeight: '100px', background: '#f0f0f0' }} />;
    }

    if (error || !imageUrl) {
        const debugText = `Map: ${imageFilesMap ? imageFilesMap.size : 0}件 / Key: ${filename || 'なし'}`;
        return (
            <div className={`no-image ${className || ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '2px' }}>
                <ImageIcon size={20} />
                <span style={{ fontSize: '9px', color: '#555', wordBreak: 'break-all', textAlign: 'center', lineHeight: '1.1' }}>
                    {debugText}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`product-image-container ${className || ''}`}
            onClick={() => onClick && onClick(imageUrl)}
            style={{ cursor: onClick ? 'pointer' : 'default', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <img
                src={imageUrl}
                alt={filename || '商品画像'}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                onError={() => {
                    if (imageUrl && imageUrl.includes('lh3.googleusercontent.com/d/')) {
                        const fileId = imageUrl.split('/d/')[1];
                        if (fileId) {
                            setImageUrl(`https://drive.google.com/thumbnail?id=${fileId}&sz=w800`);
                            return;
                        }
                    }
                    if (imageUrl && imageUrl.includes('drive.google.com/thumbnail')) {
                        const match = imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
                        if (match && match[1]) {
                            setImageUrl(`https://drive.google.com/uc?export=view&id=${match[1]}`);
                            return;
                        }
                    }
                    setError(true);
                }}
            />
        </div>
    );
};

export default React.memo(ProductImage);
