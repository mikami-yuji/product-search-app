/**
 * @fileoverview Google Drive 共有フォルダURL解析および画像URL生成ユーティリティ
 */

import { generateOrderNoVariants, normalizeOrderNumber } from './imageKeyUtils';

export const DEFAULT_GOOGLE_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE';

/**
 * Google Drive の共有フォルダURLまたはフォルダIDからフォルダIDを抽出します。
 * 例: "https://drive.google.com/drive/folders/1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE" -> "1kmoJG4MiZ40gBa6azE3J-l6W_GzeQUxE"
 *
 * @param {string} [input] - Google Drive のURLまたはID
 * @returns {string} 抽出されたフォルダID
 */
export const parseGoogleDriveFolderId = (input) => {
  if (!input) return '';
  const str = String(input).trim();
  
  // URLパターンからの抽出
  const match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Raw IDパターン（英数字とアンダースコア・ハイフンのみで20文字以上）
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) {
    return str;
  }

  return '';
};

/**
 * Google Drive のファイルIDから直接埋め込み表示可能な画像URLを生成します。
 *
 * @param {string} fileId - Google Drive のファイルID
 * @returns {string} 表示用画像URL
 */
export const getGoogleDriveImageUrl = (fileId) => {
  if (!fileId) return '';
  // 高速ダイレクトCDN URLを使用
  return `https://lh3.googleusercontent.com/d/${fileId}`;
};

/**
 * Google Drive のバックアップダイレクトURLを生成します（フォールバック用）。
 *
 * @param {string} fileId - Google Drive のファイルID
 * @returns {string} 共有ダイレクトURL
 */
export const getGoogleDriveDirectDownloadUrl = (fileId) => {
  if (!fileId) return '';
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

/**
 * Google Drive 共有フォルダ内の画像ファイル名とFile IDのマッピングを構築します。
 * 共有フォルダの公開HTMLからファイル名と暗号化File IDを全自動抽出し、受注№キーにバインドします。
 *
 * @param {string} folderUrlOrId - Google Drive の共有URLまたはフォルダID
 * @returns {Promise<Map<string, string>>} キー: 正規化された受注№やファイル名、値: Google Drive File ID
 */
export const fetchDriveFolderFiles = async (folderUrlOrId) => {
  const folderId = parseGoogleDriveFolderId(folderUrlOrId);
  const map = new Map();
  if (!folderId) return map;

  try {
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`);
    if (res.ok) {
      const html = await res.text();
      // data-id および entry-name クラスからのID・ファイル名抽出
      const regex = /data-id="([a-zA-Z0-9_-]{20,})"[\s\S]*?class="entry-name[^">]*">([^<]+)</g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        const fileId = m[1];
        const fileName = m[2].trim();
        const normNo = normalizeOrderNumber(fileName);

        map.set(fileName, fileId);
        map.set(fileName.toLowerCase(), fileId);
        if (normNo) {
          map.set(normNo, fileId);
          map.set(`${normNo}a`, fileId);
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch Drive folder index:', err);
  }

  return map;
};
