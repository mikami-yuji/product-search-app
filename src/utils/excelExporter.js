import ExcelJS from 'exceljs';
import { fetchProductImageBlob } from './imageLoader';

/**
 * 画像Blobからアスペクト比計算用のサイズ（幅と高さ）を非同期で取得する。
 * 
 * @param {Blob} blob - 画像のBlobデータ
 * @returns {Promise<{width: number, height: number}>} 画像の幅と高さ
 */
const getImageDimensions = (blob) => {
  return new Promise((resolve, reject) => {
    // Node.js環境（テスト環境等）でImageオブジェクトが存在しない場合のフォールバック
    if (typeof Image === 'undefined') {
      resolve({ width: 0, height: 0 });
      return;
    }

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

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
  titleCell.font = { name: 'Yu Gothic', size: 18, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 50;

  // 2. 出力日
  worksheet.mergeCells('A2:M2');
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `出力日: ${dateStr}`;
  dateCell.font = { name: 'Yu Gothic', size: 10, italic: true, color: { argb: 'FF475569' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };
  worksheet.getRow(2).height = 25;

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

  // データ開始行のインデックス
  const startRowIndex = 5;

  // 5. データ行の追加
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const displayName = item['種別'] === '既製品' ? item['商品名'] : item['タイトル'];
    const price = item['単価'] && !isNaN(Number(item['単価'])) ? Number(item['単価']) : null;
    const printingCost = item['印刷代'] && !isNaN(Number(item['印刷代'])) ? Number(item['印刷代']) : null;

    // 日付フォーマットを YYYY/MM/DD に統一
    const rawDate = item['最新受注日'] || '';
    const formattedDate = rawDate ? String(rawDate).trim().replace(/-/g, '/') : '';

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
      formattedDate
    ];

    const row = worksheet.addRow(rowData);
    row.height = 80; // 画像が綺麗に収まる高さ

    const currentRowIndex = startRowIndex + i;
    
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
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, // 柔らかい極細罫線
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
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

          // アスペクト比を考慮したサイズ調整 (最大 72px)
          const maxBoxSize = 72;
          let destWidth = maxBoxSize;
          let destHeight = maxBoxSize;

          try {
            const { width, height } = await getImageDimensions(imageBlob);
            if (width > 0 && height > 0) {
              const aspectRatio = width / height;
              if (aspectRatio > 1) {
                // 横長画像
                destWidth = maxBoxSize;
                destHeight = maxBoxSize / aspectRatio;
              } else {
                // 縦長画像
                destHeight = maxBoxSize;
                destWidth = maxBoxSize * aspectRatio;
              }
            }
          } catch {
            // 寸法取得失敗時はデフォルトで描画
          }

          // セル（B列: 幅112px [col width 14], 高さ80px）の中央寄せ計算 (1px = 9525 EMU)
          const EMU_PER_PX = 9525;
          const cellWidthPx = 112; 
          const cellHeightPx = 80; 

          const colOff = Math.max(0, Math.floor((cellWidthPx - destWidth) / 2)) * EMU_PER_PX;
          const rowOff = Math.max(0, Math.floor((cellHeightPx - destHeight) / 2)) * EMU_PER_PX;

          worksheet.addImage(imageId, {
            tl: { 
              col: 1, 
              row: currentRowIndex - 1,
              colOff: colOff,
              rowOff: rowOff
            },
            ext: { width: destWidth, height: destHeight }
          });
        }
      } catch (err) {
        console.error(`Failed to embed image for ${filename}:`, err);
      }
    }
  }

  // 6. 列幅の自動調整 (余白を十分に確保する)
  worksheet.columns.forEach((col, colIdx) => {
    if (colIdx === 0) {
      col.width = 8; // No.
      return;
    }
    if (colIdx === 1) {
      col.width = 14; // 商品画像列 (画像72px=約9文字幅に対し、余白をつけて14)
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
