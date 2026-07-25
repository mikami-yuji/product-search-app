/**
 * @fileoverview Google Drive 共有フォルダURL解析および画像URL生成ユーティリティ
 */

import { generateOrderNoVariants, normalizeOrderNumber } from './imageKeyUtils';

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
