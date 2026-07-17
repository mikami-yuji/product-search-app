import { fetchProductImageBlob } from './imageLoader';

/**
 * 画像BlobをBase64データURLに非同期で変換する。
 * 
 * @param {Blob} blob - 画像Blob
 * @returns {Promise<string>} Base64データURLの文字列
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 得意先にそのまま提出できる高品質な商品一覧HTMLドキュメント文字列を生成する。
 * 単価、印刷代は除外されます。
 * 
 * @param {import('../types/product').Product[]} products - 商品データの配列
 * @param {string} [fileName] - 顧客ファイル名
 * @param {FileSystemDirectoryHandle} [dirHandle] - 画像フォルダのディレクトリハンドル
 * @returns {Promise<string>} 生成されたHTMLソースコードの文字列
 */
export const createProductHtmlString = async (products, fileName, dirHandle) => {
  if (!products || products.length === 0) {
    throw new Error('出力するデータがありません');
  }

  // 顧客名のクリーンアップ
  const companyName = fileName
    ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社")
    : "顧客";

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  // データ行の生成
  let tableRows = '';
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const displayName = item['種別'] === '既製品' ? item['商品名'] : item['タイトル'];
    
    // 日付フォーマット
    const rawDate = item['最新受注日'] || '';
    const formattedDate = rawDate ? String(rawDate).trim().replace(/-/g, '/') : '';

    // 画像のロードとBase64変換
    let imageSrc = '';
    const filename = item['受注№'];
    if (filename) {
      try {
        const imageBlob = await fetchProductImageBlob(filename, dirHandle);
        if (imageBlob) {
          imageSrc = await blobToBase64(imageBlob);
        }
      } catch (err) {
        console.error(`Failed to load image for HTML export: ${filename}`, err);
      }
    }

    // 画像タグの生成
    const imageTag = imageSrc 
      ? `<img src="${imageSrc}" alt="${displayName}" class="product-img" onclick="openModal(this)" />`
      : '<span class="no-img-text">No Image</span>';

    tableRows += `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center image-cell">${imageTag}</td>
        <td class="text-center font-mono">${item['受注№'] || '-'}</td>
        <td class="text-center font-mono">${item['商品コード'] || '-'}</td>
        <td class="text-center">${displayName || '-'}</td>
        <td class="text-center">${item['種別'] || '-'}</td>
        <td class="text-center">${item['形状'] || '-'}</td>
        <td>${item['材質名称'] || '-'}</td>
        <td class="text-center">${item['重量'] || '-'}</td>
        <td class="text-center font-mono">${item['JANコード'] || '-'}</td>
        <td class="text-center">${formattedDate || '-'}</td>
      </tr>
    `;
  }

  // HTMLテンプレートの組み立て
  const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【${companyName} 様】 取扱商品一覧</title>
  <style>
    body {
      font-family: "Yu Gothic", "游ゴシック", "Meiryo", "メイリオ", sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin: 0 0 10px 0;
      font-weight: 700;
    }
    .date {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      font-style: italic;
    }
    .table-responsive {
      overflow-x: auto;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
      border: 1px solid #e2e8f0;
    }
    th {
      background-color: #1e293b;
      color: #ffffff;
      font-weight: 600;
      padding: 12px 16px;
      border: 1px solid #334155;
      font-size: 13px;
      letter-spacing: 0.05em;
    }
    td {
      padding: 10px 16px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    tr:hover {
      background-color: #f1f5f9;
      transition: background-color 0.2s ease;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .image-cell {
      width: 90px;
      height: 90px;
      padding: 5px;
    }
    .product-img {
      max-width: 80px;
      max-height: 80px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background-color: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      cursor: zoom-in;
      transition: transform 0.2s ease;
    }
    .product-img:hover {
      transform: scale(1.05);
    }
    /* 画像拡大用モーダルスタイル */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      padding-top: 50px;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      cursor: zoom-out;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .modal.open {
      display: block;
      opacity: 1;
    }
    .modal-content {
      margin: auto;
      display: block;
      max-width: 90%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transform: scale(0.95);
      transition: transform 0.3s ease;
    }
    .modal.open .modal-content {
      transform: scale(1);
    }
    .modal-caption {
      margin: auto;
      display: block;
      width: 80%;
      max-width: 700px;
      text-align: center;
      color: #ffffff;
      padding: 15px 0;
      font-size: 16px;
      font-weight: 600;
    }
    .modal-close {
      position: absolute;
      top: 15px;
      right: 35px;
      color: #f1f5f9;
      font-size: 40px;
      font-weight: bold;
      transition: 0.3s;
      cursor: pointer;
    }
    .modal-close:hover {
      color: #94a3b8;
    }
    .no-img-text {
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .container {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      tr:nth-child(even) {
        background-color: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      th {
        background-color: #1e293b !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>【${companyName} 様】 取扱商品一覧</h1>
      <p class="date">出力日: ${dateStr}</p>
    </div>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th style="width: 50px;" class="text-center">No.</th>
            <th style="width: 90px;" class="text-center">商品画像</th>
            <th style="width: 100px;" class="text-center">受注№</th>
            <th style="width: 120px;" class="text-center">商品コード</th>
            <th>品名</th>
            <th style="width: 80px;" class="text-center">種別</th>
            <th style="width: 80px;" class="text-center">形状</th>
            <th>材質</th>
            <th style="width: 80px;" class="text-center">重量</th>
            <th style="width: 140px;" class="text-center">JANコード</th>
            <th style="width: 110px;" class="text-center">最新受注日</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- 画像拡大用モーダル -->
  <div id="imageModal" class="modal" onclick="closeModal()">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <img class="modal-content" id="modalImg" alt="拡大画像">
    <div id="modalCaption" class="modal-caption"></div>
  </div>

  <script>
    function openModal(imgElement) {
      var modal = document.getElementById("imageModal");
      var modalImg = document.getElementById("modalImg");
      var captionText = document.getElementById("modalCaption");
      
      modal.style.display = "block";
      // トランジションが動作するように遅延させてクラスを追加
      setTimeout(function() {
        modal.classList.add("open");
      }, 10);
      
      modalImg.src = imgElement.src;
      captionText.innerHTML = imgElement.alt;
    }

    function closeModal() {
      var modal = document.getElementById("imageModal");
      modal.classList.remove("open");
      // アニメーション完了後に非表示にする
      setTimeout(function() {
        modal.style.display = "none";
      }, 300);
    }

    // ESCキー押下時にも閉じる
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    });
  </script>
</body>
</html>`;

  return htmlContent;
};
