import ExcelJS from 'exceljs';
import { fetchProductImageBlob } from './imageLoader';

/**
 * ArrayBuffer または Blob から画像の拡張子(png/jpeg)を判定する
 * @param {Blob|Uint8Array} blob
 * @returns {'png'|'jpeg'}
 */
const getImageExtension = (blob) => {
  if (blob && blob.type && blob.type.includes('png')) {
    return 'png';
  }
  return 'jpeg';
};

/**
 * 商品データを元に、お客様提出用の高クオリティなExcelワークブックオブジェクトを作成する。
 * 罫線、整列、およびスタイリングを含みます。画像埋め込みオプション対応。
 * 
 * @param {import('../types/product').Product[]} products - 絞り込まれた商品データの配列
 * @param {string} [fileName] - 顧客ファイル名
 * @param {Object} [options] - オプション
 * @param {boolean} [options.includeImages=false] - 画像を含めるかどうか
 * @param {FileSystemDirectoryHandle} [options.dirHandle=null] - 画像フォルダハンドル
 * @returns {Promise<ExcelJS.Workbook>} 作成されたExcelワークブックオブジェクト
 */
export const createProductExcelWorkbook = async (products, fileName, options = {}) => {
  const { includeImages = false, dirHandle = null } = options;

  if (!products || products.length === 0) {
    throw new Error('出力するデータがありません');
  }

  // ファイル名から拡張子を削除し、（株）を株式会社に置き換えて会社名として表示
  const companyName = fileName
    ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社")
    : "顧客";

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('商品一覧');

  // グリッド線の表示設定
  const lastColLetter = includeImages ? 'M' : 'L';

  // 1. タイトル
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `【${companyName} 様】 取扱商品一覧`;
  titleCell.font = { name: 'Yu Gothic', size: 18, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 50;

  // 2. 出力日
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `出力日: ${dateStr}`;
  dateCell.font = { name: 'Yu Gothic', size: 10, italic: true, color: { argb: 'FF475569' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getRow(2).height = 25;

  // 3. 空行
  worksheet.addRow([]);
  worksheet.getRow(3).height = 15;

  // 4. テーブルヘッダー
  const headers = includeImages ? [
    "No.",
    "画像",
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
  ] : [
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
  ];
  
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 35;

  // ヘッダースタイルの適用 (游ゴシック、ミッドナイトブルー背景)
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Yu Gothic', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // 落ち着いたミッドナイトブルー
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  });

  // 5. データ行の追加
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const displayName = item['種別'] === '既製品' ? item['商品名'] : item['タイトル'];

    const parseCost = (val) => {
      if (val == null || val === '') return null;
      const cleanedVal = String(val).replace(/,/g, '').trim();
      const num = Number(cleanedVal);
      return isNaN(num) ? null : num;
    };

    const price = parseCost(item['単価']);
    const printingCost = parseCost(item['印刷代']);

    // 日付フォーマットを YYYY/MM/DD に統一
    const rawDate = item['最新受注日'] || '';
    const formattedDate = rawDate ? String(rawDate).trim().replace(/-/g, '/') : '';

    const rowData = includeImages ? [
      i + 1,
      '', // 画像セル（埋め込み用プレースホルダー）
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
      formattedDate
    ] : [
      i + 1,
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
      formattedDate
    ];

    const row = worksheet.addRow(rowData);
    const currentRowNumber = row.number;
    row.height = includeImages ? 60 : 25; // 画像あり時は高さを確保
    
    // 1行おきに薄い背景色を設定 (ゼブラ柄)
    const isEven = (i % 2 === 1);
    const rowBgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    // データ行の各セルにスタイルと配置を適用
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Yu Gothic', size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // 水平・垂直方向の整列
      const centerCols = includeImages ? [1, 2, 3, 4, 6, 7, 8, 9, 13] : [1, 2, 3, 5, 6, 7, 8, 12];
      const rightCols = includeImages ? [10, 11] : [9, 10];

      if (centerCols.includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (rightCols.includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // 数値フォーマットの設定
      if (rightCols.includes(colNumber) && cell.value !== null) {
        cell.numFmt = '"¥"#,##0';
      }
    });

    // 画像埋め込み処理
    if (includeImages && item['受注№']) {
      try {
        const imageBlob = await fetchProductImageBlob(item['受注№'], dirHandle, fileName);
        if (imageBlob && imageBlob instanceof Blob) {
          const arrayBuffer = await imageBlob.arrayBuffer();
          const ext = getImageExtension(imageBlob);

          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: ext,
          });

          worksheet.addImage(imageId, {
            tl: { col: 1.1, row: currentRowNumber - 1 + 0.1 },
            br: { col: 1.9, row: currentRowNumber - 0.1 },
            editAs: 'oneCell'
          });
        }
      } catch (err) {
        console.error(`Excel画像埋め込みエラー (${item['受注№']}):`, err);
      }
    }
  }

  // 6. 列幅の自動調整 (余白を十分に確保する)
  worksheet.columns.forEach((col, colIdx) => {
    if (colIdx === 0) {
      col.width = 8; // No.
      return;
    }
    if (includeImages && colIdx === 1) {
      col.width = 14; // 画像列
      return;
    }

    let maxLen = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.row < 4) return;
      
      if (cell.value !== undefined && cell.value !== null) {
        const str = String(cell.value);
        const len = str.split('').reduce((acc, char) => acc + (char.charCodeAt(0) > 127 ? 2 : 1), 0);
        if (len > maxLen) {
          maxLen = len;
        }
      }
    });

    col.width = maxLen + 5; // 余白を+5文字分確保
  });

  return workbook;
};
