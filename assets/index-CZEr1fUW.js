import { R as React, r as reactExports, j as jsxRuntimeExports, l as libExports, c as clientExports } from "./vendor-react-CBbpK88z.js";
import { E as ExcelJS } from "./vendor-exceljs-CW5FfZEm.js";
import { a as get, d as del, s as set, k as keys, F as Fuse } from "./vendor-DFy2ZtwE.js";
import { I as Image, S as ShoppingCart, T as Trash2, M as Minus, P as Plus, C as ChevronLeft, a as ChevronRight, b as CircleCheckBig, c as CircleAlert, X, D as Database, R as RotateCcw, F as FileX, d as RefreshCw, e as FileSpreadsheet, f as Clock, g as Search, h as FolderOpen, U as Upload, i as Users, j as Check, k as MapPin, l as FunnelX, m as ChevronUp, n as ChevronDown, o as Tag, p as FileCode, L as LayoutGrid, q as List, r as Palette, s as Layers, t as Scale } from "./vendor-lucide-Jg6Xo3NW.js";
import { r as readSync, u as utils } from "./vendor-xlsx-_ZWWUOoK.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const IMAGE_CACHE_PREFIX = "img_";
const MAX_CACHE_SIZE = 100;
const CACHE_EXPIRY_DAYS = 7;
const cacheImage = async (filename, blob) => {
  try {
    const cacheKey = `${IMAGE_CACHE_PREFIX}${filename}`;
    const cacheData = {
      blob,
      timestamp: Date.now(),
      filename
    };
    await set(cacheKey, cacheData);
    await manageCacheSize();
  } catch (err) {
    console.error("Failed to cache image:", err);
  }
};
const getCachedImage = async (filename) => {
  try {
    const cacheKey = `${IMAGE_CACHE_PREFIX}${filename}`;
    const cacheData = await get(cacheKey);
    if (!cacheData) return null;
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1e3;
    const isExpired = Date.now() - cacheData.timestamp > expiryTime;
    if (isExpired) {
      await del(cacheKey);
      return null;
    }
    return cacheData.blob;
  } catch (err) {
    console.error("Failed to get cached image:", err);
    return null;
  }
};
const manageCacheSize = async () => {
  try {
    const allKeys = await keys();
    const imageKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith(IMAGE_CACHE_PREFIX)
    );
    if (imageKeys.length <= MAX_CACHE_SIZE) return;
    const cacheEntries = await Promise.all(
      imageKeys.map(async (key) => {
        const data = await get(key);
        return { key, timestamp: data?.timestamp || 0 };
      })
    );
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = cacheEntries.slice(0, imageKeys.length - MAX_CACHE_SIZE);
    await Promise.all(toDelete.map((entry) => del(entry.key)));
  } catch (err) {
    console.error("Failed to manage cache size:", err);
  }
};
const clearImageCache = async () => {
  try {
    const allKeys = await keys();
    const imageKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith(IMAGE_CACHE_PREFIX)
    );
    await Promise.all(imageKeys.map((key) => del(key)));
  } catch (err) {
    console.error("Failed to clear image cache:", err);
  }
};
const getCacheStats = async () => {
  try {
    const allKeys = await keys();
    const imageKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith(IMAGE_CACHE_PREFIX)
    );
    let totalSize = 0;
    const entries = await Promise.all(
      imageKeys.map(async (key) => {
        const data = await get(key);
        const size = data?.blob?.size || 0;
        totalSize += size;
        return { key, size, timestamp: data?.timestamp };
      })
    );
    return {
      count: imageKeys.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      entries
    };
  } catch (err) {
    console.error("Failed to get cache stats:", err);
    return { count: 0, totalSize: 0, totalSizeMB: "0.00", entries: [] };
  }
};
const subDirHandleCache = /* @__PURE__ */ new Map();
const getCustomerSubDirHandle = async (dirHandle, customerFileName) => {
  if (!dirHandle || !customerFileName) return null;
  const rawCustomerName = customerFileName.replace(/\.xlsx?$/i, "").trim();
  if (!rawCustomerName) return null;
  const cacheKey = `${dirHandle.name || "root"}:${rawCustomerName}`;
  if (subDirHandleCache.has(cacheKey)) {
    return subDirHandleCache.get(cacheKey);
  }
  try {
    if (typeof dirHandle.getDirectoryHandle === "function") {
      const subHandle = await dirHandle.getDirectoryHandle(rawCustomerName);
      if (subHandle) {
        subDirHandleCache.set(cacheKey, subHandle);
        return subHandle;
      }
    }
  } catch {
  }
  const match = rawCustomerName.match(/^([0-9A-Za-z]+)/);
  if (match && typeof dirHandle.values === "function") {
    const customerCode = match[1];
    try {
      for await (const entry of dirHandle.values()) {
        if (entry && entry.kind === "directory" && entry.name && (entry.name.startsWith(customerCode) || entry.name.includes(customerCode))) {
          subDirHandleCache.set(cacheKey, entry);
          return entry;
        }
      }
    } catch {
    }
  }
  return null;
};
const findImageFileHandle = async (dirHandle, rawFilename, customerFileName) => {
  if (!dirHandle || !rawFilename) return null;
  const cleaned = String(rawFilename).trim().replace(/,/g, "").replace(/\.0+$/, "").replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248));
  const unpadded = cleaned.replace(/^0+/, "");
  const baseNames = Array.from(/* @__PURE__ */ new Set([cleaned, unpadded, String(rawFilename).trim()])).filter(Boolean);
  const extensions = [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG", ".webp", ".WEBP"];
  const prefixes = [];
  for (const base of baseNames) {
    prefixes.push(
      base,
      `${base}A`,
      `${base}a`,
      `${base}_1`,
      `${base}_A`,
      `${base}_a`,
      `${base}-1`,
      `${base}-A`,
      `${base}-a`
    );
  }
  const searchInDirectory = async (targetHandle) => {
    if (!targetHandle || typeof targetHandle.getFileHandle !== "function") return null;
    for (const prefix of prefixes) {
      for (const ext of extensions) {
        try {
          const fileHandle = await targetHandle.getFileHandle(`${prefix}${ext}`);
          if (fileHandle) return fileHandle;
        } catch {
        }
      }
    }
    if (typeof targetHandle.values === "function") {
      try {
        for await (const entry of targetHandle.values()) {
          if (entry && entry.kind === "file" && entry.name) {
            const entryNameLower = entry.name.toLowerCase();
            for (const base of baseNames) {
              if (entryNameLower.startsWith(base.toLowerCase())) {
                return entry;
              }
            }
          }
        }
      } catch {
      }
    }
    return null;
  };
  try {
    const foundRoot = await searchInDirectory(dirHandle);
    if (foundRoot) return foundRoot;
  } catch {
  }
  if (customerFileName) {
    try {
      const subDirHandle = await getCustomerSubDirHandle(dirHandle, customerFileName);
      if (subDirHandle) {
        const foundSub = await searchInDirectory(subDirHandle);
        if (foundSub) return foundSub;
      }
    } catch {
    }
  }
  return null;
};
const fetchProductImageBlob = async (filename, dirHandle, customerFileName) => {
  if (!filename) return null;
  if (typeof indexedDB !== "undefined") {
    try {
      const cachedBlob = await getCachedImage(filename);
      if (cachedBlob && cachedBlob instanceof Blob && cachedBlob.type.startsWith("image/")) {
        return cachedBlob;
      }
    } catch (err) {
      console.error("Cache load failed for export:", err);
    }
  }
  try {
    const response = await fetch(`/_local_images/${filename}`);
    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.startsWith("image/")) {
        return await response.blob();
      }
    }
  } catch {
  }
  if (dirHandle) {
    try {
      const fileHandle = await findImageFileHandle(dirHandle, filename, customerFileName);
      if (fileHandle) {
        const file = await fileHandle.getFile();
        if (file) return file;
      }
    } catch {
    }
  }
  return null;
};
const getImageExtension = (blob) => {
  if (blob && blob.type && blob.type.includes("png")) {
    return "png";
  }
  return "jpeg";
};
const createProductExcelWorkbook = async (products, fileName, options = {}) => {
  const { includeImages = false, dirHandle = null } = options;
  if (!products || products.length === 0) {
    throw new Error("出力するデータがありません");
  }
  const companyName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社") : "顧客";
  const today = /* @__PURE__ */ new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("商品一覧");
  const lastColLetter = includeImages ? "M" : "L";
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `【${companyName} 様】 取扱商品一覧`;
  titleCell.font = { name: "Yu Gothic", size: 18, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 50;
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const dateCell = worksheet.getCell("A2");
  dateCell.value = `出力日: ${dateStr}`;
  dateCell.font = { name: "Yu Gothic", size: 10, italic: true, color: { argb: "FF475569" } };
  dateCell.alignment = { vertical: "middle", horizontal: "right" };
  worksheet.getRow(2).height = 25;
  worksheet.addRow([]);
  worksheet.getRow(3).height = 15;
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
  headerRow.eachCell((cell) => {
    cell.font = { name: "Yu Gothic", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }
      // 落ち着いたミッドナイトブルー
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF475569" } }
    };
  });
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const displayName = item["種別"] === "既製品" ? item["商品名"] : item["タイトル"];
    const price = item["単価"] && !isNaN(Number(item["単価"])) ? Number(item["単価"]) : null;
    const printingCost = item["印刷代"] && !isNaN(Number(item["印刷代"])) ? Number(item["印刷代"]) : null;
    const rawDate = item["最新受注日"] || "";
    const formattedDate = rawDate ? String(rawDate).trim().replace(/-/g, "/") : "";
    const rowData = includeImages ? [
      i + 1,
      "",
      // 画像セル（埋め込み用プレースホルダー）
      item["受注№"] || "",
      item["商品コード"] || "",
      displayName || "",
      item["種別"] || "",
      item["形状"] || "",
      item["材質名称"] || "",
      item["重量"] || "",
      price,
      printingCost,
      item["JANコード"] || "",
      formattedDate
    ] : [
      i + 1,
      item["受注№"] || "",
      item["商品コード"] || "",
      displayName || "",
      item["種別"] || "",
      item["形状"] || "",
      item["材質名称"] || "",
      item["重量"] || "",
      price,
      printingCost,
      item["JANコード"] || "",
      formattedDate
    ];
    const row = worksheet.addRow(rowData);
    const currentRowNumber = row.number;
    row.height = includeImages ? 60 : 25;
    const isEven = i % 2 === 1;
    const rowBgColor = isEven ? "FFF8FAFC" : "FFFFFFFF";
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Yu Gothic", size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBgColor }
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };
      const centerCols = includeImages ? [1, 2, 3, 4, 6, 7, 8, 9, 13] : [1, 2, 3, 5, 6, 7, 8, 12];
      const rightCols = includeImages ? [10, 11] : [9, 10];
      if (centerCols.includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (rightCols.includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }
      if (rightCols.includes(colNumber) && cell.value !== null) {
        cell.numFmt = '"¥"#,##0';
      }
    });
    if (includeImages && item["受注№"]) {
      try {
        const imageBlob = await fetchProductImageBlob(item["受注№"], dirHandle, fileName);
        if (imageBlob && imageBlob instanceof Blob) {
          const arrayBuffer = await imageBlob.arrayBuffer();
          const ext = getImageExtension(imageBlob);
          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: ext
          });
          worksheet.addImage(imageId, {
            tl: { col: 1.1, row: currentRowNumber - 1 + 0.1 },
            br: { col: 1.9, row: currentRowNumber - 0.1 },
            editAs: "oneCell"
          });
        }
      } catch (err) {
        console.error(`Excel画像埋め込みエラー (${item["受注№"]}):`, err);
      }
    }
  }
  worksheet.columns.forEach((col, colIdx) => {
    if (colIdx === 0) {
      col.width = 8;
      return;
    }
    if (includeImages && colIdx === 1) {
      col.width = 14;
      return;
    }
    let maxLen = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.row < 4) return;
      if (cell.value !== void 0 && cell.value !== null) {
        const str = String(cell.value);
        const len = str.split("").reduce((acc, char) => acc + (char.charCodeAt(0) > 127 ? 2 : 1), 0);
        if (len > maxLen) {
          maxLen = len;
        }
      }
    });
    col.width = maxLen + 5;
  });
  return workbook;
};
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result || "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
const createProductHtmlString = async (products, fileName, dirHandle) => {
  if (!products || products.length === 0) {
    throw new Error("出力するデータがありません");
  }
  const companyName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社") : "顧客";
  const today = /* @__PURE__ */ new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  let tableRows = "";
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    const displayName = item["種別"] === "既製品" ? item["商品名"] : item["タイトル"];
    const rawDate = item["最新受注日"] || "";
    const formattedDate = rawDate ? String(rawDate).trim().replace(/-/g, "/") : "";
    let imageSrc = "";
    const filename = item["受注№"];
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
    const imageTag = imageSrc ? `<img src="${imageSrc}" alt="${displayName}" class="product-img" onclick="openModal(this)" />` : '<span class="no-img-text">No Image</span>';
    tableRows += `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center image-cell">${imageTag}</td>
        <td class="text-center font-mono">${item["受注№"] || "-"}</td>
        <td class="text-center font-mono">${item["商品コード"] || "-"}</td>
        <td class="text-center">${displayName || "-"}</td>
        <td class="text-center">${item["種別"] || "-"}</td>
        <td class="text-center">${item["形状"] || "-"}</td>
        <td>${item["材質名称"] || "-"}</td>
        <td class="text-center">${item["重量"] || "-"}</td>
        <td class="text-center font-mono">${item["JANコード"] || "-"}</td>
        <td class="text-center">${formattedDate || "-"}</td>
      </tr>
    `;
  }
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
  <\/script>
