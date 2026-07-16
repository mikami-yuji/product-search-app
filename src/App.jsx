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
  const [isFilterOpen, setIsFilterOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 480;
    }
    return true; // Default to open for SSR/build
  });

  // Custom hooks
  const { toast, showToast, hideToast } = useToast();
  const {
    data,
    fileName,
    lastModified,
    dirHandle,
    permissionGranted,
    customerPermissionGranted,
    customerFiles,
    error,
    handleFileUpload,
    handleFolderSelect,
    handleCustomerFolderSelect,
    loadCustomerFile,
    clearError,
  } = useProductData();

  // Customer search state
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState('');

  // Filter customer files based on search keyword
  const filteredCustomerFiles = customerFiles.filter(file =>
    file.name.toLowerCase().includes(customerSearchKeyword.toLowerCase())
  );
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
              id="search-input"
              name="keyword"
              aria-label="商品検索"
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
            <button onClick={handleCustomerFolderSelect} className={`amazon-btn ${customerPermissionGranted ? 'connected' : ''}`} title={customerPermissionGranted ? '顧客フォルダ接続済み' : '顧客フォルダを接続'}>
              <FolderOpen size={18} />
              {customerPermissionGranted ? '顧客接続済' : '顧客フォルダ'}
            </button>
            <button onClick={handleFolderSelect} className={`amazon-btn ${permissionGranted ? 'connected' : ''}`} title={permissionGranted ? '画像フォルダ接続済み' : '画像フォルダを接続'}>
              <FolderOpen size={18} />
              {permissionGranted ? '画像接続済' : '画像フォルダ'}
            </button>
            <label htmlFor="file-input" className="amazon-btn amazon-btn-primary">
              <Upload size={18} />
              {fileName || 'ファイル選択'}
            </label>
            <input id="file-input" name="file" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} hidden />
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
            {/* 顧客選択セクション */}
            <div className="amazon-sidebar-section customer-section">
              <div className="customer-section-header">
                <h2>顧客選択</h2>
              </div>
              {!customerPermissionGranted ? (
                <div className="customer-connect-prompt">
                  <p className="prompt-text">顧客フォルダが接続されていません。</p>
                  <button onClick={handleCustomerFolderSelect} className="amazon-btn amazon-btn-primary customer-connect-btn">
                    <FolderOpen size={16} /> 顧客フォルダを選択
                  </button>
                </div>
              ) : (
                <div className="customer-select-controls">
                  <div className="customer-search-box">
                    <Search size={16} className="customer-search-icon" />
                    <input
                      type="text"
                      placeholder="顧客名で検索..."
                      value={customerSearchKeyword}
                      onChange={e => setCustomerSearchKeyword(e.target.value)}
                      className="customer-search-input"
                    />
                  </div>
                  
                  {filteredCustomerFiles.length > 0 ? (
                    <div className="customer-list-container">
                      <ul className="customer-list">
                        {filteredCustomerFiles.map(file => {
                          const isCurrent = fileName === file.name;
                          return (
                            <li 
                              key={file.name} 
                              className={`customer-item ${isCurrent ? 'active' : ''}`}
                              onClick={() => {
                                if (!isCurrent) {
                                  loadCustomerFile(file.name);
                                }
                              }}
                            >
                              <span className="customer-name" title={file.name}>
                                {file.name.replace(/\.xlsx?$/, '')}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="no-customers-text">該当する顧客が見つかりません</p>
                  )}
                </div>
              )}
            </div>
            
            <hr className="sidebar-divider" />

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
          <p>右上の「ファイル選択」から個別にExcelファイルを開くか、顧客フォルダを接続してください。</p>
          
          {!customerPermissionGranted ? (
            <button onClick={handleCustomerFolderSelect} className="amazon-btn amazon-btn-primary empty-connect-btn" style={{ marginTop: '1.5rem' }}>
              <FolderOpen size={18} /> 顧客フォルダを接続する
            </button>
          ) : (
            <div className="empty-customer-select" style={{ marginTop: '1.5rem', width: '100%', maxWidth: '400px' }}>
              <div className="customer-search-box">
                <Search size={16} className="customer-search-icon" />
                <input
                  type="text"
                  placeholder="顧客名で検索..."
                  value={customerSearchKeyword}
                  onChange={e => setCustomerSearchKeyword(e.target.value)}
                  className="customer-search-input"
                />
              </div>
              {filteredCustomerFiles.length > 0 ? (
                <div className="customer-list-container" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '0.75rem', background: '#fff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
                  <ul className="customer-list" style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                    {filteredCustomerFiles.map(file => (
                      <li
                        key={file.name}
                        className="customer-item"
                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.2s' }}
                        onClick={() => loadCustomerFile(file.name)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7f7f7'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="customer-name" style={{ color: '#111', fontSize: '0.9rem', fontWeight: 500 }}>
                          {file.name.replace(/\.xlsx?$/, '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ marginTop: '0.75rem', color: '#888', fontSize: '0.9rem' }}>該当する顧客が見つかりません</p>
              )}
            </div>
          )}
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
