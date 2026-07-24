import { getCachedImage } from './imageCache';

// サブディレクトリハンドルのメモリキャッシュ
/** @type {Map<string, FileSystemDirectoryHandle>} */
const subDirHandleCache = new Map();

/** @type {FileSystemDirectoryHandle[] | null} */
let cachedSubDirList = null;

/**
 * dirHandle直下のすべてのサブフォルダハンドルを取得・キャッシュします。
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<FileSystemDirectoryHandle[]>}
 */
export const getAllSubDirectories = async (dirHandle) => {
  if (!dirHandle) return [];
  if (cachedSubDirList) return cachedSubDirList;

  const list = [];
  try {
    if (typeof dirHandle.values === 'function') {
      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry && entry.kind === 'directory') {
          list.push(entry);
        }
      }
    }
  } catch (err) {
    console.error('Error scanning subdirectories:', err);
  }
  cachedSubDirList = list;
  return list;
};

/**
 * キャッシュをクリアします（ディレクトリ変更時等）
 */
export const clearImageLoaderCache = () => {
  subDirHandleCache.clear();
  cachedSubDirList = null;
};

/**
 * 顧客名に対応するサブディレクトリハンドルを取得します（PC用・スマホ用）。
 * 
 * @param {FileSystemDirectoryHandle} dirHandle - ルートのディレクトリハンドル
 * @param {string} [customerFileName] - 顧客ファイル名（例: "16152_トーベイ（株）.xlsx"）
 * @returns {Promise<FileSystemDirectoryHandle|null>} サブディレクトリハンドル
 */
export const getCustomerSubDirHandle = async (dirHandle, customerFileName) => {
  if (!dirHandle || !customerFileName) return null;

  const cleanString = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\.xlsx?$/i, '')
      .trim()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .toLowerCase();
  };

  const rawCustomerName = customerFileName.replace(/\.xlsx?$/i, '').trim();
  const cleanedCustomerName = cleanString(customerFileName);
  if (!rawCustomerName) return null;

  const cacheKey = `${dirHandle.name || 'root'}:${cleanedCustomerName}`;
  if (subDirHandleCache.has(cacheKey)) {
    return subDirHandleCache.get(cacheKey);
  }

  // 1. 完全一致するサブフォルダを試す (例: "16152_トーベイ（株）")
  try {
    if (typeof dirHandle.getDirectoryHandle === 'function') {
      const subHandle = await dirHandle.getDirectoryHandle(rawCustomerName);
      if (subHandle) {
        subDirHandleCache.set(cacheKey, subHandle);
        return subHandle;
      }
    }
  } catch {
    // スキップ
  }

  // 2. 顧客コード・名前の部分一致で全サブフォルダを検索
  const codeMatch = cleanedCustomerName.match(/^([0-9a-z]+)/i);
  const customerCode = codeMatch ? codeMatch[1].toLowerCase() : '';

  const subDirs = await getAllSubDirectories(dirHandle);
  for (const entry of subDirs) {
    if (entry && entry.name) {
      const entryCleaned = cleanString(entry.name);
      if (
        (customerCode && (entryCleaned.startsWith(customerCode) || entryCleaned.includes(customerCode))) ||
        entryCleaned.includes(cleanedCustomerName) ||
        cleanedCustomerName.includes(entryCleaned)
      ) {
        subDirHandleCache.set(cacheKey, entry);
        return entry;
      }
    }
  }

  return null;
};

/**
 * ファイル名に対応する FileHandle を探索します（PC用一括フォルダ ＆ スマホサブフォルダ両対応）。
 * 
 * @param {FileSystemDirectoryHandle} dirHandle - ルートのディレクトリハンドル
 * @param {string} rawFilename - 探索対象のファイル名（例: "1005235"）
 * @param {string} [customerFileName] - 顧客ファイル名（例: "16152_トーベイ（株）.xlsx"）
 * @returns {Promise<FileSystemFileHandle|null>} 発見した FileHandle
 */
