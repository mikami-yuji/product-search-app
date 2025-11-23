import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Search, FileSpreadsheet, FilterX, FolderOpen, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { get, set } from 'idb-keyval';
import Fuse from 'fuse.js';
import './index.css';

// Import Components
import ProductImage from './ProductImage';
import ImageModal from './ImageModal';
import CartModal from './CartModal';
import ProductDetailsModal from './ProductDetailsModal';
import ProductCard from './ProductCard';

const imageCache = {}; // Global memory cache for current session

function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dirHandle, setDirHandle] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [webImages, setWebImages] = useState({});
  const [modalImage, setModalImage] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [sortBy, setSortBy] = useState(''); // '', 'price-asc', 'price-desc', 'date-desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);


  const [filters, setFilters] = useState({
    '種別': [],
    '重量': [],
    '材質名称': [],
    '総色数': [],
    '直送先名称': []
  });

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedData = await get('productData');
        const cachedFileName = await get('fileName');
        if (cachedData) setData(cachedData);
        if (cachedFileName) setFileName(cachedFileName);
      } catch (err) {
        console.error('Error loading cache:', err);
      }
    };
    loadCachedData();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    set('fileName', file.name); // Cache filename

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      setData(jsonData);
      set('productData', jsonData); // Cache data
    };
    reader.readAsBinaryString(file);
  };

  const handleFolderSelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      setPermissionGranted(true);
    } catch (err) {
      console.error('Error selecting folder:', err);
    }
  };

  const uniqueValues = useMemo(() => {
    const getUnique = (key, sortFn) => {
      const values = [...new Set(data.map(item => item[key]).filter(Boolean))];
      return sortFn ? values.sort(sortFn) : values.sort();
    };

    const numericSort = (a, b) => {
      const numA = parseFloat(a) || 0;
      const numB = parseFloat(b) || 0;
      return numA - numB;
    };

    return {
      '種別': getUnique('種別'),
      '重量': getUnique('重量', numericSort),
      '材質名称': getUnique('材質名称'),
      '総色数': getUnique('総色数'),
      '直送先名称': getUnique('直送先名称')
    };
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;

    // 1. Keyword Search (Fuzzy)
    if (keyword) {
      const fuse = new Fuse(data, {
        keys: ['タイトル', '商品名', '受注№', '商品コード', '材質名称', '直送先名称', '形状', 'JANコード'],
        threshold: 0.3, // 0.0 = exact match, 1.0 = match anything
        ignoreLocation: true,
        useExtendedSearch: true
      });
      const searchResults = fuse.search(keyword);
      result = searchResults.map(res => res.item);
    }

    // 2. Filter Match (Multi-select)
    result = result.filter(item => {
      return Object.keys(filters).every(key => {
        if (filters[key].length === 0) return true; // No filter selected for this key
        return filters[key].includes(String(item[key]));
      });
    });

    // Apply sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (parseFloat(a['単価']) || 0) - (parseFloat(b['単価']) || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (parseFloat(b['単価']) || 0) - (parseFloat(a['単価']) || 0));
    } else if (sortBy === 'date-desc') {
      result.sort((a, b) => {
        const dateA = new Date(a['最新受注日'] || 0);
        const dateB = new Date(b['最新受注日'] || 0);
        return dateB - dateA;
      });
    }

    return result;
  }, [data, filters, keyword, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, keyword, sortBy]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const currentValues = prev[key];
      if (currentValues.includes(value)) {
        return { ...prev, [key]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...currentValues, value] };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      '種別': [],
      '重量': [],
      '材質名称': [],
      '総色数': [],
      '直送先名称': []
    });
    setKeyword('');
  };

  // Cart functions
  const addToCart = (product) => {
    const existingItem = cart.find(item => item['受注№'] === product['受注№']);
    if (existingItem) {
      setCart(cart.map(item =>
        item['受注№'] === product['受注№']
          ? { ...item, quantity: item.quantity + (product['受注数'] || 1) }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: product['受注数'] || 1 }]);
    }
  };

  const updateCartQuantity = (orderNo, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(orderNo);
    } else {
      setCart(cart.map(item =>
        item['受注№'] === orderNo ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (orderNo) => {
    setCart(cart.filter(item => item['受注№'] !== orderNo));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = parseFloat(item['単価']) || 0;
    return sum + (price * item.quantity);
  }, 0);

  const cartItemCount = cart.length; // アイテム数（商品種類数）

  const columns = [
    '画像', '受注№', '商品コード', 'タイトル', '重量', '材質名称', '総色数', '直送先名称'
  ];

  return (
    <div className="amazon-app">
      {/* Header */}
      <header className="amazon-header">
        <div className="amazon-header-content">
          <div className="amazon-logo">
            <FileSpreadsheet size={28} />
            <h1>商品検索</h1>
          </div>
          <div className="amazon-search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="商品を検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="amazon-search-input"
            />
          </div>
          <div className="amazon-header-actions">
            <button
              onClick={() => setShowCart(!showCart)}
              className="amazon-btn amazon-cart-btn"
              title="カートを表示"
            >
              <ShoppingCart size={18} />
              カート ({cartItemCount})
            </button>
            <button
              onClick={handleFolderSelect}
              className={`amazon-btn ${permissionGranted ? 'connected' : ''}`}
              title={permissionGranted ? "画像フォルダ接続済み" : "画像フォルダを接続"}
            >
              <FolderOpen size={18} />
              {permissionGranted ? '接続済' : '画像フォルダ'}
            </button>
            <label htmlFor="file-input" className="amazon-btn amazon-btn-primary">
              <Upload size={18} />
              {fileName || 'ファイル選択'}
            </label>
            <input
              id="file-input"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              hidden
            />
          </div>
        </div>
      </header>

      {data.length > 0 ? (
        <div className="amazon-main">
          {/* Sidebar Filters */}
          <aside className="amazon-sidebar">
            <div className="amazon-sidebar-header">
              <h2>フィルター</h2>
              <button onClick={clearFilters} className="amazon-clear-btn">
                <FilterX size={16} />
                クリア
              </button>
            </div>

            {Object.keys(filters).map(key => (
              <div key={key} className="amazon-filter-group">
                <label className="filter-group-label">{key}</label>
                <div className="filter-checkbox-list">
                  {uniqueValues[key].map(val => (
                    <label key={val} className="filter-checkbox-item">
                      <input
                        type="checkbox"
                        checked={filters[key].includes(val)}
                        onChange={() => handleFilterChange(key, val)}
                      />
                      <span>{val}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Main Content */}
          <main className="amazon-content">
            {/* Toolbar */}
            <div className="amazon-toolbar">
              <div className="amazon-results-info">
                <strong>{filteredData.length}</strong> 件の商品
              </div>

              <div className="amazon-toolbar-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="amazon-sort-select"
                >
                  <option value="">並び替え</option>
                  <option value="price-asc">価格: 安い順</option>
                  <option value="price-desc">価格: 高い順</option>
                  <option value="date-desc">最新受注日順</option>
                </select>

                <div className="amazon-view-toggle">
                  <button
                    className={`amazon-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="グリッド表示"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    className={`amazon-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="テーブル表示"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid/Table */}
            {viewMode === 'grid' ? (
              <div className="amazon-products-grid">
                {paginatedData.map((product, index) => (
                  <ProductCard
                    key={index}
                    product={product}
                    dirHandle={dirHandle}
                    webImages={webImages}
                    onClick={() => setSelectedProduct(product)}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="amazon-table-container">
                <table className="amazon-table">
                  <thead>
                    <tr>
                      {columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, index) => {
                      const getAgeColorClass = (dateStr) => {
                        if (!dateStr) return '';
                        const orderDate = new Date(dateStr);
                        const now = new Date();
                        const monthsDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());

                        if (monthsDiff >= 24) return 'age-alert-red';
                        if (monthsDiff >= 22) return 'age-alert-yellow';
                        return '';
                      };

                      const ageClass = getAgeColorClass(row['最新受注日']);

                      return (
                        <tr
                          key={index}
                          onClick={() => setSelectedProduct(row)}
                          style={{ cursor: 'pointer' }}
                          className={ageClass}
                        >
                          {columns.map(col => (
                            <td key={`${index}-${col}`}>
                              {col === '画像' ? (
                                <ProductImage
                                  dirHandle={dirHandle}
                                  filename={row['受注№']}
                                  productCode={row['商品コード']}
                                  webImages={webImages}
                                  onClick={(url) => {
                                    setModalImage(url);
                                  }}
                                />
                              ) : (
                                row[col]
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="amazon-pagination">
                <button
                  className="amazon-page-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                  前へ
                </button>

                <div className="amazon-page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`amazon-page-num ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="amazon-page-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="amazon-empty-state">
          <FileSpreadsheet size={64} />
          <h2>データを読み込んでください</h2>
          <p>右上のボタンからエクセルファイルを選択してください。</p>
        </div>
      )}

      <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />
      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        dirHandle={dirHandle}
        webImages={webImages}
      />
      {showCart && (
        <CartModal
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          total={cartTotal}
          fileName={fileName}
        />
      )}
    </div>
  );
}

export default App;
