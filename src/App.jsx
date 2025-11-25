import React, { useState, useEffect } from 'react';
import { Upload, Search, FileSpreadsheet, FilterX, FolderOpen, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import './index.css';
import './custom.css';

// Components
import ProductImage from './ProductImage';
import ImageModal from './ImageModal';
import CartModal from './CartModal';
import ProductDetailsModal from './ProductDetailsModal';
import ProductCard from './ProductCard';
import Toast from './Toast';
import HighlightText from './HighlightText';
import ErrorBanner from './ErrorBanner';
import CacheManager from './CacheManager';

// Hooks
import { useToast, useCart, useProductData, useProductFilters } from './hooks';

function App() {
  const [modalImage, setModalImage] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [itemsPerPage] = useState(20);
  const [showCacheManager, setShowCacheManager] = useState(false);
  // PC (width > 480px) defaults to open, Mobile defaults to closed
  const [isFilterOpen, setIsFilterOpen] = useState(window.innerWidth > 480);

  // Custom hooks
  const { toast, showToast, hideToast } = useToast();
  const {
    data,
    fileName,
    lastModified,
    dirHandle,
    permissionGranted,
    error,
    isLoading,
    handleFileUpload,
    handleFolderSelect,
    clearError,
  } = useProductData();
  const {
    keyword,
    setKeyword,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    filters,
    uniqueValues,
    filteredData,
    handleFilterChange,
    clearFilters,
  } = useProductFilters(data);
  const {
    cart,
    showCart,
    setShowCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemCount,
  } = useCart(showToast);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Product navigation (modal)
  const handleNextProduct = () => {
    if (!selectedProduct) return;
    const idx = filteredData.findIndex(p => p['受注№'] === selectedProduct['受注№']);
    if (idx < filteredData.length - 1) setSelectedProduct(filteredData[idx + 1]);
  };
  const handlePrevProduct = () => {
    if (!selectedProduct) return;
    const idx = filteredData.findIndex(p => p['受注№'] === selectedProduct['受注№']);
    if (idx > 0) setSelectedProduct(filteredData[idx - 1]);
  };
  const currentIdx = selectedProduct ? filteredData.findIndex(p => p['受注№'] === selectedProduct['受注№']) : -1;
  const hasNext = currentIdx !== -1 && currentIdx < filteredData.length - 1;
  const hasPrev = currentIdx !== -1 && currentIdx > 0;

  const columns = ['画像', '受注№', '商品コード', 'タイトル', '重量', '材質名称', '総色数', '直送先名称'];

  // Register service worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;
      navigator.serviceWorker.register(swUrl).catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="amazon-app">
      {/* Error banner */}
      <ErrorBanner error={error} onClose={clearError} />

      {/* Header */}
      <header className="amazon-header">
        <div className="amazon-header-content">
          <div className="amazon-logo">
            <FileSpreadsheet size={28} />
            <div>
              <h1>商品検索</h1>
              {lastModified && (
                <div className="data-timestamp" title="データの更新日時">
                  <Clock size={12} />
                  <span>更新: {formatDate(lastModified)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="amazon-search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="商品を検索..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="amazon-search-input"
            />
          </div>
          <div className="amazon-header-actions">
            <button onClick={() => setShowCart(!showCart)} className="amazon-btn amazon-cart-btn" title="カートを表示">
              <ShoppingCart size={18} />
              カート ({cartItemCount})
            </button>
            <button onClick={handleFolderSelect} className={`amazon-btn ${permissionGranted ? 'connected' : ''}`} title={permissionGranted ? '画像フォルダ接続済み' : '画像フォルダを接続'}>
              <FolderOpen size={18} />
              {permissionGranted ? '接続済' : '画像フォルダ'}
            </button>
            <label htmlFor="file-input" className="amazon-btn amazon-btn-primary">
              <Upload size={18} />
              {fileName || 'ファイル選択'}
            </label>
            <input id="file-input" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} hidden />
            <button onClick={() => setShowCacheManager(true)} className="amazon-btn" title="キャッシュ管理">
              キャッシュ
            </button>
          </div>
        </div>
      </header>

      {data.length > 0 ? (
        <div className="amazon-main">
          {/* Sidebar Filters */}
          {/* Sidebar Filters */}
          <aside className={`amazon-sidebar ${isFilterOpen ? 'open' : ''}`}>
            <div className="amazon-sidebar-header" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <div className="sidebar-header-title">
                <h2>フィルター</h2>
                <div className="sidebar-toggle-icon">
                  {isFilterOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); clearFilters(); }} className="amazon-clear-btn">
                <FilterX size={16} />
                クリア
              </button>
            </div>
            <div className="amazon-sidebar-content">
              {Object.keys(filters).map(key => (
                <div key={key} className="amazon-filter-group">
                  <label className="amazon-filter-label">{key}</label>
                  <div className="amazon-filter-control">
                    <select
                      value={filters[key][0] || ''}
                      onChange={e => handleFilterChange(key, e.target.value)}
                      className="amazon-filter-select"
                      aria-label={`${key}で絞り込み`}
                    >
                      <option value="">すべて表示</option>
                      {uniqueValues[key].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                    {filters[key].length > 0 && (
                      <button className="amazon-filter-clear-btn" onClick={() => handleFilterChange(key, '')} title="クリア">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="amazon-content">
            {/* Toolbar */}
            <div className="amazon-toolbar">
              <div className="amazon-results-info">
                <strong>{filteredData.length}</strong> 件の商品
              </div>
              <div className="amazon-toolbar-controls">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="amazon-sort-select" aria-label="並び替え">
                  <option value="">並び替え</option>
                  <option value="price-asc">価格: 安い順</option>
                  <option value="price-desc">価格: 高い順</option>
                  <option value="date-desc">最新受注日順</option>
                </select>
                <div className="amazon-view-toggle">
                  <button className={`amazon-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="グリッド表示"><LayoutGrid size={18} /></button>
                  <button className={`amazon-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="テーブル表示"><List size={18} /></button>
                </div>
              </div>
            </div>

            {/* Products */}
            {viewMode === 'grid' ? (
              <div className="amazon-products-grid">
                {paginatedData.map((product, idx) => (
                  <ProductCard
                    key={idx}
                    product={product}
                    dirHandle={dirHandle}
                    onClick={() => setSelectedProduct(product)}
                    onAddToCart={addToCart}
                    keyword={keyword}
                  />
                ))}
              </div>
            ) : (
              <div className="amazon-table-container">
                <table className="amazon-table">
                  <thead>
                    <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <tr key={idx} onClick={() => setSelectedProduct(row)} style={{ cursor: 'pointer' }}>
                        {columns.map(col => (
                          <td key={col}>
                            {col === '画像' ? (
                              <ProductImage dirHandle={dirHandle} filename={row['受注№']} productCode={row['商品コード']} onClick={url => setModalImage(url)} />
                            ) : (
                              <HighlightText text={row[col]} keyword={keyword} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="amazon-pagination">
                <button className="amazon-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={18} /> 前へ
                </button>
                <div className="amazon-page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button key={pageNum} className={`amazon-page-num ${currentPage === pageNum ? 'active' : ''}`} onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>
                    );
                  })}
                </div>
                <button className="amazon-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  次へ <ChevronRight size={18} />
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

      {/* Modals */}
      <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />
      <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} dirHandle={dirHandle} onNext={handleNextProduct} onPrev={handlePrevProduct} hasNext={hasNext} hasPrev={hasPrev} />
      {showCart && (
        <CartModal cart={cart} onClose={() => setShowCart(false)} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onClear={clearCart} total={cartTotal} fileName={fileName} />
      )}
      {showCacheManager && (
        <CacheManager onClose={() => setShowCacheManager(false)} />
      )}

      <Toast message={toast.message} type={toast.type} isVisible={toast.show} onClose={hideToast} />
    </div>
  );
}

export default App;