export const findImageFileHandle = async (dirHandle, rawFilename, customerFileName) => {
  if (!dirHandle || !rawFilename) return null;

  const rawStr = String(rawFilename).trim();
  const cleaned = rawStr
    .replace(/,/g, '')
    .replace(/\.0+$/, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

  const unpadded = cleaned.replace(/^0+/, '');
  const pad7 = unpadded ? unpadded.padStart(7, '0') : '';
  const pad8 = unpadded ? unpadded.padStart(8, '0') : '';

  const baseNames = Array.from(new Set([cleaned, unpadded, pad7, pad8, rawStr])).filter(Boolean);
  const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.webp', '.WEBP'];
  const prefixes = [];

  const suffixes = [
    '', '-01', '_01', '-00', '_00', '-0', '_0',
    'A', 'a', '_1', '_A', '_a', '-1', '-A', '-a',
    ' (1)', '_01a', '-01a', '_1a', '-1a'
  ];

  for (const base of baseNames) {
    for (const suf of suffixes) {
      prefixes.push(`${base}${suf}`);
    }
  }

  const searchInDirectory = async (targetHandle) => {
    if (!targetHandle || typeof targetHandle.getFileHandle !== 'function') return null;

    for (const prefix of prefixes) {
      for (const ext of extensions) {
        try {
          const fileHandle = await targetHandle.getFileHandle(`${prefix}${ext}`);
          if (fileHandle) return fileHandle;
        } catch {
          // 未検出時は次へ
        }
      }
    }

    return null;
  };

  // 1. ルートディレクトリ直下の探索（PC用：画像フォルダ内に全画像が一括で入っている場合）
  try {
    const foundRoot = await searchInDirectory(dirHandle);
    if (foundRoot) return foundRoot;
  } catch {
    // 次へ
  }

  // 2. 顧客専用サブディレクトリ内の探索（顧客サブフォルダ用）
  if (customerFileName) {
    try {
      const subDirHandle = await getCustomerSubDirHandle(dirHandle, customerFileName);
      if (subDirHandle) {
        const foundSub = await searchInDirectory(subDirHandle);
        if (foundSub) return foundSub;
      }
    } catch {
      // スキップ
    }
  }

  // 3. すべてのサブディレクトリ内を一括ピンポイント探索（どのサブフォルダにあるか不明な場合の救済）
  try {
    const subDirs = await getAllSubDirectories(dirHandle);
    for (const subHandle of subDirs) {
      const foundInAnySub = await searchInDirectory(subHandle);
      if (foundInAnySub) return foundInAnySub;
    }
  } catch {
    // スキップ
  }

  return null;
};

/**
 * ファイル名に対応する画像Blobを取得する。
 * キャッシュ、開発サーバー、およびローカルフォルダハンドルからフォールバック探索を行う。
 * 
 * @param {string} filename - 画像ファイル名（通常は受注№）
 * @param {FileSystemDirectoryHandle} [dirHandle] - ローカル画像フォルダのハンドル
 * @param {string} [customerFileName] - 顧客ファイル名
 * @returns {Promise<Blob|null>} 取得した画像のBlob、見つからない場合はnull
 */
export const fetchProductImageBlob = async (filename, dirHandle, customerFileName) => {
  if (!filename) return null;

  // 1. キャッシュからロード
  if (typeof indexedDB !== 'undefined') {
    try {
      const cachedBlob = await getCachedImage(filename);
      if (cachedBlob && cachedBlob instanceof Blob && cachedBlob.type.startsWith('image/')) {
        return cachedBlob;
      }
    } catch (err) {
      console.error("Cache load failed for export:", err);
    }
  }

  // 2. ローカルサーバーからロード
  try {
    const response = await fetch(`/_local_images/${filename}`);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        return await response.blob();
      }
    }
  } catch {
    // 開発サーバーフェッチエラー時はスキップ
  }

  // 3. ローカルの画像フォルダからロード（PCの一括直下＆スマホのサブフォルダ両対応）
  if (dirHandle) {
    try {
      const fileHandle = await findImageFileHandle(dirHandle, filename, customerFileName);
      if (fileHandle) {
        const file = await fileHandle.getFile();
        if (file) return file;
      }
    } catch {
      // スキップ
    }
  }

  return null;
};
