import * as XLSX from 'xlsx';

/**
 * 商品データを元に、お客様提出用のExcelワークブックオブジェクトを作成する。
 * 
 * @param {import('../types/product').Product[]} products - 絞り込まれた商品データの配列
 * @param {string} [fileName] - 顧客ファイル名
 * @returns {XLSX.WorkBook} 作成されたExcelワークブックオブジェクト
 */
export const createProductExcelWorkbook = (products, fileName) => {
  if (!products || products.length === 0) {
    throw new Error('出力するデータがありません');
  }

  // ファイル名から拡張子を削除し、（株）を株式会社に置き換えて会社名として表示
  const companyName = fileName
    ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社")
    : "顧客";

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  // Excelデータ構造の定義 (ヘッダー含む)
  const header = [
    [`【${companyName} 様】 取扱商品一覧`],
    [`出力日: ${dateStr}`],
    [], // 空白行
    [
      "No.",
      "受注№",
      "商品コード",
      "品名",
      "種別",
      "形状",
      "材質",
      "重量",
      "単価",
      "印刷代",
      "JANコード",
      "最新受注日"
    ]
  ];

  const rows = products.map((item, index) => {
    const displayName = item['種別'] === '既製品' ? item['商品名'] : item['タイトル'];
    
    // 数値変換
    const price = item['単価'] ? Number(item['単価']) : null;
    const printingCost = item['印刷代'] ? Number(item['印刷代']) : null;

    return [
      index + 1,
      item['受注№'] || '',
      item['商品コード'] || '',
      displayName || '',
      item['種別'] || '',
      item['形状'] || '',
      item['材質名称'] || '',
      item['重量'] || '',
      price,
      printingCost,
      item['JANコード'] || '',
      item['最新受注日'] || ''
    ];
  });

  const aoa = [...header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 単価・印刷代のセルに数値かつ通貨フォーマットを適用
  const startRow = 4; // Excelでは5行目（0-indexedでは4）
  const numRows = products.length;
  for (let i = startRow; i < startRow + numRows; i++) {
    // 単価列 (I列 = index 8)
    const priceCellRef = XLSX.utils.encode_cell({ r: i, c: 8 });
    if (ws[priceCellRef] && ws[priceCellRef].v !== null) {
      ws[priceCellRef].t = 'n';
      ws[priceCellRef].z = '"¥"#,##0';
    }
    // 印刷代列 (J列 = index 9)
    const printCellRef = XLSX.utils.encode_cell({ r: i, c: 9 });
    if (ws[printCellRef] && ws[printCellRef].v !== null) {
      ws[printCellRef].t = 'n';
      ws[printCellRef].z = '"¥"#,##0';
    }
  }

  // 列幅の自動調整（全角文字を2文字、半角文字を1文字として簡易計算）
  const colWidths = aoa[3].map((_, colIndex) => {
    let maxLen = 10;
    for (let rowIndex = 3; rowIndex < aoa.length; rowIndex++) {
      const val = aoa[rowIndex][colIndex];
      if (val !== undefined && val !== null) {
        const str = String(val);
        const len = str.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 127 ? 2 : 1), 0);
        if (len > maxLen) {
          maxLen = len;
        }
      }
    }
    return { wch: maxLen + 2 };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "商品一覧");

  return wb;
};
