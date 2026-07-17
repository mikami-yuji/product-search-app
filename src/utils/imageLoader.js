import { getCachedImage } from './imageCache';

/**
 * ファイル名に対応する画像Blobを取得する。
 * キャッシュ、開発サーバー、およびローカルフォルダハンドルからフォールバック探索を行う。
 * 
 * @param {string} filename - 画像ファイル名（通常は受注№）
 * @param {FileSystemDirectoryHandle} [dirHandle] - ローカル画像フォルダのハンドル
 * @returns {Promise<Blob|null>} 取得した画像のBlob、見つからない場合はnull
 */
export const fetchProductImageBlob = async (filename, dirHandle) => {
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

  // 3. ローカルの画像フォルダからロード
  if (dirHandle) {
    const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
    const candidates = [];
    for (const ext of extensions) {
      candidates.push(`${filename}${ext}`);
      candidates.push(`${filename}A${ext}`);
    }

    for (const name of candidates) {
      try {
        const fileHandle = await dirHandle.getFileHandle(name);
        if (fileHandle) {
          const file = await fileHandle.getFile();
          if (file) return file;
        }
      } catch {
        // 次の候補を試す
      }
    }
  }

  return null;
};
