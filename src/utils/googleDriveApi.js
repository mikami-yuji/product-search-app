/**
 * @fileoverview Google Drive 共有フォルダURL解析および画像URL生成ユーティリティ
 */

import { generateOrderNoVariants } from './imageKeyUtils';

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
 * Google Drive 共有フォルダ内の画像ファイル名とFile IDのマッピングを全自動構築します。
 * CORSブロックを回避するため複数のプロキシを順次試行し、共有フォルダのHTMLから
 * ファイル名と暗号化 File ID を一括抽出して、受注№の各バリエーションキーにバインドします。
 *
 * @param {string} folderUrlOrId - Google Drive の共有URLまたはフォルダID
 * @returns {Promise<Map<string, string>>} キー: 正規化された受注№・枝番・ファイル名、値: Google Drive File ID
 */
export const fetchDriveFolderFiles = async (folderUrlOrId) => {
  const folderId = parseGoogleDriveFolderId(folderUrlOrId);
  const map = new Map();
  if (!folderId) return map;

  const targetUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
  const proxyEndpoints = [
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    targetUrl
  ];

  let htmlContent = '';
  for (const endpoint of proxyEndpoints) {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('data-id') || text.includes('entry-name'))) {
          htmlContent = text;
          break;
        }
      }
    } catch {
      // 次のプロキシへフォールバック
    }
  }

  if (!htmlContent) return map;

  try {
    // 1. HTML構造 (data-id 及び class="entry-name") からの抽出
    const regexHtml = /data-id="([a-zA-Z0-9_-]{20,})"[\s\S]*?class="entry-name[^">]*">([^<]+)</g;
    let m;
    while ((m = regexHtml.exec(htmlContent)) !== null) {
      const fileId = m[1];
      const fileName = m[2].trim();
      const searchVariants = generateOrderNoVariants(fileName);
      
      map.set(fileName, fileId);
      map.set(fileName.toLowerCase(), fileId);

      for (const variant of searchVariants) {
        map.set(variant, fileId);
      }
    }

    // 2. JSデータ配列 (JSONレスポンス構造) からの抽出フォールバック
    const regexJson = /"([a-zA-Z0-9_-]{25,})",\s*\[\s*"([^"]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP))"/g;
    let j;
    while ((j = regexJson.exec(htmlContent)) !== null) {
      const fileId = j[1];
      const fileName = j[2].trim();
      const searchVariants = generateOrderNoVariants(fileName);

      map.set(fileName, fileId);
      map.set(fileName.toLowerCase(), fileId);

      for (const variant of searchVariants) {
        map.set(variant, fileId);
      }
    }
  } catch (err) {
    console.error('Failed to parse Drive folder HTML:', err);
  }

  return map;
};