</body>
</html>`;
  return htmlContent;
};
const ProductImage = ({ dirHandle, imageFilesMap, filename, customerFileName, productCode, className, onClick }) => {
  const [imageUrl, setImageUrl] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(false);
  const [isVisible, setIsVisible] = reactExports.useState(false);
  const [isLoaded, setIsLoaded] = reactExports.useState(false);
  const imgRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px" }
    );
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);
  const updateImageUrl = (newUrl) => {
    setIsLoaded(false);
    setImageUrl((prevUrl) => {
      if (prevUrl && prevUrl.startsWith("blob:") && prevUrl !== newUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      return newUrl;
    });
  };
  reactExports.useEffect(() => {
    return () => {
      setImageUrl((prevUrl) => {
        if (prevUrl && prevUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, []);
  reactExports.useEffect(() => {
    if (!isVisible) return;
    let isCancelled = false;
    const loadImage = async () => {
      updateImageUrl(null);
      setError(false);
      const cleanKey = (val) => {
        if (!val) return "";
        return String(val).trim().replace(/,/g, "").replace(/\.0+$/, "").replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248));
      };
      const searchKeys = Array.from(/* @__PURE__ */ new Set([
        cleanKey(filename),
        cleanKey(productCode),
        String(filename || "").trim(),
        String(productCode || "").trim()
      ])).filter(Boolean);
      if (imageFilesMap && imageFilesMap.size > 0) {
        const customerPrefix = customerFileName ? customerFileName.replace(/\.[^/.]+$/, "").trim().toLowerCase() : "";
        const codeMatch = customerPrefix.match(/^([0-9a-z]+)/i);
        const customerCode = codeMatch ? codeMatch[1].toLowerCase() : "";
        for (const key of searchKeys) {
          const kLower = key.toLowerCase();
          const candidates = [
            kLower,
            `${kLower}a`,
            `${kLower}_1`,
            `${kLower}_a`,
            `${kLower}-1`,
            `${kLower}-a`,
            `${customerPrefix}/${kLower}`,
            `${customerPrefix}/${kLower}a`,
            `${customerPrefix}/${kLower}_1`,
            `${customerCode}/${kLower}`,
            `${customerCode}/${kLower}a`,
            `${customerCode}/${kLower}_1`
          ].filter(Boolean);
          for (const cand of candidates) {
            const file = imageFilesMap.get(cand);
            if (file) {
              const objectUrl = URL.createObjectURL(file);
              if (isCancelled) {
                URL.revokeObjectURL(objectUrl);
                return;
              }
              updateImageUrl(objectUrl);
              setError(false);
              return;
            }
          }
          for (const [mapKey, file] of imageFilesMap.entries()) {
            if (mapKey.startsWith(kLower) || customerPrefix && mapKey.startsWith(`${customerPrefix}/${kLower}`)) {
              const objectUrl = URL.createObjectURL(file);
              if (isCancelled) {
                URL.revokeObjectURL(objectUrl);
                return;
              }
              updateImageUrl(objectUrl);
              setError(false);
              return;
            }
          }
        }
      }
      for (const key of searchKeys) {
        try {
          const variants = [
            key,
            `${key}A`,
            `${key}a`,
            `${key}_1`,
            `${key}_A`,
            `${key}-1`,
            `${key}-A`
          ];
          for (const variant of variants) {
            const cachedBlob = await getCachedImage(variant);
            if (isCancelled) return;
            if (cachedBlob && cachedBlob instanceof Blob && cachedBlob.type.startsWith("image/")) {
              const objectUrl = URL.createObjectURL(cachedBlob);
              if (isCancelled) {
                URL.revokeObjectURL(objectUrl);
                return;
              }
              updateImageUrl(objectUrl);
              setError(false);
              return;
            }
          }
        } catch (err) {
          console.error("Error loading cached image:", err);
        }
      }
      for (const key of searchKeys) {
        try {
          const response = await fetch(`/_local_images/${key}`);
          if (isCancelled) return;
          if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.startsWith("image/")) {
              const blob = await response.blob();
              try {
                await cacheImage(key, blob);
              } catch {
              }
              if (isCancelled) return;
              const objectUrl = URL.createObjectURL(blob);
              if (isCancelled) {
                URL.revokeObjectURL(objectUrl);
                return;
              }
              updateImageUrl(objectUrl);
              setError(false);
              return;
            }
          }
        } catch {
        }
      }
      if (dirHandle) {
        for (const key of searchKeys) {
          try {
            const fileHandle = await findImageFileHandle(dirHandle, key, customerFileName);
            if (isCancelled) return;
            if (fileHandle) {
              const file = await fileHandle.getFile();
              try {
                await cacheImage(key, file);
              } catch {
              }
              if (isCancelled) return;
              const objectUrl = URL.createObjectURL(file);
              if (isCancelled) {
                URL.revokeObjectURL(objectUrl);
                return;
              }
              updateImageUrl(objectUrl);
              setError(false);
              return;
            }
          } catch (err) {
            console.error("Error loading local image from dirHandle:", err);
          }
        }
      }
      if (!isCancelled) {
        setError(true);
      }
    };
    loadImage();
    return () => {
      isCancelled = true;
    };
  }, [dirHandle, imageFilesMap, filename, customerFileName, productCode, isVisible]);
  if (!isVisible) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: imgRef, className: `product-image-container ${className || ""} placeholder`, style: { minHeight: "100px", background: "#f0f0f0" } });
  }
  if (error || !imageUrl) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `no-image ${className || ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 24 }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `product-image-container ${className || ""}`,
      onClick: () => onClick && onClick(imageUrl),
      style: { cursor: onClick ? "pointer" : "default" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          src: imageUrl,
          alt: filename || productCode,
          className: `product-thumbnail image-fade-in ${isLoaded ? "loaded" : ""}`,
          onLoad: () => setIsLoaded(true),
          onError: () => {
            console.error(`Failed to load image for ${filename || productCode}`);
            setError(true);
          }
        }
      )
    }
  );
};
const ProductImage$1 = React.memo(ProductImage);
const ImageModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "image-modal-content", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "modal-close-btn", onClick: onClose, children: "×" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: imageUrl, alt: "拡大画像", className: "modal-image-large" })
  ] }) });
};
const OrderSheet = React.forwardRef(({ cart, totalAmount, date, fileName }, ref) => {
  const formatDate = (dateObj) => {
    const d = dateObj || /* @__PURE__ */ new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const companyName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社") : "株式会社サンプル商事";
  const getUnit = (item) => {
    const type = item["形状"] ? String(item["形状"]).trim() : "";
    if (type === "RA" || type === "RZ") return "m";
    if (type === "単袋") return "枚";
    return "個";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "order-sheet-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref, className: "order-sheet-container", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "order-sheet-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "order-sheet-title", children: "発注書" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "order-sheet-date", children: [
        "発注日: ",
        formatDate(date)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "order-sheet-info", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "order-sheet-recipient", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "recipient-name", children: "株式会社アサヒパック 御中" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "下記商品を注文いたします。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "order-sheet-sender", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sender-company", children: companyName }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "order-sheet-table", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-no", children: "No." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-order-no", children: "受注No" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-code", children: "商品コード" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-name", children: "品名" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-qty", children: "数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-unit", children: "単位" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-price", children: "単価" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-print", children: "印刷代" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "col-amount", children: "金額" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        cart.map((item, index) => {
          const price = parseFloat(item["単価"]) || 0;
          const printingCost = parseFloat(item["印刷代"]) || 0;
          const itemTotal = price * item.quantity + printingCost;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-no", children: index + 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-order-no", children: item["受注№"] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-code", children: item["商品コード"] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-name", children: item["タイトル"] || item["品名"] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-qty", children: item.quantity }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-unit", children: getUnit(item) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-price", children: item["単価"] ? `¥${price.toLocaleString()}` : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-print", children: printingCost > 0 ? `¥${printingCost.toLocaleString()}` : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-amount", children: item["単価"] ? `¥${itemTotal.toLocaleString()}` : "-" })
          ] }, index);
        }),
        Array.from({ length: Math.max(0, 10 - cart.length) }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-no" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-order-no" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-qty" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-unit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-price" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-print" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "col-amount" })
        ] }, `empty-${i}`))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "order-sheet-summary", children: /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "summary-table", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "合計金額" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
        "¥",
        totalAmount.toLocaleString()
      ] })
    ] }) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "order-sheet-footer", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "remarks-box", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "remarks-title", children: "備考" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "希望納期: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "納品場所:"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "seal-box", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seal-item", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seal-title", children: "承認" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seal-item", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seal-title", children: "審査" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seal-item", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seal-title", children: "担当" }) })
      ] })
    ] })
  ] }) });
});
const CartModal = ({ cart, onClose, onUpdateQuantity, onRemove, onClear, total, fileName }) => {
  const [copied, setCopied] = reactExports.useState(false);
  const componentRef = reactExports.useRef();
  const handlePrint = libExports.useReactToPrint({
    contentRef: componentRef
  });
  const generateEmailText = () => {
    const date = (/* @__PURE__ */ new Date()).toLocaleDateString("ja-JP");
    const companyName = fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社") : "株式会社サンプル商事";
    let emailText = `お疲れ様です。

`;
    emailText += `【注文依頼】

`;
    emailText += `注文日: ${date}
`;
    emailText += `発注者: ${companyName}

`;
    emailText += `商品一覧:
`;
    emailText += `${"=".repeat(60)}

`;
    cart.forEach((item, index) => {
      const displayName = item["種別"] === "既製品" ? item["商品名"] : item["タイトル"];
      emailText += `${index + 1}. ${displayName}
`;
      emailText += `   受注№: ${item["受注№"]}
`;
      emailText += `   商品コード: ${item["商品コード"]}
`;
      emailText += `   材質: ${item["材質名称"]}
`;
      emailText += `   重量: ${item["重量"]}
`;
      emailText += `   数量: ${item.quantity}
`;
      emailText += `
`;
    });
    emailText += `${"=".repeat(60)}
`;
    emailText += `商品点数: ${cart.length}点

`;
    emailText += `よろしくお願いいたします。
`;
    return emailText;
  };
  const handleCopyEmail = async () => {
    const emailText = generateEmailText();
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("コピーに失敗しました");
    }
  };
  if (!cart || cart.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-modal-content", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "modal-close-btn", onClick: onClose, children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-empty", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingCart, { size: 64 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "カートは空です" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "商品を追加してください" })
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-overlay", onClick: onClose, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-modal-content", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "modal-close-btn", onClick: onClose, children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingCart, { size: 24 }),
          " カート (",
          cart.length,
          "件)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "cart-clear-btn", onClick: onClear, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 16 }),
          "全てクリア"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cart-items", children: cart.map((item, index) => {
        const price = parseFloat(item["単価"]) || 0;
        const printingCost = parseFloat(item["印刷代"]) || 0;
        const itemTotal = price * item.quantity + printingCost;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-item-info", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: item["種別"] === "既製品" ? item["商品名"] : item["タイトル"] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "cart-item-meta", children: [
              "#",
              item["受注№"],
              " | ",
              item["材質名称"]
            ] }),
            item["単価"] && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-item-price-details", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                "単価: ¥",
                price.toLocaleString(),
                " × ",
                item.quantity
              ] }),
              printingCost > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                "印刷代: ¥",
                printingCost.toLocaleString()
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "cart-item-subtotal", children: [
                "小計: ¥",
                itemTotal.toLocaleString()
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-item-controls", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-quantity-controls", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onUpdateQuantity(item.cartId, item.quantity - 100), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { size: 16 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  value: item.quantity,
                  onChange: (e) => onUpdateQuantity(item.cartId, parseInt(e.target.value) || 0),
                  min: "0",
                  step: "100"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onUpdateQuantity(item.cartId, item.quantity + 100), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16 }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "cart-remove-btn", onClick: () => onRemove(item.cartId), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 16 }) })
          ] })
        ] }, index);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-footer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-total", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "合計:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "cart-total-price", children: [
            "¥",
            total.toLocaleString()
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cart-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "cart-print-btn",
              onClick: handlePrint,
              children: "発注書作成"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `cart-checkout-btn ${copied ? "copied" : ""}`,
              onClick: handleCopyEmail,
              children: copied ? "✓ コピーしました！" : "メール文章をコピー"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "none" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      OrderSheet,
      {
        ref: componentRef,
        cart,
        totalAmount: total,
        fileName
      }
    ) })
  ] });
};
const ProductDetailsModal = ({ product, onClose, dirHandle, onNext, onPrev, hasNext, hasPrev }) => {
  const [currentImageIndex, setCurrentImageIndex] = reactExports.useState(0);
  const [availableImages, setAvailableImages] = reactExports.useState([]);
  const [isSwitching, setIsSwitching] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let timer;
    const animFrame = requestAnimationFrame(() => {
      setIsSwitching(true);
      timer = setTimeout(() => setIsSwitching(false), 200);
    });
    return () => {
      cancelAnimationFrame(animFrame);
      if (timer) clearTimeout(timer);
    };
  }, [currentImageIndex, product]);
  reactExports.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && hasNext) {
        onNext();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, hasPrev, onNext, onPrev, onClose]);
  reactExports.useEffect(() => {
    let isCancelled = false;
    const createdUrls = [];
    const checkImages = async () => {
      if (!product) return;
      const images = [];
      const suffixes = ["", "A", "B", "C", "D", "E", "F", "G", "H"];
      const extensions = [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"];
      if (dirHandle) {
        for (const suffix of suffixes) {
          for (const ext of extensions) {
            if (isCancelled) break;
            try {
              const filename = `${product["受注№"]}${suffix}${ext}`;
              const fileHandle = await dirHandle.getFileHandle(filename);
              if (isCancelled) break;
              if (fileHandle) {
                const file = await fileHandle.getFile();
                if (isCancelled) break;
                const url = URL.createObjectURL(file);
                if (isCancelled) {
                  URL.revokeObjectURL(url);
                  break;
                }
                createdUrls.push(url);
                images.push({ url, suffix, source: "local" });
                break;
              }
            } catch {
            }
          }
        }
      }
      if (isCancelled) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setAvailableImages((prevImages) => {
        prevImages.forEach((img) => {
          if (img.source === "local") {
            URL.revokeObjectURL(img.url);
          }
        });
        return images;
      });
      setCurrentImageIndex(0);
    };
    checkImages();
    return () => {
      isCancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [product, dirHandle]);
  reactExports.useEffect(() => {
    return () => {
      setAvailableImages((prevImages) => {
        prevImages.forEach((img) => {
          if (img.source === "local") {
            URL.revokeObjectURL(img.url);
          }
        });
        return [];
      });
    };
  }, []);
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : availableImages.length - 1);
  };
  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => prev < availableImages.length - 1 ? prev + 1 : 0);
  };
  if (!product) return null;
  const currentImage = availableImages[currentImageIndex];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "product-details-modal-overlay", onClick: onClose, children: [
    hasPrev && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "product-nav-btn prev",
        onClick: (e) => {
          e.stopPropagation();
          onPrev();
        },
        title: "前の商品 (←)",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 48 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "product-details-modal-content", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "modal-close-btn", onClick: onClose, children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "product-details-layout", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "product-details-image-section", children: availableImages.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "product-details-main-image-container", children: [
          currentImage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: currentImage.url,
              alt: `${product["タイトル"]} - ${currentImage.suffix}`,
              className: `product-details-image ${isSwitching ? "switching" : ""}`
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "no-image", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 64 }) }),
          availableImages.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "image-nav-btn prev", onClick: handlePrevImage, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 24 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "image-nav-btn next", onClick: handleNextImage, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 24 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "image-indicator", children: [
              currentImageIndex + 1,
              " / ",
              availableImages.length,
              currentImage && ` (${currentImage.suffix})`
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "no-image", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 64 }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "product-details-info-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header-container", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `product-badge ${product["種別"] === "既製品" ? "ready-made" : "custom-made"}`, children: product["種別"] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "modal-title", children: product["種別"] === "既製品" ? product["商品名"] : product["タイトル"] || product["商品名"] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-section", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "section-title", children: "基本情報" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-grid", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "受注№" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["受注№"] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "種別" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["種別"] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "商品コード" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["商品コード"] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "JANコード" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["JANコード"] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-section", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "section-title", children: "仕様" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-grid single-column", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "形状" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["形状"] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "重量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["重量"] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "材質名称" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["材質名称"] })
              ] })
            ] })
          ] }),
          (product["表色数"] != null || product["裏色数"] != null || product["総色数"] != null) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-section", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "section-title", children: "印刷情報" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-grid single-column", children: [
              product["表色数"] != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "表色数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["表色数"] })
              ] }),
              product["裏色数"] != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "裏色数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["裏色数"] })
              ] }),
              product["総色数"] != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "総色数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["総色数"] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-section highlight", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "section-title", children: "価格・数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-grid single-column", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row highlight", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "受注数" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["受注数"] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row highlight", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "単価" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["単価"] ? `¥${parseFloat(product["単価"]).toLocaleString()}` : "-" })
              ] }),
              product["印刷代"] != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row highlight", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "印刷代" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["印刷代"] ? `¥${parseFloat(product["印刷代"]).toLocaleString()}` : "-" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-section", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "section-title", children: "その他" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-grid", children: [
              product["直送先名称"] && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "直送先名称" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["直送先名称"] })
              ] }),
              product["最新受注日"] && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "info-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-label", children: "最新受注日" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "info-value", children: product["最新受注日"] })
              ] })
            ] })
          ] })
        ] })
      ] })
    ] }),
    hasNext && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "product-nav-btn next",
        onClick: (e) => {
          e.stopPropagation();
          onNext();
        },
        title: "次の商品 (→)",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 48 })
      }
    )
  ] });
};
const HighlightText = ({ text, keyword }) => {
  if (!keyword || !text) return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: text });
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escapedKeyword})`, "gi"));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: parts.map(
    (part, i) => part.toLowerCase() === keyword.toLowerCase() ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-highlight", children: part }, i) : part
  ) });
};
const ProductCard = ({ product, dirHandle, imageFilesMap, customerFileName, onClick, onAddToCart, keyword }) => {
  const getAgeColorClass = (dateStr) => {
    if (!dateStr) return "";
    const orderDate = new Date(dateStr);
    const now = /* @__PURE__ */ new Date();
    const monthsDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());
    if (monthsDiff >= 24) return "age-alert-red";
    if (monthsDiff >= 22) return "age-alert-yellow";
    return "";
  };
  const ageClass = getAgeColorClass(product["最新受注日"]);
  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart(product);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `amazon-product-card ${ageClass}`, onClick, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "amazon-card-image-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProductImage$1,
      {
        dirHandle,
        imageFilesMap,
        filename: product["受注№"],
        productCode: product["商品コード"],
        customerFileName,
        className: "amazon-card-image"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-card-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "amazon-card-title", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        HighlightText,
        {
          text: product["種別"] === "既製品" ? product["商品名"] : product["タイトル"] || product["商品名"],
          keyword
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-card-meta", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "amazon-card-order-no", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightText, { text: product["受注№"], keyword }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "amazon-card-code", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightText, { text: product["商品コード"], keyword }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-card-details", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-detail-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "amazon-detail-label", children: "材質:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "amazon-detail-value", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightText, { text: product["材質名称"], keyword }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-detail-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "amazon-detail-label", children: "直送先:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "amazon-detail-value", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightText, { text: product["直送先名称"], keyword }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-card-price", children: [
          product["単価"] ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "¥",
            parseFloat(String(product["単価"]).replace(/,/g, "")).toLocaleString()
          ] }) : null,
          product["単価"] && product["印刷代"] ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: " + " }) : null,
          product["印刷代"] ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "print-cost-label", children: [
            "印刷代 ¥",
            parseFloat(String(product["印刷代"]).replace(/,/g, "")).toLocaleString()
          ] }) : null
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          className: "amazon-add-to-cart-btn",
          onClick: handleAddToCart,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingCart, { size: 18 }),
            "カートに追加"
          ]
        }
      )
    ] })
  ] });
};
const ProductCard$1 = React.memo(ProductCard, (prevProps, nextProps) => {
  return prevProps.product["受注№"] === nextProps.product["受注№"] && prevProps.keyword === nextProps.keyword && prevProps.dirHandle === nextProps.dirHandle && prevProps.imageFilesMap === nextProps.imageFilesMap && prevProps.customerFileName === nextProps.customerFileName;
});
const Toast = ({ message, type = "success", isVisible, onClose }) => {
  reactExports.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3e3);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);
  if (!isVisible) return null;
  const bgColor = type === "success" ? "bg-white" : "bg-white";
  const borderColor = type === "success" ? "border-l-4 border-[#067D62]" : "border-l-4 border-[#CC0C39]";
  const iconColor = type === "success" ? "text-[#067D62]" : "text-[#CC0C39]";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `fixed top-4 left-1/2 transform -translate-x-1/2 z-[2000] flex items-center gap-3 px-4 py-3 rounded shadow-lg ${bgColor} ${borderColor} min-w-[300px] max-w-[90vw] animate-slide-down`, children: [
    type === "success" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: iconColor, size: 20 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: iconColor, size: 20 }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-gray-800 flex-1", children: message }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 }) })
  ] });
};
const ErrorBanner = ({ error, onClose }) => {
  if (!error) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error-banner", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 20, className: "error-icon" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "error-message", children: error })
    ] }),
    onClose && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "error-close-btn", "aria-label": "エラーを閉じる", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18 }) })
  ] });
};
const CacheManager = ({ onClose }) => {
  const [stats, setStats] = reactExports.useState({ count: 0, totalSizeMB: "0.00" });
  const [isClearing, setIsClearing] = reactExports.useState(false);
  const loadStats = async () => {
    const cacheStats = await getCacheStats();
    setStats(cacheStats);
  };
  reactExports.useEffect(() => {
    loadStats();
  }, []);
  const handleClearImages = async () => {
    if (!confirm("すべての画像キャッシュを削除しますか？\n（画像は再度読み込まれます）")) return;
    setIsClearing(true);
    try {
      await clearImageCache();
      await loadStats();
      alert("画像キャッシュをクリアしました");
    } catch {
      alert("キャッシュのクリアに失敗しました");
    } finally {
      setIsClearing(false);
    }
  };
  const handleClearData = async () => {
    if (!confirm("保存されたExcelデータを削除しますか？\n（次回アプリ起動時に再度ファイル読み込みが必要になります）")) return;
    setIsClearing(true);
    try {
      await del("productData");
      await del("fileName");
      await del("lastModified");
      await del("customerDirHandle");
      await del("customerFilesCache");
      await del("customerFilesListCache");
      alert("商品データおよび顧客接続キャッシュを削除しました。\n反映するにはページを再読み込みしてください。");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("データの削除に失敗しました");
      setIsClearing(false);
    }
  };
  const handleForceUpdateApp = async () => {
    if (!confirm("アプリの全キャッシュ（Service Worker・全画像・データ）をクリアして最新版に更新しますか？")) return;
    setIsClearing(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ("caches" in window) {
        const keys2 = await caches.keys();
        await Promise.all(keys2.map((key) => caches.delete(key)));
      }
      await clearImageCache();
      await del("productData");
      await del("fileName");
      await del("lastModified");
      await del("customerDirHandle");
      await del("customerFilesCache");
      await del("customerFilesListCache");
      alert("すべてのキャッシュを削除しました。最新版に再読み込みします。");
      window.location.reload();
    } catch (err) {
      console.error("Failed to force update app:", err);
      alert("更新処理中にエラーが発生しました");
      setIsClearing(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-manager-modal", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-manager-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { size: 24 }),
        "キャッシュ管理"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "modal-close-btn", children: "×" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-manager-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cache-stats", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-stat-item", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "cache-stat-label", children: "画像キャッシュ:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "cache-stat-value", children: [
          stats.count,
          " 枚 (",
          stats.totalSizeMB,
          " MB)"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-actions-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "アプリ更新" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: handleForceUpdateApp,
              className: "cache-btn cache-btn-primary",
              style: { backgroundColor: "var(--color-primary)", color: "var(--color-surface)" },
              disabled: isClearing,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 18 }),
                "最新版に強制更新（全キャッシュ削除）"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "cache-desc", children: "古いバージョンのキャッシュが残っている場合に、Service Workerと全キャッシュを破棄して最新版に強制アップデートします。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "データ管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: handleClearData,
              className: "cache-btn cache-btn-warning",
              disabled: isClearing,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileX, { size: 18 }),
                "商品データを削除"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "cache-desc", children: [
            "読み込んだExcelデータを削除します。",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "表示がおかしい時などに試してください。"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "画像管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cache-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: loadStats,
              className: "cache-btn cache-btn-secondary",
              disabled: isClearing,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 18 }),
                "更新"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: handleClearImages,
              className: "cache-btn cache-btn-danger",
              disabled: isClearing || stats.count === 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 18 }),
                "画像を全削除"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cache-info", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "💡 データは自動的に保存され、次回起動時に高速表示されます" }) })
    ] })
  ] }) });
};
const useToast = () => {
  const [toast, setToast] = reactExports.useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };
  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };
  return {
    toast,
    showToast,
    hideToast
  };
};
const useCart = (showToast) => {
  const [cart, setCart] = reactExports.useState([]);
  const [showCart, setShowCart] = reactExports.useState(false);
  const addToCart = (product, quantity = 1) => {
    const qtyToAdd = quantity === 1 && product["受注数"] ? Number(product["受注数"]) : quantity;
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item["商品コード"] === product["商品コード"] && item["受注№"] === product["受注№"]
      );
      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += qtyToAdd;
        return newCart;
      } else {
        const cartId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return [...prevCart, { ...product, quantity: qtyToAdd, cartId }];
      }
    });
    if (showToast) {
      showToast(`${product["商品名"] || product["タイトル"]}をカートに追加しました`);
    }
  };
  const updateCartQuantity = (cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
    } else {
      setCart(cart.map(
        (item) => item.cartId === cartId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };
  const removeFromCart = (cartId) => {
    setCart(cart.filter((item) => item.cartId !== cartId));
  };
  const clearCart = () => {
    setCart([]);
  };
  const cartTotal = cart.reduce((sum, item) => {
    const price = parseFloat(item["単価"]) || 0;
    const printingCost = parseFloat(item["印刷代"]) || 0;
    return sum + price * item.quantity + printingCost;
  }, 0);
  const cartItemCount = cart.length;
  return {
    cart,
    showCart,
    setShowCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemCount
  };
};
const REQUIRED_COLUMNS = ["受注№", "商品コード", "商品名"];
const getExcelFilesFromDir = async (dirHandle) => {
  const files = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file" && (entry.name.endsWith(".xlsx") || entry.name.endsWith(".xls"))) {
        files.push({
          name: entry.name,
          handle: entry
        });
      }
    }
  } catch (err) {
    console.error("Error reading directory entries:", err);
  }
  return files;
};
const isFileSystemSupported = typeof window !== "undefined" && !!window.showDirectoryPicker;
const useProductData = () => {
  const [data, setData] = reactExports.useState([]);
  const [fileName, setFileName] = reactExports.useState("");
  const [lastModified, setLastModified] = reactExports.useState(null);
  const [dirHandle, setDirHandle] = reactExports.useState(null);
  const [permissionGranted, setPermissionGranted] = reactExports.useState(false);
  const [customerDirHandle, setCustomerDirHandle] = reactExports.useState(null);
  const [customerPermissionGranted, setCustomerPermissionGranted] = reactExports.useState(false);
  const [customerFiles, setCustomerFiles] = reactExports.useState([]);
  const [error, setError] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const loadCachedData = async () => {
      try {
        setIsLoading(true);
        const cachedData = await get("productData");
        const cachedFileName = await get("fileName");
        const cachedLastModified = await get("lastModified");
        const cachedDirHandle = await get("imageDirHandle");
        const cachedCustomerDirHandle = isFileSystemSupported ? await get("customerDirHandle") : null;
        if (cachedData) setData(cachedData);
        if (cachedFileName) setFileName(cachedFileName);
        if (cachedLastModified) setLastModified(cachedLastModified);
        if (cachedDirHandle && isFileSystemSupported) {
          setDirHandle(cachedDirHandle);
          const options = { mode: "read" };
          const permission = await cachedDirHandle.queryPermission(options);
          if (permission === "granted") {
            setPermissionGranted(true);
          } else {
            setPermissionGranted(false);
          }
        }
        if (cachedCustomerDirHandle && isFileSystemSupported) {
          setCustomerDirHandle(cachedCustomerDirHandle);
          const options = { mode: "read" };
          const permission = await cachedCustomerDirHandle.queryPermission(options);
          if (permission === "granted") {
            setCustomerPermissionGranted(true);
            const files = await getExcelFilesFromDir(cachedCustomerDirHandle);
            files.sort((a, b) => a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" }));
            setCustomerFiles(files);
          } else {
            const cachedCustomerFilesList = await get("customerFilesListCache");
            if (cachedCustomerFilesList && cachedCustomerFilesList.length > 0) {
              setCustomerFiles(cachedCustomerFilesList);
              setCustomerPermissionGranted(true);
            } else {
              setCustomerPermissionGranted(false);
            }
          }
        } else if (!isFileSystemSupported) {
          const cachedCustomerFiles = await get("customerFilesCache");
          if (cachedCustomerFiles && cachedCustomerFiles.length > 0) {
            setCustomerFiles(cachedCustomerFiles);
            setCustomerPermissionGranted(true);
          }
        }
      } catch (err) {
        console.error("Error loading cache:", err);
        setError("キャッシュの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    loadCachedData();
  }, []);
  const validateData = (jsonData) => {
    if (!jsonData || jsonData.length === 0) {
      throw new Error("データが空です");
    }
    const firstRow = jsonData[0];
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !(col in firstRow));
    if (missingColumns.length > 0) {
      throw new Error(`必須列が見つかりません: ${missingColumns.join(", ")}`);
    }
    return true;
  };
  const processExcelFile = async (file) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setLastModified(file.lastModified);
    if (file.size === 0) {
      console.log("File size is 0. Attempting to wake up cloud file...");
    }
    const readWithRetry = async (attempt = 1) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1500;
      if (file.size === 0) {
        setError(`クラウドからデータを取得中... (${attempt}/${MAX_RETRIES})`);
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
          reject(new Error(`Read failed (Code: ${reader.error?.code})`));
        };
        reader.onload = (evt) => {
          const buffer = evt.target.result;
          if (buffer.byteLength === 0 && attempt <= MAX_RETRIES) {
            console.warn(`Attempt ${attempt}: Read 0 bytes. Retrying...`);
            setTimeout(() => readWithRetry(attempt + 1).then(resolve).catch(reject), RETRY_DELAY);
          } else {
            resolve(buffer);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    };
    try {
      if (file.size === 0) {
        setError("クラウドからデータを取得中... (これには数秒かかる場合があります)");
      }
      const buffer = await readWithRetry();
      if (buffer.byteLength === 0) {
        throw new Error("File is empty after retries");
      }
      console.log(`Buffer loaded: ${buffer.byteLength} bytes`);
      const parseExcelDirectly = () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              const DO_NOT_PROCESS = { cellStyles: false, cellFormula: false, cellHTML: false, cellNF: false, cellText: false };
              const workbook = readSync(buffer, { type: "array", dense: true, ...DO_NOT_PROCESS });
              if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error("シートが見つかりません");
              }
              const wsname = workbook.SheetNames[0];
              const ws = workbook.Sheets[wsname];
              const jsonData = utils.sheet_to_json(ws);
              resolve(jsonData);
            } catch (err) {
              reject(err);
            }
          }, 0);
        });
      };
      try {
        const parsedData = await parseExcelDirectly();
        validateData(parsedData);
        setData(parsedData);
        set("productData", parsedData);
        set("fileName", file.name);
        set("lastModified", file.lastModified);
        setError(null);
      } catch (err) {
        console.error("Parsing failed:", err);
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        let userMsg = `エラーが発生しました (File: ${sizeMB}MB)`;
        if (err.message && err.message.includes("Bad compressed size")) {
          userMsg = `ファイルが破損しているか、ダウンロードが完了していません。
