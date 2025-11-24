import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCachedImage, cacheImage } from './utils/imageCache';

const ProductImage = ({ dirHandle, filename, productCode, productType, materialName, className, onClick }) => {
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

        const loadImage = async () => {
            // 1. Try Cache First (Offline Support)
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

            // 2. Try Local Image (if folder connected)
            if (dirHandle && filename) {
                try {
                    const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
                    let fileHandle = null;

                    for (const ext of extensions) {
                        try {
                            try {
                                fileHandle = await dirHandle.getFileHandle(`${filename}${ext}`);
                                if (fileHandle) break;
                            } catch (e) { }

                            try {
                                fileHandle = await dirHandle.getFileHandle(`${filename}A${ext}`);
                                if (fileHandle) break;
                            } catch (e) { }
                        } catch (e) { }
                    }

                    if (fileHandle) {
                        const file = await fileHandle.getFile();

                        // Cache the image for offline use
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

            // No image found
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
