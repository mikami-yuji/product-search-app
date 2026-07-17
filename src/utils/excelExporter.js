import ExcelJS from 'exceljs';
import { fetchProductImageBlob } from './imageLoader';

/**
 * 商品データを元に、お客様提出用の高クオリティなExcelワークブックオブジェクトを作成する。
 * 画像取得、罫線、整列、およびスタイリングを含みます。
 * 
 * @param {import('../types/product').Product[]} products - 絞り込まれた商品データの配列
 * @param {string} [fileName] - 顧客ファイル名
 * @param {FileSystemDirectoryHandle} [dirHandle] - 画像フォルダのディレクトリハンドル
 * @returns {Promise<ExcelJS.Workbook>} 作成されたExcelワークブックオブジェクト
 */
export const createProductExcelWorkbook = async (products, fileName, dirHandle) => {
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
  worksheet.views = [{ showGridLines: true }];

  // 1. タイトル
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `【${companyName} 様】 取扱商品一覧`;
  titleCell.font = { name: 'MS PGothic', size: 16, bold: true, color: { argb: 'FF1E40AF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 40;

  // 2. 出力日
  worksheet.mergeCells('A2:M2');
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `出力日: ${dateStr}`;
  dateCell.font = { name: 'MS PGothic', size: 10, italic: true };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getRow(2).height = 20;

  // 3. 空行
  worksheet.addRow([]);
  worksheet.getRow(3).height = 15;

  // 4. テーブルヘッダー
  const headers = [
    "No.",
    "商品画像",
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
  headerRow.height = 30;

  // ヘッダースタイルの適用
  headerRow.eachCell((cell) => {
    cell.font = { name: 'MS PGothic', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // アサヒパックのイメージカラーである青
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  });

  // データ開始行のインデックス
  const startRowIndex = 5;

  // 5. データ行の追加
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const displayName = item['種別'] === '既製品' ? item['商品名'] : item['タイトル'];
    const price = item['単価'] ? Number(item['単価']) : null;
    const printingCost = item['印刷代'] ? Number(item['印刷代']) : null;

    const rowData = [
      i + 1,
      "", // 商品画像 (B列) は後から addImage で挿入
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

    const row = worksheet.addRow(rowData);
    row.height = 80; // 画像が綺麗に収まる高さ

    const currentRowIndex = startRowIndex + i;

    // データ行の各セルにスタイルと配置を適用
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'MS PGothic', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      // 水平・垂直方向の整列
      if ([1, 2, 3, 4, 6, 7, 8, 9, 13].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([10, 11].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // 数値フォーマットの設定
      if ([10, 11].includes(colNumber) && cell.value !== null) {
        cell.numFmt = '"¥"#,##0';
      }
    });

    // 商品画像の非同期取得と埋め込み
    const filename = item['受注№'];
    if (filename) {
      try {
        const imageBlob = await fetchProductImageBlob(filename, dirHandle);
        if (imageBlob) {
          const arrayBuffer = await imageBlob.arrayBuffer();
          
          let extension = 'png';
          if (imageBlob.type === 'image/jpeg' || imageBlob.type === 'image/jpg') {
            extension = 'jpeg';
          }

          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: extension
          });

          worksheet.addImage(imageId, {
            tl: { col: 1.05, row: currentRowIndex - 1 + 0.05 },
            ext: { width: 72, height: 72 }
          });
        }
      } catch (err) {
        console.error(`Failed to embed image for ${filename}:`, err);
      }
    }
  }

  // 6. 列幅の自動調整
  worksheet.columns.forEach((col, colIdx) => {
    if (colIdx === 0) {
      col.width = 6;
      return;
    }
    if (colIdx === 1) {
      col.width = 12;
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

    col.width = maxLen + 3;
  });

  return workbook;
};
