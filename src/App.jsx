import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { createProductExcelWorkbook } from './utils/excelExporter';
import { createProductHtmlString } from './utils/htmlExporter';
import { Upload, Search, FileSpreadsheet, FileCode, FilterX, FolderOpen, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart, Clock, ChevronDown, ChevronUp, Tag, Scale, Layers, Palette, Check, X, Users, MapPin, ImageIcon } from './icons';
import './index.css';

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

// Skeleton Loading Card for UX enhancement
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-pulse" style={{ width: '100%', height: '200px' }} />
    <div style={{ padding: '1rem' }}>
      <div className="skeleton-line skeleton-title skeleton-pulse" />
      <div className="skeleton-line skeleton-meta skeleton-pulse" />
      <div className="skeleton-line skeleton-meta skeleton-pulse" style={{ width: '40%' }} />
      <div className="skeleton-line skeleton-price skeleton-pulse" />
    </div>
  </div>
);

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

  // Initialize theme to light mode and clean up any dark mode classes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.remove('dark-mode');
      localStorage.removeItem('theme');
    }
  }, []);

  // Search History State
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);

  // Direct shipping search state
  const [directShippingSearchKeyword, setDirectShippingSearchKeyword] = useState('');
  const [showExcelDropdown, setShowExcelDropdown] = useState(false);

  // Sidebar Accordion Open States
  const [openFilters, setOpenFilters] = useState({
    '種別': true,
    '重量': false,
    '材質名称': true,
    '総色数': false,
    '直送先名称': false
  });

  // Custom hooks
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
    isFileSystemSupported,
    handleFileUpload,
    handleFolderSelect,
    handleImageFilesSelect,
    handleCustomerFolderSelect,
    handleCustomerFilesSelect,
    loadCustomerFile: originalLoadCustomerFile,
    clearError,
  } = useProductData();

  /**
   * 顧客ファイルをロードし、直送先検索キーワードをリセットする。
   * 
   * @param {string} name - ロードするファイル名
   * @returns {Promise<void>}
   */
  const loadCustomerFile = useMemo(() => {
    return async (name) => {
      await originalLoadCustomerFile(name);
      setDirectShippingSearchKeyword('');
    };
  }, [originalLoadCustomerFile]);

  // Trigger mobile file input click
  const triggerCustomerFilesSelect = () => {
    document.getElementById('customer-files-input')?.click();
  };

  // Customer search state
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState('');
  
  // Reset direct shipping search keyword handled in loadCustomerFile wrapper
  
  // Cart bounce state
  const [cartBouncing, setCartBouncing] = useState(false);

  // Filter customer files based on search keyword
  const filteredCustomerFiles = customerFiles.filter(file =>
    file.name.toLowerCase().includes(customerSearchKeyword.toLowerCase())
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
    clearFilters,
  } = useProductFilters(data);

  // Filter direct shipping destinations based on search keyword
  const filteredDirectShippings = useMemo(() => {
    const list = uniqueValues['直送先名称'] || [];
    if (!directShippingSearchKeyword.trim()) return list;
    const kw = directShippingSearchKeyword.toLowerCase().trim();
    return list.filter(name => name.toLowerCase().includes(kw));
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
    cartItemCount,
  } = useCart(showToast);

  // Trigger bounce animation when cart item count changes
  useEffect(() => {
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

  /**
   * 現在表示されている（検索・フィルターで絞り込まれた）商品データをExcelファイルとして生成し、ダウンロードする。
   * 
   * @param {Object} [options]
   * @param {boolean} [options.includeImages=false] - 画像を含めるかどうか
   * @returns {Promise<void>}
   */
  const handleExportExcel = async (options = { includeImages: false }) => {
    if (!filteredData || filteredData.length === 0) {
      showToast('出力するデータがありません', 'error');
      return;
    }

    const { includeImages = false } = options;
    showToast(includeImages ? '画像付きExcelファイルを生成中...' : 'Excelファイルを生成中...', 'info');

    try {
      const wb = await createProductExcelWorkbook(filteredData, fileName, { includeImages, dirHandle });

      const cleanCompanyName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "商品一覧";
      const today = new Date();
      const fileDateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const imageSuffix = includeImages ? "_画像あり" : "";
      const exportFileName = `${cleanCompanyName}_商品一覧${imageSuffix}_${fileDateStr}.xlsx`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Excelファイル(${includeImages ? '画像付き' : '画像なし'})をエクスポートしました`, 'success');
    } catch (err) {
      console.error('Excelエクスポートエラー:', err);
      showToast(err.message || 'Excelファイルの生成に失敗しました', 'error');
    }
  };

  /**
   * 現在表示されている（検索・フィルターで絞り込まれた）商品データをHTMLファイルとして生成し、ダウンロードする。
   * 
   * @returns {Promise<void>}
   */
  const handleExportHtml = async () => {
    if (!filteredData || filteredData.length === 0) {
      showToast('出力するデータがありません', 'error');
      return;
    }

    showToast('HTMLファイルを生成中...画像点数により時間がかかる場合があります', 'info');

    try {
      const htmlString = await createProductHtmlString(filteredData, fileName, dirHandle);

      const cleanCompanyName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "商品一覧";
      const today = new Date();
      const fileDateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const exportFileName = `${cleanCompanyName}_商品一覧_${fileDateStr}.html`;

      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('HTMLファイルをエクスポートしました', 'success');
    } catch (err) {
      console.error('HTMLエクスポートエラー:', err);
      showToast(err.message || 'HTMLファイルの生成に失敗しました', 'error');
    }
  };

  /**
   * 検索クエリを履歴に追加し、ローカルストレージに保存する。
   * 
   * @param {string} query - 追加する検索文字列
   * @returns {void}
   */
  const addToHistory = (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    setHistory(prev => {
      const filtered = prev.filter(item => item !== trimmed);
      const nextHistory = [trimmed, ...filtered].slice(0, 8);
      localStorage.setItem('search_history', JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  /**
   * 検索クエリを履歴から削除し、ローカルストレージを更新する。
   * 
   * @param {React.MouseEvent} e - マウスイベント
   * @param {string} query - 削除する検索文字列
   * @returns {void}
   */
  const removeFromHistory = (e, query) => {
    e.stopPropagation();
    setHistory(prev => {
      const nextHistory = prev.filter(item => item !== query);
      localStorage.setItem('search_history', JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  /**
   * 検索キーワードを確定し、履歴への保存とポップアップの非表示を行う。
   * 
   * @param {string} query - 確定した検索文字列
   * @returns {void}
   */
  const handleSearchSubmit = (query) => {
    setKeyword(query);
    addToHistory(query);
    setIsSearchFocused(false);
    setActiveSuggestionIdx(-1);
  };

  /**
   * 検索窓でのキーボード入力を処理し、候補の移動や決定を行う。
   * 
   * @param {React.KeyboardEvent} e - キーボードイベント
   * @returns {void}
   */
  const handleSearchKeyDown = (e) => {
    const activeList = keyword ? suggestions : history;
    if (activeList.length === 0) {
      if (e.key === 'Enter') {
        handleSearchSubmit(keyword);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev < activeList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev > 0 ? prev - 1 : activeList.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < activeList.length) {
        handleSearchSubmit(activeList[activeSuggestionIdx]);
      } else {
        handleSearchSubmit(keyword);
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setActiveSuggestionIdx(-1);
    }
  };

  /**
   * フィルターカテゴリのアコーディオン開閉状態を切り替える。
   * 
   * @param {string} sectionKey - カテゴリキー
   * @returns {void}
   */
  const toggleFilterSection = (sectionKey) => {
    setOpenFilters(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

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

  const activeChips = useMemo(() => {
    const chips = [];
    Object.keys(filters).forEach(key => {
      filters[key].forEach(val => {
        chips.push({ key, val, label: `${key}: ${val}` });
      });
    });
    return chips;
  }, [filters]);

  const categoryIcons = {
    '種別': <Tag size={16} className="filter-category-icon" />,
    '重量': <Scale size={16} className="filter-category-icon" />,
    '材質名称': <Layers size={16} className="filter-category-icon" />,
    '総色数': <Palette size={16} className="filter-category-icon" />,
  };

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
          <div className="amazon-search-container">
            <div className="search-scope-select-wrapper">
              <select
                value={searchScope}
                onChange={e => setSearchScope(e.target.value)}
                className="search-scope-select"
                aria-label="検索対象"
              >
                <option value="all">すべて</option>
                <option value="title">タイトル</option>
                <option value="code">コード</option>
              </select>
            </div>
            <div 
              className="amazon-search-bar"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  setIsSearchFocused(false);
                  setActiveSuggestionIdx(-1);
                }, 200);
              }}
            >
              <Search size={20} className="search-icon" />
              <input
                id="search-input"
                name="keyword"
                aria-label="商品検索"
                type="text"
                placeholder="商品を検索..."
                value={keyword}
                onChange={e => {
                  setKeyword(e.target.value);
                  setActiveSuggestionIdx(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                className="amazon-search-input"
                autoComplete="off"
              />
              {isSearchFocused && (keyword ? suggestions.length > 0 : history.length > 0) && (
                <div className="search-history-dropdown">
                  <div className="search-history-header">
                    {keyword ? '検索候補' : '最近の検索履歴'}
                  </div>
                  <div className="search-history-list">
                    {(keyword ? suggestions : history).map((item, idx) => (
                      <div
                        key={item}
                        className={`search-history-item ${idx === activeSuggestionIdx ? 'active' : ''}`}
                        onMouseDown={() => handleSearchSubmit(item)}
                        onMouseEnter={() => setActiveSuggestionIdx(idx)}
                      >
                        <span className="search-history-text">{item}</span>
                        {!keyword && (
                          <button
                            className="clear-history-btn"
                            onMouseDown={(e) => removeFromHistory(e, item)}
                            title="履歴から削除"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="amazon-header-actions">

            <button onClick={() => setShowCart(!showCart)} className={`amazon-btn amazon-cart-btn ${cartBouncing ? 'cart-bounce' : ''}`} title="カートを表示">
              <ShoppingCart size={18} />
              カート ({cartItemCount})
            </button>
            <button 
              onClick={isFileSystemSupported ? handleCustomerFolderSelect : triggerCustomerFilesSelect} 
              className={`amazon-btn ${customerPermissionGranted ? 'connected' : ''}`} 
              title={
                isFileSystemSupported
                  ? (customerPermissionGranted ? '顧客フォルダ接続済み' : '顧客フォルダを接続')
                  : (customerPermissionGranted ? '顧客ファイル選択済み' : '顧客ファイルを選択')
              }
            >
              <FolderOpen size={18} />
              {isFileSystemSupported
                ? (customerPermissionGranted ? '顧客接続済' : '顧客フォルダ')
                : (customerPermissionGranted ? '顧客選択済' : '顧客ファイル')}
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
            <input id="customer-files-input" name="customerFiles" type="file" accept=".xlsx,.xls" onChange={handleCustomerFilesSelect} multiple hidden />
            <input id="image-files-input" name="imageFiles" type="file" accept="image/*,.jpg,.jpeg,.png,.JPG,.JPEG,.PNG" onChange={handleImageFilesSelect} multiple hidden />
            <input id="image-folder-input" name="imageFolder" type="file" accept="image/*,.jpg,.jpeg,.png,.JPG,.JPEG,.PNG" onChange={handleImageFilesSelect} multiple webkitdirectory="" hidden />
            <button onClick={() => setShowCacheManager(true)} className="amazon-btn" title="キャッシュ管理">
              キャッシュ
            </button>
          </div>
        </div>
      </header>

      {data.length > 0 || isLoading ? (
        <div className="amazon-main">
          {/* Sidebar Filters */}
          <aside className={`amazon-sidebar ${isFilterOpen ? 'open' : ''}`}>
            {/* 顧客選択セクション */}
            <div className="amazon-sidebar-section customer-section">
              <div className="customer-section-header">
                <h2>
                  <Users size={18} className="section-title-icon" />
                  {isFileSystemSupported ? '顧客選択' : '顧客ファイル選択'}
                </h2>
              </div>
              {!customerPermissionGranted ? (
                <div className="customer-connect-prompt">
                  <p className="prompt-text">
                    {isFileSystemSupported ? '顧客フォルダが接続されていません。' : '顧客ファイルが選択されていません。'}
                  </p>
                  <button 
                    onClick={isFileSystemSupported ? handleCustomerFolderSelect : triggerCustomerFilesSelect} 
                    className="amazon-btn amazon-btn-primary customer-connect-btn"
                  >
                    <FolderOpen size={16} /> {isFileSystemSupported ? '顧客フォルダを選択' : '顧客ファイルを選択'}
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
                    {customerSearchKeyword && (
                      <button 
                        type="button" 
                        className="search-clear-btn" 
                        onClick={() => setCustomerSearchKeyword('')} 
                        title="検索をクリア"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {filteredCustomerFiles.length > 0 ? (
                    <div className="customer-list-container">
                      <ul className="customer-list">
                        {filteredCustomerFiles.map(file => {
                          const isCurrent = fileName === file.name;
                          const rawName = file.name.replace(/\.xlsx?$/, '');
                          const match = rawName.match(/^([0-9A-Za-z]+)[_\s-]+(.+)$/);
                          const codeBadge = match ? match[1] : null;
                          const displayName = match ? match[2] : rawName;

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
                              <div className="customer-item-main">
                                {codeBadge && <span className="customer-code-badge">{codeBadge}</span>}
                                <span className="customer-name-text" title={rawName}>
                                  {displayName}
                                </span>
                              </div>
                              {isCurrent && <Check size={16} className="active-check-icon" />}
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

            {/* 直送先選択セクション */}
            {customerPermissionGranted && (
              <div className="amazon-sidebar-section customer-section direct-shipping-section">
                <div className="customer-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2>
                    <MapPin size={18} className="section-title-icon" />
                    直送先選択
                  </h2>
                  {filters['直送先名称'] && filters['直送先名称'].length > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); clearFilterKey('直送先名称'); }} 
                      className="amazon-clear-btn" 
                      title="直送先選択をクリア"
                    >
                      <FilterX size={14} />
                      クリア ({filters['直送先名称'].length})
                    </button>
                  )}
                </div>
                <div className="customer-select-controls">
                  <div className="customer-search-box">
                    <Search size={16} className="customer-search-icon" />
                    <input
                      type="text"
                      placeholder="直送先名で検索..."
                      value={directShippingSearchKeyword}
                      onChange={e => setDirectShippingSearchKeyword(e.target.value)}
                      className="customer-search-input"
                    />
                    {directShippingSearchKeyword && (
                      <button 
                        type="button" 
                        className="search-clear-btn" 
                        onClick={() => setDirectShippingSearchKeyword('')} 
                        title="検索をクリア"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {filteredDirectShippings.length > 0 ? (
                    <div className="customer-list-container">
                      <ul className="customer-list">
                        {filteredDirectShippings.map(shipping => {
                          const isSelected = filters['直送先名称'].includes(shipping);
                          return (
                            <li 
                              key={shipping} 
                              className={`customer-item shipping-item ${isSelected ? 'active' : ''}`}
                              onClick={() => handleFilterChange('直送先名称', shipping)}
                            >
                              <div className="customer-item-main">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="shipping-checkbox"
                                />
                                <span className="customer-name-text" title={shipping}>
                                  {shipping}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="no-customers-text">該当する直送先が見つかりません</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="amazon-sidebar-section filter-panel-section">
              <div className="amazon-sidebar-header" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <div className="sidebar-header-title">
                  <h2>フィルター</h2>
                  <div className="sidebar-toggle-icon">
                    {isFilterOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
                {activeChips.length > 0 && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      clearFilters(); 
                      setDirectShippingSearchKeyword(''); 
                    }} 
                    className="amazon-clear-btn active" 
                    title="すべてのフィルターをクリア"
                  >
                    <FilterX size={14} />
                    全クリア ({activeChips.length})
                  </button>
                )}
              </div>

              {/* アクティブフィルタータグ（チップ）表示エリア */}
              {activeChips.length > 0 && (
                <div className="active-filter-chips-container">
                  <div className="active-chips-label">選択中の条件:</div>
                  <div className="active-chips-list">
                    {activeChips.map((chip, idx) => (
                      <span key={`${chip.key}-${chip.val}-${idx}`} className="filter-chip">
                        <span className="chip-text">{chip.val}</span>
                        <button 
                          type="button" 
                          className="chip-remove-btn" 
                          onClick={() => handleFilterChange(chip.key, chip.val)}
                          title="条件を解除"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isFilterOpen && (
                <div className="amazon-sidebar-content">
                  {Object.keys(filters).filter(key => key !== '直送先名称').map(key => {
                    const isOpen = openFilters[key];
                    const activeCount = filters[key].length;
                    return (
                      <div key={key} className={`amazon-filter-group-accordion ${isOpen ? 'open' : ''}`}>
                        <div className="filter-group-header" onClick={() => toggleFilterSection(key)}>
                          <span className="filter-group-title">
                            {categoryIcons[key] || <Tag size={16} className="filter-category-icon" />}
                            <span>{key}</span>
                            {activeCount > 0 && <span className="active-filter-badge">{activeCount}</span>}
                          </span>
                          <span className="accordion-arrow">
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </div>
                        {isOpen && (
                          <div className="filter-group-body">
                            {activeCount > 0 && (
                              <button 
                                className="clear-group-filter-btn" 
                                onClick={(e) => { e.stopPropagation(); clearFilterKey(key); }}
                              >
                                この項目をクリア
                              </button>
                            )}
                            <div className="filter-checkbox-list">
                              {uniqueValues[key].map(val => {
                                const count = facetCounts[key]?.[val] ?? 0;
                                const isChecked = filters[key].includes(String(val));
                                const isDisabled = count === 0 && !isChecked;
                                return (
                                  <label 
                                    key={val} 
                                    className={`filter-checkbox-label ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}
                                  >
                                    <div className="checkbox-label-left">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => handleFilterChange(key, String(val))}
                                      />
                                      <span className="filter-value-text" title={val}>{val}</span>
                                    </div>
                                    <span className="filter-count">({count})</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                <div className="excel-export-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={() => setShowExcelDropdown(prev => !prev)}
                    className="amazon-btn amazon-btn-primary excel-export-btn"
                    title="商品一覧をExcel出力"
                  >
                    <FileSpreadsheet size={16} />
                    Excel出力
                    <ChevronDown size={14} style={{ marginLeft: '2px' }} />
                  </button>

                  {showExcelDropdown && (
                    <div className="excel-dropdown-menu">
                      <button
                        className="excel-dropdown-item"
                        onClick={() => {
                          setShowExcelDropdown(false);
                          handleExportExcel({ includeImages: false });
                        }}
                      >
                        <FileSpreadsheet size={16} className="dropdown-item-icon text-icon" />
                        <div>
                          <span className="dropdown-item-title">画像なしで出力</span>
                          <span className="dropdown-item-sub">テキストのみ・高速</span>
                        </div>
                      </button>

                      <button
                        className="excel-dropdown-item"
                        onClick={() => {
                          setShowExcelDropdown(false);
                          handleExportExcel({ includeImages: true });
                        }}
                      >
                        <ImageIcon size={16} className="dropdown-item-icon image-icon" />
                        <div>
                          <span className="dropdown-item-title">画像付きで出力</span>
                          <span className="dropdown-item-sub">商品画像埋め込み</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleExportHtml}
                  className="amazon-btn amazon-btn-primary html-export-btn"
                  title="商品一覧をHTML出力（単価・印刷代なし）"
                >
                  <FileCode size={16} />
                  HTML出力
                </button>
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
            {isLoading ? (
              <div className="amazon-products-grid">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <SkeletonCard key={idx} />
                ))}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="amazon-products-grid fade-in-up">
                {paginatedData.map((product, idx) => (
                  <ProductCard
                    key={`${product['受注№'] || product['商品コード'] || idx}`}
                    product={product}
                    dirHandle={dirHandle}
                    imageFilesMap={imageFilesMap}
                    customerFileName={fileName}
                    onClick={() => setSelectedProduct(product)}
                    onAddToCart={addToCart}
                    keyword={keyword}
                  />
                ))}
              </div>
            ) : (
              <div className="amazon-table-container fade-in-up">
                {/* Desktop view: Standard table */}
                <table className="amazon-table">
                  <thead>
                    <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <tr key={`${row['受注№'] || row['商品コード'] || idx}`} onClick={() => setSelectedProduct(row)} style={{ cursor: 'pointer' }}>
                        {columns.map(col => (
                          <td key={col}>
                            {col === '画像' ? (
                              <ProductImage dirHandle={dirHandle} imageFilesMap={imageFilesMap} filename={row['受注№']} productCode={row['商品コード']} customerFileName={fileName} onClick={url => setModalImage(url)} />
                            ) : (
                              <HighlightText text={row[col]} keyword={keyword} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile view: Card-based list */}
                <div className="mobile-table-cards">
                  {paginatedData.map((row, idx) => (
                    <div 
                      key={`${row['受注№'] || row['商品コード'] || idx}`} 
                      className="mobile-table-card"
                      onClick={() => setSelectedProduct(row)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mobile-card-header">
                        <div className="mobile-card-title">
                          <HighlightText text={row['商品名'] || row['タイトル']} keyword={keyword} />
                        </div>
                        <div className="mobile-card-id">
                          {row['商品コード']}
                        </div>
                      </div>
                      
                      <div className="mobile-card-body">
                        <div className="mobile-card-field" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                          <ProductImage dirHandle={dirHandle} imageFilesMap={imageFilesMap} filename={row['受注№']} productCode={row['商品コード']} customerFileName={fileName} onClick={url => setModalImage(url)} />
                        </div>
                        
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">受注№</span>
                          <span className="mobile-card-value">{row['受注№']}</span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">材質</span>
                          <span className="mobile-card-value">{row['材質名称'] || '-'}</span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">重量</span>
                          <span className="mobile-card-value">{row['重量'] || '-'}</span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">直送先</span>
                          <span className="mobile-card-value" title={row['直送先名称']}>{row['直送先名称'] || '-'}</span>
                        </div>
                      </div>

                      <div className="mobile-card-footer" onClick={e => e.stopPropagation()}>
                        <button 
                          className="mobile-card-btn mobile-card-btn-primary"
                          onClick={() => {
                            addToCart(row);
                            showToast(`${row['商品名'] || row['タイトル']}をカートに追加しました`);
                          }}
                        >
                          カートに追加
                        </button>
                        <button 
                          className="mobile-card-btn mobile-card-btn-secondary"
                          onClick={() => setSelectedProduct(row)}
                        >
                          詳細
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
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
          <p>
            右上の「ファイル選択」から個別にExcelファイルを開くか、
            {isFileSystemSupported ? '顧客フォルダを接続してください。' : '複数の顧客ファイルを選択してください。'}
          </p>
          
          {!customerPermissionGranted ? (
            <button 
              onClick={isFileSystemSupported ? handleCustomerFolderSelect : triggerCustomerFilesSelect} 
              className="amazon-btn amazon-btn-primary empty-connect-btn" 
              style={{ marginTop: '1.5rem' }}
            >
              <FolderOpen size={18} /> {isFileSystemSupported ? '顧客フォルダを接続する' : '顧客ファイルを選択する'}
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
                <div className="customer-list-container" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--rounded-md)', marginTop: '0.75rem', background: 'var(--color-surface)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
                  <ul className="customer-list" style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                    {filteredCustomerFiles.map(file => (
                      <li
                        key={file.name}
                        className="customer-item"
                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}
                        onClick={() => loadCustomerFile(file.name)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--amazon-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="customer-name" style={{ color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 500 }}>
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
