import { get, set, del, keys } from 'idb-keyval';
import { extractCustomerCode, normalizeOrderNumber } from './imageKeyUtils';

const IMAGE_CACHE_PREFIX = 'img_';
const STORED_IMG_PREFIX = 'stored_img_';
const STORED_META_KEY = 'mobile_image_metadata';
const MAX_CACHE_SIZE = 100; // 一時取得キャッシュの最大数
const CACHE_EXPIRY_DAYS = 7; // 7日間有効

/**
 * 画像をIndexedDBにキャッシュ（一時キャッシュ）
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
 * すべての一時画像キャッシュをクリア
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
 * スマホ環境で選択された画像群をIndexedDBへ得意先ごとに永続保存（蓄積）します。
 * UI描画をブロックしないよう非同期で実行されます。
 * 
 * @param {File[]} files - 選択されたファイル配列
 * @param {string} [customerFileName] - 選択中の顧客Excelファイル名
 * @returns {Promise<{savedCount: number, keys: string[]}>}
 */
export const saveStoredImagesBatch = async (files, customerFileName = '') => {
    if (!files || files.length === 0) return { savedCount: 0, keys: [] };

    try {
        const currentMeta = (await get(STORED_META_KEY)) || { totalCount: 0, customers: {}, keys: [] };
        const savedKeySet = new Set(currentMeta.keys || []);
        const activeCustCode = extractCustomerCode(customerFileName);
        const activeCustName = customerFileName ? String(customerFileName).replace(/\.xlsx?$/i, '').trim() : '';

        const savePromises = [];
        const newKeys = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const name = file.name;
            const dotIdx = name.lastIndexOf('.');
            const rawName = dotIdx > 0 ? name.substring(0, dotIdx).trim() : name.trim();
            const lowerRawName = rawName.toLowerCase();
            const lowerFileName = name.toLowerCase();
            const cleaned = normalizeOrderNumber(rawName);

            // 相対パスの解析
            const relPath = file.webkitRelativePath ? String(file.webkitRelativePath).normalize('NFC') : '';
            let fileCustCode = activeCustCode;
            let fileCustName = activeCustName;

            if (relPath) {
                const parts = relPath.split('/');
                if (parts.length > 1) {
                    const folderSegment = parts[0].trim();
                    const detectedCode = extractCustomerCode(folderSegment);
                    if (detectedCode) fileCustCode = detectedCode;
                    fileCustName = folderSegment;
                }
            }

            // 画像の保存キー候補（単体・小文字・正規化・顧客プレフィックス）
            const candidateKeys = new Set([
                name,
                lowerFileName,
                rawName,
                lowerRawName
            ]);
            if (cleaned) candidateKeys.add(cleaned);

            if (fileCustCode) {
                candidateKeys.add(`${fileCustCode}/${lowerFileName}`);
                candidateKeys.add(`${fileCustCode}/${lowerRawName}`);
                if (cleaned) candidateKeys.add(`${fileCustCode}/${cleaned}`);
            }
            if (fileCustName) {
                const lowerCustName = fileCustName.toLowerCase();
                candidateKeys.add(`${lowerCustName}/${lowerFileName}`);
                candidateKeys.add(`${lowerCustName}/${lowerRawName}`);
                if (cleaned) candidateKeys.add(`${lowerCustName}/${cleaned}`);
            }

            // 各キーを登録
            for (const key of candidateKeys) {
                const storageKey = `${STORED_IMG_PREFIX}${key}`;
                savePromises.push(set(storageKey, file));
                savedKeySet.add(storageKey);
                newKeys.push(key);
            }

            // メタデータ集計
            const targetCustomerKey = fileCustCode || fileCustName || 'default';
            if (!currentMeta.customers[targetCustomerKey]) {
                currentMeta.customers[targetCustomerKey] = {
                    code: fileCustCode,
                    name: fileCustName || '共通',
                    count: 0,
                    updatedAt: Date.now()
                };
            }
            currentMeta.customers[targetCustomerKey].count += 1;
            currentMeta.customers[targetCustomerKey].updatedAt = Date.now();
        }

        // 保存実行
        await Promise.all(savePromises);

        currentMeta.keys = Array.from(savedKeySet);
        currentMeta.totalCount = currentMeta.keys.length;
        await set(STORED_META_KEY, currentMeta);

        return { savedCount: files.length, keys: newKeys };
    } catch (err) {
        console.error('Failed to store mobile images batch:', err);
        return { savedCount: 0, keys: [] };
    }
};

