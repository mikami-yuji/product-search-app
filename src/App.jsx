import React, { useState } from 'react';
import { Upload, Search, FileSpreadsheet, FilterX, FolderOpen, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import './index.css';

// Import Components
import ProductImage from './ProductImage';
import ImageModal from './ImageModal';
import CartModal from './CartModal';
import ProductDetailsModal from './ProductDetailsModal';
import ProductCard from './ProductCard';
import Toast from './Toast';
import HighlightText from './HighlightText';

// Import Custom Hooks
import { useToast, useCart, useProductData, useProductFilters } from './hooks';

function App() {
  // UI State
  const [modalImage, setModalImage] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [itemsPerPage] = useState(20);

  // Custom Hooks
  const { toast, showToast, hideToast } = useToast();
  const { data, fileName, dirHandle, permissionGranted, handleFileUpload, handleFolderSelect } = useProductData();
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
    clearFilters
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
    cartItemCount
  } = useCart(showToast);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Product Navigation
  const handleNextProduct = () => {
    if (!selectedProduct || filteredData.length === 0) return;
    const currentIndex = filteredData.findIndex(p => p['受注№'] === selectedProduct['受注№']);
    if (currentIndex < filteredData.length - 1) {
      setSelectedProduct(filteredData[currentIndex + 1]);
    }
  };

  const handlePrevProduct = () => {
    if (!selectedProduct || filteredData.length === 0) return;
    const currentIndex = filteredData.findIndex(p => p['受注№'] === selectedProduct['受注№']);
    if (currentIndex > 0) {
      setSelectedProduct(filteredData[currentIndex - 1]);
    }
  };

  const currentIndex = selectedProduct ? filteredData.findIndex(p => p['受注№'] === selectedProduct['受注№']) : -1;
  const hasNext = currentIndex !== -1 && currentIndex < filteredData.length - 1;
  const hasPrev = currentIndex !== -1 && currentIndex > 0;

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
                <label className="amazon-filter-label">{key}</label>
                <div className="amazon-filter-control">
                  <select
                    value={filters[key][0] || ''}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className="amazon-filter-select"
                  >
                    <option value="">すべて表示</option>
                    {uniqueValues[key].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                  {filters[key].length > 0 && (
                    <button
                      className="amazon-filter-clear-btn"
                      onClick={() => handleFilterChange(key, '')}
                      title="クリア"
                    >
                      ×
                    </button>
                  )}
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
                                  onClick={(url) => {
                                    setModalImage(url);
                                  }}
                                />
                              ) : (
                                <HighlightText text={row[col]} keyword={keyword} />
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
        onNext={handleNextProduct}
        onPrev={handlePrevProduct}
        hasNext={hasNext}
        hasPrev={hasPrev}
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

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}

export default App;
