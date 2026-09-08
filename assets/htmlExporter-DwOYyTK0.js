import{f as y}from"./index-BhdceOza.js";import"./vendor-react-D4a6Q0Aa.js";import"./vendor-J7GgCVWF.js";import"./vendor-lucide-9aOOuS4A.js";import"./vendor-xlsx-zV2OkpLu.js";const w=o=>new Promise((n,i)=>{const a=new FileReader;a.onloadend=()=>n(a.result||""),a.onerror=i,a.readAsDataURL(o)}),e=o=>o==null?"":String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),I=async(o,n,i)=>{if(!o||o.length===0)throw new Error("出力するデータがありません");const a=n?n.replace(/\.[^/.]+$/,"").replace(/[(（]株[)）]/g,"株式会社"):"顧客",p=e(a),c=new Date,g=`${c.getFullYear()}年${c.getMonth()+1}月${c.getDate()}日`;let m="";for(let r=0;r<o.length;r++){const t=o[r],h=t.種別==="既製品"?t.商品名:t.タイトル,f=e(h),x=t.最新受注日||"",b=e(x?String(x).trim().replace(/-/g,"/"):"");let d="";const s=t["受注№"];if(s)try{const l=await y(s,i);l&&(d=await w(l))}catch(l){console.error(`Failed to load image for HTML export: ${s}`,l)}const u=d?`<img src="${d}" alt="${f}" class="product-img" onclick="openModal(this)" />`:'<span class="no-img-text">No Image</span>';m+=`
      <tr>
        <td class="text-center">${r+1}</td>
        <td class="text-center image-cell">${u}</td>
        <td class="text-center font-mono">${e(t["受注№"])||"-"}</td>
        <td class="text-center font-mono">${e(t.商品コード)||"-"}</td>
        <td class="text-center">${f||"-"}</td>
        <td class="text-center">${e(t.種別)||"-"}</td>
        <td class="text-center">${e(t.形状)||"-"}</td>
        <td>${e(t.材質名称)||"-"}</td>
        <td class="text-center">${e(t.重量)||"-"}</td>
        <td class="text-center font-mono">${e(t.JANコード)||"-"}</td>
        <td class="text-center">${b||"-"}</td>
      </tr>
    `}return`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【${p} 様】 取扱商品一覧</title>
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
      <h1>【${p} 様】 取扱商品一覧</h1>
      <p class="date">出力日: ${g}</p>
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
          ${m}
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
  <\/script>
</body>
</html>`};export{I as createProductHtmlString,e as escapeHtml};