/**
 * IndexedDBに永続保存されたすべてのスマホ画像を読み込み、メモリマップ(Map)を復元します。
 * 得意先を切り替えても即座に利用できます。
 * 
 * @returns {Promise<Map<string, Blob|File>>}
 */
export const loadAllStoredImagesMap = async () => {
    const resultMap = new Map();
    try {
        const meta = await get(STORED_META_KEY);
        if (!meta || !meta.keys || meta.keys.length === 0) {
            return resultMap;
        }

        const storedKeys = meta.keys;
        const loadPromises = storedKeys.map(async (storageKey) => {
            try {
                const fileOrBlob = await get(storageKey);
                if (fileOrBlob) {
                    const originalKey = storageKey.replace(STORED_IMG_PREFIX, '');
                    resultMap.set(originalKey, fileOrBlob);
                }
            } catch (err) {
                console.warn(`Failed to restore stored image key: ${storageKey}`, err);
            }
        });

        await Promise.all(loadPromises);
    } catch (err) {
        console.error('Failed to load all stored images map:', err);
    }
    return resultMap;
};

/**
 * 永続保存されたスマホ画像をクリアします。
 * 
 * @param {string} [targetCustomerCode] - 指定した得意先コードのみ削除する場合は指定、省略時は全削除
 * @returns {Promise<void>}
 */
export const clearStoredMobileImages = async (targetCustomerCode = '') => {
    try {
        const meta = await get(STORED_META_KEY);
        if (!meta) return;

        if (!targetCustomerCode) {
            // 全削除
            const allKeys = await keys();
            const storedKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(STORED_IMG_PREFIX));
            await Promise.all(storedKeys.map(k => del(k)));
            await del(STORED_META_KEY);
        } else {
            // 特定得意先のみ削除
            const prefix = `${STORED_IMG_PREFIX}${targetCustomerCode}/`;
            const allKeys = await keys();
            const targetKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(prefix));
            await Promise.all(targetKeys.map(k => del(k)));

            if (meta.customers && meta.customers[targetCustomerCode]) {
                delete meta.customers[targetCustomerCode];
                meta.keys = meta.keys.filter(k => !k.startsWith(prefix));
                meta.totalCount = meta.keys.length;
                await set(STORED_META_KEY, meta);
            }
        }
    } catch (err) {
        console.error('Failed to clear stored mobile images:', err);
    }
};

/**
 * キャッシュ統計を取得（一時キャッシュ＋スマホ永続保存画像）
 */
export const getCacheStats = async () => {
    try {
        const allKeys = await keys();
        const tempImageKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(IMAGE_CACHE_PREFIX)
        );
        const storedImageKeys = allKeys.filter(key =>
            typeof key === 'string' && key.startsWith(STORED_IMG_PREFIX)
        );

        let tempSize = 0;
        await Promise.all(
            tempImageKeys.map(async (key) => {
                const data = await get(key);
                tempSize += data?.blob?.size || 0;
            })
        );

        let storedSize = 0;
        await Promise.all(
            storedImageKeys.map(async (key) => {
                const fileOrBlob = await get(key);
                storedSize += fileOrBlob?.size || 0;
            })
        );

        const meta = await get(STORED_META_KEY);
        const customerList = meta?.customers ? Object.values(meta.customers) : [];

        const totalSize = tempSize + storedSize;

        return {
            count: tempImageKeys.length + storedImageKeys.length,
            tempCount: tempImageKeys.length,
            storedCount: storedImageKeys.length,
            storedCustomers: customerList,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    } catch (err) {
        console.error('Failed to get cache stats:', err);
        return { count: 0, tempCount: 0, storedCount: 0, storedCustomers: [], totalSize: 0, totalSizeMB: '0.00' };
    }
};