(Bad compressed size)

スマホの場合は、iCloud/Google Driveから「このiPhone内」に保存してから再度お試しください。`;
        } else if (err.message && err.message.includes("Password")) {
          userMsg = "パスワード保護されたファイルは読み込めません。";
        } else {
          userMsg = `ファイルの解析に失敗しました: ${err.message}`;
        }
        setError(userMsg);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("File processing error:", err);
      if (file.size === 0) {
        setError("ファイルの取得に失敗しました。クラウドからダウンロードされていない可能性があります。\n一度「ファイル」アプリで開いてから再度お試しください。");
      } else {
        setError("ファイルの読み込みに失敗しました。");
      }
      setIsLoading(false);
    }
  };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processExcelFile(file);
  };
  const [imageFilesMap, setImageFilesMap] = reactExports.useState(/* @__PURE__ */ new Map());
  const handleImageFilesSelect = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const newMap = new Map(imageFilesMap);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name;
      const dotIdx = name.lastIndexOf(".");
      const rawName = dotIdx > 0 ? name.substring(0, dotIdx).trim() : name.trim();
      const lowerRawName = rawName.toLowerCase();
      const lowerFileName = name.toLowerCase();
      newMap.set(lowerRawName, file);
      newMap.set(lowerFileName, file);
      const cleaned = lowerRawName.replace(/,/g, "").replace(/\.0+$/, "").replace(/[ａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248));
      if (cleaned !== lowerRawName) {
        newMap.set(cleaned, file);
      }
      const unpadded = cleaned.replace(/^0+/, "");
      if (unpadded && unpadded !== cleaned) {
        newMap.set(unpadded, file);
      }
      const relPath = file.webkitRelativePath;
      if (relPath) {
        const parts = relPath.split("/");
        if (parts.length > 1) {
          const folderSegment = parts[parts.length - 2].trim().toLowerCase();
          if (folderSegment) {
            newMap.set(`${folderSegment}/${lowerRawName}`, file);
            if (cleaned !== lowerRawName) {
              newMap.set(`${folderSegment}/${cleaned}`, file);
            }
            const codeMatch = folderSegment.match(/^([0-9a-z]+)/i);
            if (codeMatch) {
              const code = codeMatch[1].toLowerCase();
              newMap.set(`${code}/${lowerRawName}`, file);
              if (cleaned !== lowerRawName) {
                newMap.set(`${code}/${cleaned}`, file);
              }
            }
          }
        }
      }
    }
    setImageFilesMap(newMap);
    setPermissionGranted(true);
    setError(null);
  };
  const handleFolderSelect = async () => {
    try {
      if (isFileSystemSupported) {
        if (dirHandle) {
          const options = { mode: "read" };
          const permission = await dirHandle.requestPermission(options);
          if (permission === "granted") {
            setPermissionGranted(true);
            setError(null);
            return;
          }
        }
        const handle = await window.showDirectoryPicker();
        setDirHandle(handle);
        setPermissionGranted(true);
        setError(null);
        await set("imageDirHandle", handle);
        return;
      }
      document.getElementById("image-files-input")?.click();
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error selecting folder, falling back:", err);
        document.getElementById("image-files-input")?.click();
      }
    }
  };
  const handleCustomerFolderSelect = async () => {
    if (!isFileSystemSupported) return;
    try {
      if (customerDirHandle) {
        const options = { mode: "read" };
        const permission = await customerDirHandle.requestPermission(options);
        if (permission === "granted") {
          setCustomerPermissionGranted(true);
          const files2 = await getExcelFilesFromDir(customerDirHandle);
          files2.sort((a, b) => a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" }));
          setCustomerFiles(files2);
          await set("customerFilesListCache", files2.map((f) => ({ name: f.name })));
          setError(null);
          return;
        }
      }
      const handle = await window.showDirectoryPicker();
      setCustomerDirHandle(handle);
      setCustomerPermissionGranted(true);
      const files = await getExcelFilesFromDir(handle);
      files.sort((a, b) => a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" }));
      setCustomerFiles(files);
      setError(null);
      await set("customerDirHandle", handle);
      await set("customerFilesListCache", files.map((f) => ({ name: f.name })));
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error selecting customer folder:", err);
        setError("顧客フォルダの選択に失敗しました");
      }
    }
  };
  const handleCustomerFilesSelect = async (e) => {
    const files = Array.from(e.target.files).filter(
      (file) => file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    );
    const mappedFiles = files.map((file) => ({
      name: file.name,
      file
    }));
    mappedFiles.sort((a, b) => a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" }));
    setCustomerFiles(mappedFiles);
    setCustomerPermissionGranted(files.length > 0);
    setError(null);
    try {
      await set("customerFilesCache", mappedFiles);
    } catch (err) {
      console.error("Failed to cache customer files:", err);
    }
  };
  const loadCustomerFile = async (name) => {
    try {
      let file;
      if (isFileSystemSupported && customerDirHandle) {
        const options = { mode: "read" };
        let permission = await customerDirHandle.queryPermission(options);
        if (permission !== "granted") {
          permission = await customerDirHandle.requestPermission(options);
        }
        if (permission === "granted") {
          setCustomerPermissionGranted(true);
          const fileHandle = await customerDirHandle.getFileHandle(name);
          file = await fileHandle.getFile();
        } else {
          throw new Error("フォルダへのアクセス権限がありません");
        }
      } else {
        const found = customerFiles.find((f) => f.name === name);
        if (found && found.file) {
          file = found.file;
        }
      }
      if (file) {
        await processExcelFile(file);
      } else {
        throw new Error("ファイルが見つかりません");
      }
    } catch (err) {
      console.error("Error loading customer file:", err);
      setError(`顧客ファイル「${name}」の読み込みに失敗しました`);
    }
  };
  return {
    data,
    fileName,
    lastModified,
    dirHandle,
    imageFilesMap,
    permissionGranted,
    customerDirHandle,
    customerPermissionGranted,
    customerFiles,
    error,
    isLoading,
    isFileSystemSupported,
    handleFileUpload,
    handleFolderSelect,
    handleImageFilesSelect,
    handleCustomerFolderSelect,
    handleCustomerFilesSelect,
    loadCustomerFile,
    clearError: () => setError(null)
  };
};
const useProductFilters = (data) => {
  const [keyword, setKeyword] = reactExports.useState("");
  const [searchScope, setSearchScope] = reactExports.useState("all");
  const [sortBy, setSortBy] = reactExports.useState("");
  const [currentPage, setCurrentPage] = reactExports.useState(1);
  const [filters, setFilters] = reactExports.useState({
    "種別": [],
    "重量": [],
    "材質名称": [],
    "総色数": [],
    "直送先名称": []
  });
  const uniqueValues = reactExports.useMemo(() => {
    const getUnique = (key, sortFn) => {
      const values = [...new Set(data.map((item) => item[key]).filter(Boolean))];
      return sortFn ? values.sort(sortFn) : values.sort();
    };
    const numericSort = (a, b) => {
      const numA = parseFloat(a) || 0;
      const numB = parseFloat(b) || 0;
      return numA - numB;
    };
    return {
      "種別": getUnique("種別"),
      "重量": getUnique("重量", numericSort),
      "材質名称": getUnique("材質名称"),
      "総色数": getUnique("総色数"),
      "直送先名称": getUnique("直送先名称")
    };
  }, [data]);
  const suggestions = reactExports.useMemo(() => {
    if (!keyword || keyword.trim().length < 1) return [];
    const normalizedKeyword = keyword.toLowerCase().trim();
    const matches = /* @__PURE__ */ new Set();
    for (const item of data) {
      const title = item["タイトル"] || item["商品名"] || "";
      const code = item["商品コード"] || "";
      const orderNo = item["受注№"] || "";
      const material = item["材質名称"] || "";
      if (searchScope !== "code") {
        if (title.toLowerCase().includes(normalizedKeyword)) {
          matches.add(title);
        }
      }
      if (searchScope !== "title") {
        if (code.toLowerCase().includes(normalizedKeyword)) {
          matches.add(code);
        }
        if (orderNo.toLowerCase().includes(normalizedKeyword)) {
          matches.add(orderNo);
        }
      }
      if (searchScope === "all") {
        if (material.toLowerCase().includes(normalizedKeyword)) {
          matches.add(material);
        }
      }
      if (matches.size >= 8) break;
    }
    return Array.from(matches);
  }, [data, keyword, searchScope]);
  const facetCounts = reactExports.useMemo(() => {
    const counts = {};
    const filterKeys = Object.keys(filters);
    filterKeys.forEach((activeKey) => {
      counts[activeKey] = {};
      let tempResult = data;
      if (keyword) {
        const keys2 = searchScope === "all" ? ["タイトル", "商品名", "受注№", "商品コード", "材質名称", "直送先名称", "形状", "JANコード"] : searchScope === "title" ? ["タイトル", "商品名"] : ["受注№", "商品コード", "JANコード"];
        const fuse = new Fuse(data, {
          keys: keys2,
          threshold: 0.3,
          ignoreLocation: true,
          useExtendedSearch: true
        });
        tempResult = fuse.search(keyword).map((res) => res.item);
      }
      tempResult = tempResult.filter((item) => {
        return filterKeys.every((k) => {
          if (k === activeKey) return true;
          const selectedValues = filters[k];
          if (!selectedValues || selectedValues.length === 0) return true;
          return selectedValues.includes(String(item[k]));
        });
      });
      const uniqueVals = uniqueValues[activeKey] || [];
      uniqueVals.forEach((val) => {
        counts[activeKey][val] = tempResult.filter((item) => String(item[activeKey]) === String(val)).length;
      });
    });
    return counts;
  }, [data, filters, keyword, searchScope, uniqueValues]);
  const filteredData = reactExports.useMemo(() => {
    let result = data;
    if (keyword) {
      const keys2 = searchScope === "all" ? ["タイトル", "商品名", "受注№", "商品コード", "材質名称", "直送先名称", "形状", "JANコード"] : searchScope === "title" ? ["タイトル", "商品名"] : ["受注№", "商品コード", "JANコード"];
      const fuse = new Fuse(data, {
        keys: keys2,
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true
      });
      const searchResults = fuse.search(keyword);
      result = searchResults.map((res) => res.item);
    }
    result = result.filter((item) => {
      return Object.keys(filters).every((key) => {
        const selectedValues = filters[key];
        if (!selectedValues || selectedValues.length === 0) return true;
        return selectedValues.includes(String(item[key]));
      });
    });
    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => (parseFloat(a["単価"]) || 0) - (parseFloat(b["単価"]) || 0));
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => (parseFloat(b["単価"]) || 0) - (parseFloat(a["単価"]) || 0));
    } else if (sortBy === "date-desc") {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a["最新受注日"] || 0);
        const dateB = new Date(b["最新受注日"] || 0);
        return dateB - dateA;
      });
    }
    return result;
  }, [data, filters, keyword, sortBy, searchScope]);
  reactExports.useEffect(() => {
    const animFrame = requestAnimationFrame(() => {
      setCurrentPage(1);
    });
    return () => cancelAnimationFrame(animFrame);
  }, [data, filters, keyword, sortBy, searchScope]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const currentSelected = prev[key] || [];
      const isSelected = currentSelected.includes(value);
      const newSelected = isSelected ? currentSelected.filter((val) => val !== value) : [...currentSelected, value];
      return {
        ...prev,
        [key]: newSelected
      };
    });
  };
  const clearFilterKey = (key) => {
    setFilters((prev) => ({
      ...prev,
      [key]: []
    }));
  };
  const clearFilters = () => {
    setFilters({
      "種別": [],
      "重量": [],
      "材質名称": [],
      "総色数": [],
      "直送先名称": []
    });
    setKeyword("");
    setSearchScope("all");
  };
  return {
    keyword,
    setKeyword,
    searchScope,
    setSearchScope,
    suggestions,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    filters,
    uniqueValues,
    facetCounts,
    filteredData,
    handleFilterChange,
    clearFilterKey,
    clearFilters
  };
};
const SkeletonCard = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "skeleton-card", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-pulse", style: { width: "100%", height: "200px" } }),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "1rem" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-line skeleton-title skeleton-pulse" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-line skeleton-meta skeleton-pulse" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-line skeleton-meta skeleton-pulse", style: { width: "40%" } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "skeleton-line skeleton-price skeleton-pulse" })
  ] })
] });
function App() {
  const [modalImage, setModalImage] = reactExports.useState(null);
  const [selectedProduct, setSelectedProduct] = reactExports.useState(null);
  const [viewMode, setViewMode] = reactExports.useState("grid");
  const [itemsPerPage] = reactExports.useState(20);
  const [showCacheManager, setShowCacheManager] = reactExports.useState(false);
  const [isFilterOpen, setIsFilterOpen] = reactExports.useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > 480;
    }
    return true;
  });
  reactExports.useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.remove("dark-mode");
      localStorage.removeItem("theme");
    }
  }, []);
  const [history, setHistory] = reactExports.useState(() => {
    try {
      const saved = localStorage.getItem("search_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSearchFocused, setIsSearchFocused] = reactExports.useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = reactExports.useState(-1);
  const [directShippingSearchKeyword, setDirectShippingSearchKeyword] = reactExports.useState("");
  const [showExcelDropdown, setShowExcelDropdown] = reactExports.useState(false);
  const [openFilters, setOpenFilters] = reactExports.useState({
    "種別": true,
    "重量": false,
    "材質名称": true,
    "総色数": false,
    "直送先名称": false
  });
  const { toast, showToast, hideToast } = useToast();
  const {
    data,
    fileName,
    lastModified,
    dirHandle,
    imageFilesMap,
    permissionGranted,
    customerPermissionGranted,
    customerFiles,
    error,
    isLoading,
    isFileSystemSupported: isFileSystemSupported2,
    handleFileUpload,
    handleFolderSelect,
    handleImageFilesSelect,
    handleCustomerFolderSelect,
    handleCustomerFilesSelect,
    loadCustomerFile: originalLoadCustomerFile,
    clearError
  } = useProductData();
  const loadCustomerFile = reactExports.useMemo(() => {
    return async (name) => {
      await originalLoadCustomerFile(name);
      setDirectShippingSearchKeyword("");
    };
  }, [originalLoadCustomerFile]);
  const triggerCustomerFilesSelect = () => {
    document.getElementById("customer-files-input")?.click();
  };
  const [customerSearchKeyword, setCustomerSearchKeyword] = reactExports.useState("");
  const [cartBouncing, setCartBouncing] = reactExports.useState(false);
  const filteredCustomerFiles = customerFiles.filter(
    (file) => file.name.toLowerCase().includes(customerSearchKeyword.toLowerCase())
  );
  const {
    keyword,
    setKeyword,
    searchScope,
    setSearchScope,
    suggestions,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    filters,
    uniqueValues,
    facetCounts,
    filteredData,
    handleFilterChange,
    clearFilterKey,
    clearFilters
  } = useProductFilters(data);
  const filteredDirectShippings = reactExports.useMemo(() => {
    const list = uniqueValues["直送先名称"] || [];
    if (!directShippingSearchKeyword.trim()) return list;
    const kw = directShippingSearchKeyword.toLowerCase().trim();
    return list.filter((name) => name.toLowerCase().includes(kw));
  }, [uniqueValues, directShippingSearchKeyword]);
  const {
    cart,
    showCart,
    setShowCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemCount
  } = useCart(showToast);
  reactExports.useEffect(() => {
    if (cartItemCount > 0) {
      let timer;
      const animFrame = requestAnimationFrame(() => {
        setCartBouncing(true);
        timer = setTimeout(() => setCartBouncing(false), 500);
      });
      return () => {
        cancelAnimationFrame(animFrame);
        if (timer) clearTimeout(timer);
      };
    }
  }, [cartItemCount]);
  const handleExportExcel = async (options = { includeImages: false }) => {
    if (!filteredData || filteredData.length === 0) {
      showToast("出力するデータがありません", "error");
      return;
    }
    const { includeImages = false } = options;
    showToast(includeImages ? "画像付きExcelファイルを生成中..." : "Excelファイルを生成中...", "info");
    try {
      const wb = await createProductExcelWorkbook(filteredData, fileName, { includeImages, dirHandle });
      const cleanCompanyName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "商品一覧";
      const today = /* @__PURE__ */ new Date();
      const fileDateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const imageSuffix = includeImages ? "_画像あり" : "";
      const exportFileName = `${cleanCompanyName}_商品一覧${imageSuffix}_${fileDateStr}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Excelファイル(${includeImages ? "画像付き" : "画像なし"})をエクスポートしました`, "success");
    } catch (err) {
      console.error("Excelエクスポートエラー:", err);
      showToast(err.message || "Excelファイルの生成に失敗しました", "error");
    }
  };
  const handleExportHtml = async () => {
    if (!filteredData || filteredData.length === 0) {
      showToast("出力するデータがありません", "error");
      return;
    }
    showToast("HTMLファイルを生成中...画像点数により時間がかかる場合があります", "info");
    try {
      const htmlString = await createProductHtmlString(filteredData, fileName, dirHandle);
      const cleanCompanyName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "商品一覧";
      const today = /* @__PURE__ */ new Date();
      const fileDateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const exportFileName = `${cleanCompanyName}_商品一覧_${fileDateStr}.html`;
      const blob = new Blob([htmlString], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("HTMLファイルをエクスポートしました", "success");
    } catch (err) {
      console.error("HTMLエクスポートエラー:", err);
      showToast(err.message || "HTMLファイルの生成に失敗しました", "error");
    }
  };
  const addToHistory = (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed);
      const nextHistory = [trimmed, ...filtered].slice(0, 8);
      localStorage.setItem("search_history", JSON.stringify(nextHistory));
      return nextHistory;
    });
  };
  const removeFromHistory = (e, query) => {
    e.stopPropagation();
    setHistory((prev) => {
      const nextHistory = prev.filter((item) => item !== query);
      localStorage.setItem("search_history", JSON.stringify(nextHistory));
      return nextHistory;
    });
  };
  const handleSearchSubmit = (query) => {
    setKeyword(query);
    addToHistory(query);
    setIsSearchFocused(false);
    setActiveSuggestionIdx(-1);
  };
  const handleSearchKeyDown = (e) => {
    const activeList = keyword ? suggestions : history;
    if (activeList.length === 0) {
      if (e.key === "Enter") {
        handleSearchSubmit(keyword);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => prev < activeList.length - 1 ? prev + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => prev > 0 ? prev - 1 : activeList.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < activeList.length) {
        handleSearchSubmit(activeList[activeSuggestionIdx]);
      } else {
        handleSearchSubmit(keyword);
      }
    } else if (e.key === "Escape") {
      setIsSearchFocused(false);
      setActiveSuggestionIdx(-1);
    }
  };
  const toggleFilterSection = (sectionKey) => {
    setOpenFilters((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const handleNextProduct = () => {
    if (!selectedProduct) return;
    const idx = filteredData.findIndex((p) => p["受注№"] === selectedProduct["受注№"]);
    if (idx < filteredData.length - 1) setSelectedProduct(filteredData[idx + 1]);
  };
  const handlePrevProduct = () => {
    if (!selectedProduct) return;
    const idx = filteredData.findIndex((p) => p["受注№"] === selectedProduct["受注№"]);
    if (idx > 0) setSelectedProduct(filteredData[idx - 1]);
  };
  const currentIdx = selectedProduct ? filteredData.findIndex((p) => p["受注№"] === selectedProduct["受注№"]) : -1;
  const hasNext = currentIdx !== -1 && currentIdx < filteredData.length - 1;
  const hasPrev = currentIdx !== -1 && currentIdx > 0;
  const columns = ["画像", "受注№", "商品コード", "タイトル", "重量", "材質名称", "総色数", "直送先名称"];
  reactExports.useEffect(() => {
    if ("serviceWorker" in navigator) {
      const swUrl = `${"./"}service-worker.js`;
      navigator.serviceWorker.register(swUrl).catch((err) => console.error("SW registration failed:", err));
    }
  }, []);
  const activeChips = reactExports.useMemo(() => {
    const chips = [];
    Object.keys(filters).forEach((key) => {
      filters[key].forEach((val) => {
        chips.push({ key, val, label: `${key}: ${val}` });
      });
    });
    return chips;
  }, [filters]);
  const categoryIcons = {
    "種別": /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { size: 16, className: "filter-category-icon" }),
    "重量": /* @__PURE__ */ jsxRuntimeExports.jsx(Scale, { size: 16, className: "filter-category-icon" }),
    "材質名称": /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 16, className: "filter-category-icon" }),
    "総色数": /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { size: 16, className: "filter-category-icon" })
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-app", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBanner, { error, onClose: clearError }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "amazon-header", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-header-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-logo", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { size: 28 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "商品検索" }),
          lastModified && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "data-timestamp", title: "データの更新日時", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 12 }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "更新: ",
              formatDate(lastModified)
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-search-container", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "search-scope-select-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: searchScope,
            onChange: (e) => setSearchScope(e.target.value),
            className: "search-scope-select",
            "aria-label": "検索対象",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "すべて" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "title", children: "タイトル" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "code", children: "コード" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "amazon-search-bar",
            onFocus: () => setIsSearchFocused(true),
            onBlur: () => {
              setTimeout(() => {
                setIsSearchFocused(false);
                setActiveSuggestionIdx(-1);
              }, 200);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 20, className: "search-icon" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "search-input",
                  name: "keyword",
                  "aria-label": "商品検索",
                  type: "text",
                  placeholder: "商品を検索...",
                  value: keyword,
                  onChange: (e) => {
                    setKeyword(e.target.value);
                    setActiveSuggestionIdx(-1);
                  },
                  onKeyDown: handleSearchKeyDown,
                  className: "amazon-search-input",
                  autoComplete: "off"
                }
              ),
              isSearchFocused && (keyword ? suggestions.length > 0 : history.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "search-history-dropdown", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "search-history-header", children: keyword ? "検索候補" : "最近の検索履歴" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "search-history-list", children: (keyword ? suggestions : history).map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: `search-history-item ${idx === activeSuggestionIdx ? "active" : ""}`,
                    onMouseDown: () => handleSearchSubmit(item),
                    onMouseEnter: () => setActiveSuggestionIdx(idx),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "search-history-text", children: item }),
                      !keyword && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          className: "clear-history-btn",
                          onMouseDown: (e) => removeFromHistory(e, item),
                          title: "履歴から削除",
                          children: "×"
                        }
                      )
                    ]
                  },
                  item
                )) })
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-header-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowCart(!showCart), className: `amazon-btn amazon-cart-btn ${cartBouncing ? "cart-bounce" : ""}`, title: "カートを表示", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingCart, { size: 18 }),
          "カート (",
          cartItemCount,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: isFileSystemSupported2 ? handleCustomerFolderSelect : triggerCustomerFilesSelect,
            className: `amazon-btn ${customerPermissionGranted ? "connected" : ""}`,
            title: isFileSystemSupported2 ? customerPermissionGranted ? "顧客フォルダ接続済み" : "顧客フォルダを接続" : customerPermissionGranted ? "顧客ファイル選択済み" : "顧客ファイルを選択",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 18 }),
              isFileSystemSupported2 ? customerPermissionGranted ? "顧客接続済" : "顧客フォルダ" : customerPermissionGranted ? "顧客選択済" : "顧客ファイル"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: handleFolderSelect, className: `amazon-btn ${permissionGranted ? "connected" : ""}`, title: permissionGranted ? "画像フォルダ接続済み" : "画像フォルダを接続", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 18 }),
          permissionGranted ? "画像接続済" : "画像フォルダ"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "file-input", className: "amazon-btn amazon-btn-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { size: 18 }),
          fileName || "ファイル選択"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "file-input", name: "file", type: "file", accept: ".xlsx,.xls", onChange: handleFileUpload, hidden: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "customer-files-input", name: "customerFiles", type: "file", accept: ".xlsx,.xls", onChange: handleCustomerFilesSelect, multiple: true, hidden: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "image-files-input", name: "imageFiles", type: "file", accept: "image/*,.jpg,.jpeg,.png,.JPG,.JPEG,.PNG", onChange: handleImageFilesSelect, multiple: true, hidden: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "image-folder-input", name: "imageFolder", type: "file", accept: "image/*,.jpg,.jpeg,.png,.JPG,.JPEG,.PNG", onChange: handleImageFilesSelect, multiple: true, webkitdirectory: "", hidden: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowCacheManager(true), className: "amazon-btn", title: "キャッシュ管理", children: "キャッシュ" })
      ] })
    ] }) }),
    data.length > 0 || isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-main", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: `amazon-sidebar ${isFilterOpen ? "open" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-sidebar-section customer-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "customer-section-header", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 18, className: "section-title-icon" }),
            isFileSystemSupported2 ? "顧客選択" : "顧客ファイル選択"
          ] }) }),
          !customerPermissionGranted ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-connect-prompt", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "prompt-text", children: isFileSystemSupported2 ? "顧客フォルダが接続されていません。" : "顧客ファイルが選択されていません。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: isFileSystemSupported2 ? handleCustomerFolderSelect : triggerCustomerFilesSelect,
                className: "amazon-btn amazon-btn-primary customer-connect-btn",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 16 }),
                  " ",
                  isFileSystemSupported2 ? "顧客フォルダを選択" : "顧客ファイルを選択"
                ]
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-select-controls", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-search-box", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 16, className: "customer-search-icon" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: "顧客名で検索...",
                  value: customerSearchKeyword,
                  onChange: (e) => setCustomerSearchKeyword(e.target.value),
                  className: "customer-search-input"
                }
              ),
              customerSearchKeyword && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "search-clear-btn",
                  onClick: () => setCustomerSearchKeyword(""),
                  title: "検索をクリア",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 })
                }
              )
            ] }),
            filteredCustomerFiles.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "customer-list-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "customer-list", children: filteredCustomerFiles.map((file) => {
              const isCurrent = fileName === file.name;
              const rawName = file.name.replace(/\.xlsx?$/, "");
              const match = rawName.match(/^([0-9A-Za-z]+)[_\s-]+(.+)$/);
              const codeBadge = match ? match[1] : null;
              const displayName = match ? match[2] : rawName;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "li",
                {
                  className: `customer-item ${isCurrent ? "active" : ""}`,
                  onClick: () => {
                    if (!isCurrent) {
                      loadCustomerFile(file.name);
                    }
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-item-main", children: [
                      codeBadge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "customer-code-badge", children: codeBadge }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "customer-name-text", title: rawName, children: displayName })
                    ] }),
                    isCurrent && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 16, className: "active-check-icon" })
                  ]
                },
                file.name
              );
            }) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "no-customers-text", children: "該当する顧客が見つかりません" })
          ] })
        ] }),
        customerPermissionGranted && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-sidebar-section customer-section direct-shipping-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-section-header", style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { size: 18, className: "section-title-icon" }),
              "直送先選択"
            ] }),
            filters["直送先名称"] && filters["直送先名称"].length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  clearFilterKey("直送先名称");
                },
                className: "amazon-clear-btn",
                title: "直送先選択をクリア",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FunnelX, { size: 14 }),
                  "クリア (",
                  filters["直送先名称"].length,
                  ")"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-select-controls", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-search-box", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 16, className: "customer-search-icon" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: "直送先名で検索...",
                  value: directShippingSearchKeyword,
                  onChange: (e) => setDirectShippingSearchKeyword(e.target.value),
                  className: "customer-search-input"
                }
              ),
              directShippingSearchKeyword && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "search-clear-btn",
                  onClick: () => setDirectShippingSearchKeyword(""),
                  title: "検索をクリア",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 })
                }
              )
            ] }),
            filteredDirectShippings.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "customer-list-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "customer-list", children: filteredDirectShippings.map((shipping) => {
              const isSelected = filters["直送先名称"].includes(shipping);
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "li",
                {
                  className: `customer-item shipping-item ${isSelected ? "active" : ""}`,
                  onClick: () => handleFilterChange("直送先名称", shipping),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-item-main", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked: isSelected,
                        readOnly: true,
                        className: "shipping-checkbox"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "customer-name-text", title: shipping, children: shipping })
                  ] })
                },
                shipping
              );
            }) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "no-customers-text", children: "該当する直送先が見つかりません" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-sidebar-section filter-panel-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-sidebar-header", onClick: () => setIsFilterOpen(!isFilterOpen), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar-header-title", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "フィルター" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-toggle-icon", children: isFilterOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 18 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 18 }) })
            ] }),
            activeChips.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  clearFilters();
                  setDirectShippingSearchKeyword("");
                },
                className: "amazon-clear-btn active",
                title: "すべてのフィルターをクリア",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FunnelX, { size: 14 }),
                  "全クリア (",
                  activeChips.length,
                  ")"
                ]
              }
            )
          ] }),
          activeChips.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "active-filter-chips-container", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "active-chips-label", children: "選択中の条件:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "active-chips-list", children: activeChips.map((chip, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "filter-chip", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip-text", children: chip.val }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "chip-remove-btn",
                  onClick: () => handleFilterChange(chip.key, chip.val),
                  title: "条件を解除",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12 })
                }
              )
            ] }, `${chip.key}-${chip.val}-${idx}`)) })
          ] }),
          isFilterOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "amazon-sidebar-content", children: Object.keys(filters).filter((key) => key !== "直送先名称").map((key) => {
            const isOpen = openFilters[key];
            const activeCount = filters[key].length;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `amazon-filter-group-accordion ${isOpen ? "open" : ""}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "filter-group-header", onClick: () => toggleFilterSection(key), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "filter-group-title", children: [
                  categoryIcons[key] || /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { size: 16, className: "filter-category-icon" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: key }),
                  activeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "active-filter-badge", children: activeCount })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "accordion-arrow", children: isOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 16 }) })
              ] }),
              isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "filter-group-body", children: [
                activeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "clear-group-filter-btn",
                    onClick: (e) => {
                      e.stopPropagation();
                      clearFilterKey(key);
                    },
                    children: "この項目をクリア"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "filter-checkbox-list", children: uniqueValues[key].map((val) => {
                  const count = facetCounts[key]?.[val] ?? 0;
                  const isChecked = filters[key].includes(String(val));
                  const isDisabled = count === 0 && !isChecked;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "label",
                    {
                      className: `filter-checkbox-label ${isChecked ? "checked" : ""} ${isDisabled ? "disabled" : ""}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "checkbox-label-left", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "input",
                            {
                              type: "checkbox",
                              checked: isChecked,
                              disabled: isDisabled,
                              onChange: () => handleFilterChange(key, String(val))
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "filter-value-text", title: val, children: val })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "filter-count", children: [
                          "(",
                          count,
                          ")"
                        ] })
                      ]
                    },
                    val
                  );
                }) })
              ] })
            ] }, key);
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "amazon-content", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-toolbar", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-results-info", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: filteredData.length }),
            " 件の商品"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-toolbar-controls", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "excel-export-dropdown-container", style: { position: "relative", display: "inline-block" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => setShowExcelDropdown((prev) => !prev),
                  className: "amazon-btn amazon-btn-primary excel-export-btn",
                  title: "商品一覧をExcel出力",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { size: 16 }),
                    "Excel出力",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14, style: { marginLeft: "2px" } })
                  ]
                }
              ),
              showExcelDropdown && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "excel-dropdown-menu", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    className: "excel-dropdown-item",
                    onClick: () => {
                      setShowExcelDropdown(false);
                      handleExportExcel({ includeImages: false });
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { size: 16, className: "dropdown-item-icon text-icon" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dropdown-item-title", children: "画像なしで出力" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dropdown-item-sub", children: "テキストのみ・高速" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    className: "excel-dropdown-item",
                    onClick: () => {
                      setShowExcelDropdown(false);
                      handleExportExcel({ includeImages: true });
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { size: 16, className: "dropdown-item-icon image-icon" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dropdown-item-title", children: "画像付きで出力" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dropdown-item-sub", children: "商品画像埋め込み" })
                      ] })
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handleExportHtml,
                className: "amazon-btn amazon-btn-primary html-export-btn",
                title: "商品一覧をHTML出力（単価・印刷代なし）",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { size: 16 }),
                  "HTML出力"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "amazon-sort-select", "aria-label": "並び替え", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "並び替え" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "price-asc", children: "価格: 安い順" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "price-desc", children: "価格: 高い順" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "date-desc", children: "最新受注日順" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-view-toggle", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `amazon-view-btn ${viewMode === "grid" ? "active" : ""}`, onClick: () => setViewMode("grid"), title: "グリッド表示", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { size: 18 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `amazon-view-btn ${viewMode === "table" ? "active" : ""}`, onClick: () => setViewMode("table"), title: "テーブル表示", children: /* @__PURE__ */ jsxRuntimeExports.jsx(List, { size: 18 }) })
            ] })
          ] })
        ] }),
        isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "amazon-products-grid", children: Array.from({ length: 12 }).map((_, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCard, {}, idx)) }) : viewMode === "grid" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "amazon-products-grid fade-in-up", children: paginatedData.map((product, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          ProductCard$1,
          {
            product,
            dirHandle,
            imageFilesMap,
            customerFileName: fileName,
            onClick: () => setSelectedProduct(product),
            onAddToCart: addToCart,
            keyword
          },
          `${product["受注№"] || product["商品コード"] || idx}`
        )) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-table-container fade-in-up", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "amazon-table", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: columns.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: col }, col)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: paginatedData.map((row, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { onClick: () => setSelectedProduct(row), style: { cursor: "pointer" }, children: columns.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: col === "画像" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ProductImage$1, { dirHandle, imageFilesMap, filename: row["受注№"], productCode: row["商品コード"], customerFileName: fileName, onClick: (url) => setModalImage(url) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightText, { text: row[col], keyword }) }, col)) }, `${row["受注№"] || row["商品コード"] || idx}`)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-table-cards", children: paginatedData.map((row, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "mobile-table-card",
              onClick: () => setSelectedProduct(row),
              style: { cursor: "pointer" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-header", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-card-title", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HighlightText, { text: row["商品名"] || row["タイトル"], keyword }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-card-id", children: row["商品コード"] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-body", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-card-field", style: { gridColumn: "span 2", display: "flex", justifyContent: "center", marginBottom: "0.5rem" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProductImage$1, { dirHandle, imageFilesMap, filename: row["受注№"], productCode: row["商品コード"], customerFileName: fileName, onClick: (url) => setModalImage(url) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-field", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-label", children: "受注№" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-value", children: row["受注№"] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-field", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-label", children: "材質" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-value", children: row["材質名称"] || "-" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-field", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-label", children: "重量" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-value", children: row["重量"] || "-" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-field", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-label", children: "直送先" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mobile-card-value", title: row["直送先名称"], children: row["直送先名称"] || "-" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-card-footer", onClick: (e) => e.stopPropagation(), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "mobile-card-btn mobile-card-btn-primary",
                      onClick: () => {
                        addToCart(row);
                        showToast(`${row["商品名"] || row["タイトル"]}をカートに追加しました`);
                      },
                      children: "カートに追加"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "mobile-card-btn mobile-card-btn-secondary",
                      onClick: () => setSelectedProduct(row),
                      children: "詳細"
                    }
                  )
                ] })
              ]
            },
            `${row["受注№"] || row["商品コード"] || idx}`
          )) })
        ] }),
        totalPages > 1 && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-pagination", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "amazon-page-btn", onClick: () => setCurrentPage((p) => Math.max(1, p - 1)), disabled: currentPage === 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 18 }),
            " 前へ"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "amazon-page-numbers", children: Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `amazon-page-num ${currentPage === pageNum ? "active" : ""}`, onClick: () => setCurrentPage(pageNum), children: pageNum }, pageNum);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "amazon-page-btn", onClick: () => setCurrentPage((p) => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages, children: [
            "次へ ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 18 })
          ] })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "amazon-empty-state", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { size: 64 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "データを読み込んでください" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        "右上の「ファイル選択」から個別にExcelファイルを開くか、",
        isFileSystemSupported2 ? "顧客フォルダを接続してください。" : "複数の顧客ファイルを選択してください。"
      ] }),
      !customerPermissionGranted ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: isFileSystemSupported2 ? handleCustomerFolderSelect : triggerCustomerFilesSelect,
          className: "amazon-btn amazon-btn-primary empty-connect-btn",
          style: { marginTop: "1.5rem" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { size: 18 }),
            " ",
            isFileSystemSupported2 ? "顧客フォルダを接続する" : "顧客ファイルを選択する"
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty-customer-select", style: { marginTop: "1.5rem", width: "100%", maxWidth: "400px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "customer-search-box", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 16, className: "customer-search-icon" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: "顧客名で検索...",
              value: customerSearchKeyword,
              onChange: (e) => setCustomerSearchKeyword(e.target.value),
              className: "customer-search-input"
            }
          )
        ] }),
        filteredCustomerFiles.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "customer-list-container", style: { maxHeight: "250px", overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--rounded-md)", marginTop: "0.75rem", background: "var(--color-surface)", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "customer-list", style: { listStyle: "none", padding: 0, margin: 0, textAlign: "left" }, children: filteredCustomerFiles.map((file) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "li",
          {
            className: "customer-item",
            style: { padding: "0.75rem 1rem", cursor: "pointer", borderBottom: "1px solid var(--color-border)", transition: "background-color 0.2s" },
            onClick: () => loadCustomerFile(file.name),
            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "var(--amazon-hover)",
            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "transparent",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "customer-name", style: { color: "var(--color-text)", fontSize: "0.9rem", fontWeight: 500 }, children: file.name.replace(/\.xlsx?$/, "") })
          },
          file.name
        )) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { marginTop: "0.75rem", color: "#888", fontSize: "0.9rem" }, children: "該当する顧客が見つかりません" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ImageModal, { imageUrl: modalImage, onClose: () => setModalImage(null) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ProductDetailsModal, { product: selectedProduct, onClose: () => setSelectedProduct(null), dirHandle, onNext: handleNextProduct, onPrev: handlePrevProduct, hasNext, hasPrev }),
    showCart && /* @__PURE__ */ jsxRuntimeExports.jsx(CartModal, { cart, onClose: () => setShowCart(false), onUpdateQuantity: updateCartQuantity, onRemove: removeFromCart, onClear: clearCart, total: cartTotal, fileName }),
    showCacheManager && /* @__PURE__ */ jsxRuntimeExports.jsx(CacheManager, { onClose: () => setShowCacheManager(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toast, { message: toast.message, type: toast.type, isVisible: toast.show, onClose: hideToast })
  ] });
}
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
