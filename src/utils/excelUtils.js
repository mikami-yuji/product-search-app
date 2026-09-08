/**
 * Excelデータの列名ゆらぎ自動補正ユーティリティ
 */

export const COLUMN_ALIASES = {
    '受注№': ['受注no', '受注番号', '受注no.', '伝票番号', '受注', '受注コード', '伝票№', '伝票no'],
    '商品コード': ['商品cd', '品番', 'コード', '商品番号', 'アイテムコード', '品目コード', '品目cd'],
    '商品名': ['品名', 'タイトル', '品目名', '商品', '名称', '品名・規格'],
    '単価': ['販売単価', '上代', '価格', '単価(税抜)', '定価', '税抜単価', '金額'],
    '受注数': ['数量', '発注数', '個数', '数量(点)', '受注数量'],
    '単位': ['入数単位', '荷姿', '単位名'],
    '種別': ['区分', '商品区分', '商品種別'],
    'JANコード': ['jan', 'バーコード', 'janコード'],
    '最新受注日': ['受注日', '日付', '最新日付', '最終受注日', '売上日'],
    '直送先名称': ['直送先', '納品先', '納品先名', '送付先', '届け先'],
    '印刷代': ['版代', '加工代', '印刷費用'],
    '形状': ['型', 'タイプ'],
    '材質名称': ['材質', '素材']
};

/**
 * 全角英数を半角英数にし、小文字・トリムした文字列を返す
 * @param {string} str
 * @returns {string}
 */
const normalizeKey = (str) => {
    if (!str) return '';
    return String(str)
        .trim()
        .toLowerCase()
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
        .replace(/[.．。、,\s_－‐―/#＃-]/g, '');
};

/**
 * 1行分のオブジェクトのキーを標準キーに正規化する
 * @param {Object} row 
 * @returns {Object}
 */
export const normalizeProductRow = (row) => {
    if (!row || typeof row !== 'object') return row;

    const normalized = { ...row };
    const rowKeys = Object.keys(row);

    // 行内の全キーを正規化したマッピングテーブル
    const keyLookup = new Map();
    for (const originalKey of rowKeys) {
        const clean = normalizeKey(originalKey);
        if (clean) {
            keyLookup.set(clean, originalKey);
        }
    }

    // 各標準キーに対して、行内に値があるかチェック。無ければエイリアスを探して補完
    for (const [standardKey, aliases] of Object.entries(COLUMN_ALIASES)) {
        const hasExistingValue = standardKey in normalized && normalized[standardKey] !== undefined && normalized[standardKey] !== '';
        if (hasExistingValue) {
            continue;
        }

        // 1. 標準キーそのものの表記ゆれ（全角半角・空白等）
        const stdClean = normalizeKey(standardKey);
        if (keyLookup.has(stdClean)) {
            const matchedKey = keyLookup.get(stdClean);
            if (matchedKey !== standardKey && normalized[matchedKey] !== undefined) {
                normalized[standardKey] = normalized[matchedKey];
            }
            continue;
        }

        // 2. エイリアス一覧から合致するものを探索
        for (const alias of aliases) {
            const aliasClean = normalizeKey(alias);
            if (keyLookup.has(aliasClean)) {
                const matchedKey = keyLookup.get(aliasClean);
                if (normalized[matchedKey] !== undefined && normalized[matchedKey] !== '') {
                    normalized[standardKey] = normalized[matchedKey];
                    break;
                }
            }
        }
    }

    return normalized;
};

/**
 * Excelパース後のデータ配列全体を行ごとに正規化
 * @param {Array<Object>} rows 
 * @returns {Array<Object>}
 */
export const normalizeProductRows = (rows) => {
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizeProductRow);
};
