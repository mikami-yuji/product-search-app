import { get, set, del, keys } from 'idb-keyval';

const IMAGE_CACHE_PREFIX = 'img_';
const MAX_CACHE_SIZE = 100; // 最大100枚までキャッシュ
const CACHE_EXPIRY_DAYS = 7; // 7日間有効

/**
 * 画像をIndexedDBにキャッシュ
 */
export const cacheImage = async (filename, blob) => {
    try {
        const cacheKey = `${IMAGE_CACHE_PREFIX}${filename}`;
        const cacheData = {
            blob,
            timestamp: Date.now(),
            filename
        };

        await set(cacheKey, cacheData);

        // キャッシュサイズ管理
        await manageCacheSize();
    } catch (err) {
        console.error('Failed to cache image:', err);
    }
};

/**
 * キャッシュから画像を取得
 */
export const getCachedImage = async (filename) => {
    try {
        const cacheKey = `${IMAGE_CACHE_PREFIX}${filename}`;
        const cacheData = await get(cacheKey);

        if (!cacheData) return null;

        // 有効期限チェック
        const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - cacheData.timestamp > expiryTime;

        if (isExpired) {
            await del(cacheKey);
            return null;
        }

        return cacheData.blob;
    } catch (err) {
        console.error('Failed to get cached image:', err);
        return null;
    }
};

/**
 * キャッシュサイズを管理（古いものから削除）
 */
const manageCacheSize = async () => {
    try {
        const allKeys = await keys();
        const imageKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(IMAGE_CACHE_PREFIX)
        );

        if (imageKeys.length <= MAX_CACHE_SIZE) return;

        // タイムスタンプ順にソート
        const cacheEntries = await Promise.all(
            imageKeys.map(async (key) => {
                const data = await get(key);
                return { key, timestamp: data?.timestamp || 0 };
            })
        );

        cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

        // 古いものから削除
        const toDelete = cacheEntries.slice(0, imageKeys.length - MAX_CACHE_SIZE);
        await Promise.all(toDelete.map(entry => del(entry.key)));
    } catch (err) {
        console.error('Failed to manage cache size:', err);
    }
};

/**
 * すべての画像キャッシュをクリア
 */
export const clearImageCache = async () => {
    try {
        const allKeys = await keys();
        const imageKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(IMAGE_CACHE_PREFIX)
        );

        await Promise.all(imageKeys.map(key => del(key)));
    } catch (err) {
        console.error('Failed to clear image cache:', err);
    }
};

/**
 * キャッシュ統計を取得
 */
export const getCacheStats = async () => {
    try {
        const allKeys = await keys();
        const imageKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(IMAGE_CACHE_PREFIX)
        );

        let totalSize = 0;
        const entries = await Promise.all(
            imageKeys.map(async (key) => {
                const data = await get(key);
                const size = data?.blob?.size || 0;
                totalSize += size;
                return { key, size, timestamp: data?.timestamp };
            })
        );

        return {
            count: imageKeys.length,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            entries
        };
    } catch (err) {
        console.error('Failed to get cache stats:', err);
        return { count: 0, totalSize: 0, totalSizeMB: '0.00', entries: [] };
    }
};
