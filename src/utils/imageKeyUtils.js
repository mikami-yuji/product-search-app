/**
 * @fileoverview 画像検索および顧客コード照合のためのキー正規化ユーティリティ
 */

/**
 * 顧客ファイル名やフォルダ名から先頭の顧客コード（数字列）を抽出します。
 * 例: "22072_（株）中尾米穀店.xlsx" -> "22072"
 *
 * @param {string} [name] - 顧客ファイル名またはフォルダ名
 * @returns {string} 抽出された顧客コード（見つからない場合は空文字）
 */
export const extractCustomerCode = (name) => {
  if (!name) return '';
  const cleanName = String(name)
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim();
  const match = cleanName.match(/^([0-9]+)/);
  return match ? match[1] : '';
};

/**
 * 受注Noや画像ファイル名から正規化されたベース文字列を取得します。
 * 全角英数字の半角化、カンマや拡張子の除去、ゼロ埋め処理を行います。
 *
 * @param {string|number} [val] - 受注Noまたは画像ファイル名
 * @returns {string} 正規化された文字列
 */
export const normalizeOrderNumber = (val) => {
  if (val === null || val === undefined) return '';
  const rawStr = String(val).trim();
  if (!rawStr) return '';

  return rawStr
    .replace(/\.[^/.]+$/, '') // 拡張子の除去
    .replace(/,/g, '')
    .replace(/\.0+$/, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();
};

/**
 * 受注Noに対して探索可能なキーバリエーション（枝番・ゼロ埋め・プレフィックス等）を生成します。
 * 画像探索キーを受注Noのみに絞り込み、O(1)アクセスを可能にします。
 *
 * @param {string|number} [orderNo] - 受注No
 * @returns {string[]} 検索用キーのリスト
 */
export const generateOrderNoVariants = (orderNo) => {
  const cleaned = normalizeOrderNumber(orderNo);
  if (!cleaned) return [];

  const unpadded = cleaned.replace(/^0+/, '');
  const pad7 = unpadded ? unpadded.padStart(7, '0') : '';
  const pad8 = unpadded ? unpadded.padStart(8, '0') : '';

  const bases = Array.from(new Set([cleaned, unpadded, pad7, pad8])).filter(Boolean);
  const suffixes = [
    '', 'a', 'b', 'c', 'd', 'e', 'A', 'B', 'C', 'D', 'E',
    '-01', '_01', '-00', '_00', '-0', '_0',
    '_1', '_a', '_A', '_b', '_B', '_c', '_C',
    '-1', '-a', '-A', ' (1)', '_01a', '-01a'
  ];

  /** @type {Set<string>} */
  const variants = new Set();

  for (const base of bases) {
    for (const suf of suffixes) {
      variants.add(`${base}${suf}`);
    }
  }

  return Array.from(variants);
};
