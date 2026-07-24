import { getCachedImage } from './imageCache';

// サブディレクトリハンドルのメモリキャッシュ
/** @type {Map<string, FileSystemDirectoryHandle>} */
const subDirHandleCache = new Map();

/**
 * 顧客名に対応するサブディレクトリハンドルを取得します（PC用）。
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

  if (typeof dirHandle.values === 'function') {
    try {
      // @ts-ignore - FileSystemDirectoryHandle iteration
      for await (const entry of dirHandle.values()) {
        if (entry && entry.kind === 'directory' && entry.name) {
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
    } catch {
      // エラー時はスキップ
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

  const cleaned = String(rawFilename)
    .trim()
    .replace(/,/g, '')
    .replace(/\.0+$/, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

  const unpadded = cleaned.replace(/^0+/, '');
  const baseNames = Array.from(new Set([cleaned, unpadded, String(rawFilename).trim()])).filter(Boolean);
  const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.webp', '.WEBP'];
  const prefixes = [];

  for (const base of baseNames) {
    prefixes.push(
      base,
      `${base}A`,
      `${base}a`,
      `${base}_1`,
      `${base}_A`,
      `${base}_a`,
      `${base}-1`,
      `${base}-A`,
      `${base}-a`
    );
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

    if (typeof targetHandle.values === 'function') {
      try {
        // @ts-ignore
        for await (const entry of targetHandle.values()) {
          if (entry && entry.kind === 'file' && entry.name) {
            const entryNameLower = entry.name.toLowerCase();
            for (const base of baseNames) {
              if (entryNameLower.startsWith(base.toLowerCase())) {
                return entry;
              }
            }
          }
        }
      } catch {
        // スキップ
      }
    }

    return null;
  };

  // 1. 顧客専用サブディレクトリ内の優先探索（PC・スマホ顧客別サブフォルダ対応）
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

  // 2. ルートディレクトリ直下の探索（PC用：ルートフォルダ内に一括で画像が入っている場合）
  try {
    const foundRoot = await searchInDirectory(dirHandle);
    if (foundRoot) return foundRoot;
  } catch {
    // 次へ
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
