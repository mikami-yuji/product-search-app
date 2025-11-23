import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Search, FileSpreadsheet, FilterX, FolderOpen, Image as ImageIcon, LayoutGrid, List, ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { get, set } from 'idb-keyval';
import './index.css';

const imageCache = {}; // Global memory cache for current session

const ProductImage = ({ dirHandle, filename, productCode, productType, materialName, webImages, className, onClick }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let objectUrl = null;

    const loadImage = async () => {
      // 1. Try Local Image (if folder connected)
      if (dirHandle && filename) {
        try {
          const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
          let fileHandle = null;

          for (const ext of extensions) {
            try {
              try {
                fileHandle = await dirHandle.getFileHandle(`${filename}${ext}`);
                if (fileHandle) break;
              } catch (e) { }

              try {
                fileHandle = await dirHandle.getFileHandle(`${filename}A${ext}`);
                if (fileHandle) break;
              } catch (e) { }
            } catch (e) { }
          }

          if (fileHandle) {
            const file = await fileHandle.getFile();
            objectUrl = URL.createObjectURL(file);
            setImageUrl(objectUrl);
            setError(false);
            return;
          }
        } catch (err) {
          console.error("Error loading local image:", err);
        }
      }

      // External image fetching disabled – only local images are used
      setError(true);
    };

    loadImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    if (!isVisible) {
      return <div ref={imgRef} className={`product-image-container ${className || ''} placeholder`} style={{ minHeight: '100px', background: '#f0f0f0' }} />;
    }

    if (error || !imageUrl) {
      return <div className={`no-image ${className || ''}`}><ImageIcon size={24} /></div>;
    }

    return (
      <div
        className={`product-image-container ${className || ''}`}
        onClick={() => onClick && onClick(imageUrl)}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <img
          src={imageUrl}
          alt={filename}
          className="product-thumbnail"
          onError={(e) => {
            console.error(`Failed to load image: ${imageUrl}`);
            e.target.style.display = 'none';
            setError(true);
          }}
        />
      </div>
    );
  };

  const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={onClose}>×</button>
          <img src={imageUrl} alt="拡大画像" className="modal-image-large" />
        </div>
      </div>
    );
  };

  const CartModal = ({ cart, onClose, onUpdateQuantity, onRemove, onClear, total }) => {
    const [copied, setCopied] = React.useState(false);

    const generateEmailText = () => {
      const date = new Date().toLocaleDateString('ja-JP');
      let emailText = `【注文依頼】\n\n`;
      emailText += `注文日: ${date}\n\n`;
      emailText += `商品一覧:\n`;
      emailText += `${'='.repeat(60)}\n\n`;

      cart.forEach((item, index) => {
        const displayName = item['種別'] === '既製品' ? item['商品名'] : item['タイトル'];
        emailText += `${index + 1}. ${displayName}\n`;
        emailText += `   受注№: ${item['受注№']}\n`;
        emailText += `   商品コード: ${item['商品コード']}\n`;
        emailText += `   材質: ${item['材質名称']}\n`;
        emailText += `   重量: ${item['重量']}\n`;
        emailText += `   数量: ${item.quantity}\n`;
        if (item['単価']) {
          const itemTotal = parseFloat(item['単価']) * item.quantity;
          emailText += `   単価: ¥${parseFloat(item['単価']).toLocaleString()}\n`;
          emailText += `   小計: ¥${itemTotal.toLocaleString()}\n`;
        }
        emailText += `\n`;
      });

      emailText += `${'='.repeat(60)}\n`;
      emailText += `合計金額: ¥${total.toLocaleString()}\n`;
      emailText += `商品点数: ${cart.length}点\n\n`;
      emailText += `よろしくお願いいたします。\n`;

      return emailText;
    };

    const handleCopyEmail = async () => {
      const emailText = generateEmailText();
      try {
        await navigator.clipboard.writeText(emailText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('コピーに失敗しました');
      }
    };

    if (!cart || cart.length === 0) {
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="cart-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={onClose}>×</button>
            <div className="cart-empty">
              <ShoppingCart size={64} />
              <h2>カートは空です</h2>
              <p>商品を追加してください</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="cart-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={onClose}>×</button>
          <div className="cart-header">
            <h2><ShoppingCart size={24} /> カート ({cart.length}件)</h2>
            <button className="cart-clear-btn" onClick={onClear}>
              <Trash2 size={16} />
              全てクリア
            </button>
          </div>
          <div className="cart-items">
            {cart.map((item, index) => (
              <div key={index} className="cart-item">
                <div className="cart-item-info">
                  <h3>{item['種別'] === '既製品' ? item['商品名'] : item['タイトル']}</h3>
                  <p className="cart-item-meta">#{item['受注№']} | {item['材質名称']}</p>
                  {item['単価'] && (
                    <p className="cart-item-price">¥{parseFloat(item['単価']).toLocaleString()} × {item.quantity}</p>
                  )}
                </div>
                <div className="cart-item-controls">
                  <div className="cart-quantity-controls">
                    <button onClick={() => onUpdateQuantity(item['受注№'], item.quantity - 100)}>
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item['受注№'], parseInt(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                    <button onClick={() => onUpdateQuantity(item['受注№'], item.quantity + 100)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <button className="cart-remove-btn" onClick={() => onRemove(item['受注№'])}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              <span>合計:</span>
              <span className="cart-total-price">¥{total.toLocaleString()}</span>
            </div>
            <button
              className={`cart-checkout-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyEmail}
            >
              {copied ? '✓ コピーしました！' : 'メール文章をコピー'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProductDetailsModal = ({ product, onClose, dirHandle, webImages }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [availableImages, setAvailableImages] = useState([]);

    useEffect(() => {
      const checkImages = async () => {
        if (!product) return;

        const images = [];
        const suffixes = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

        if (dirHandle) {
          // Check local images
          for (const suffix of suffixes) {
            for (const ext of extensions) {
              try {
                const filename = `${product['受注№']}${suffix}${ext}`;
                const fileHandle = await dirHandle.getFileHandle(filename);
                if (fileHandle) {
                  const file = await fileHandle.getFile();
                  const url = URL.createObjectURL(file);
                  images.push({ url, suffix, source: 'local' });
                  break; // Found this suffix, move to next
                }
              } catch (e) {
                // File doesn't exist, continue
              }
            }
          }
        }

        setAvailableImages(images);
        setCurrentImageIndex(0);
      };

      checkImages();

      return () => {
        // Cleanup local URLs
        availableImages.forEach(img => {
          if (img.source === 'local') {
            URL.revokeObjectURL(img.url);
          }
        });
      };
    }, [product, dirHandle]);

    const handlePrevImage = () => {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : availableImages.length - 1));
    };

    const handleNextImage = () => {
      setCurrentImageIndex((prev) => (prev < availableImages.length - 1 ? prev + 1 : 0));
    };

    if (!product) return null;

    const currentImage = availableImages[currentImageIndex];

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={onClose}>×</button>
          <div className="modal-body">
            <div className="modal-image">
              {availableImages.length > 0 ? (
                <>
                  {currentImage ? (
                    <img
                      src={currentImage.url}
                      alt={`${product['タイトル']} - ${currentImage.suffix}`}
                      className="modal-product-image"
                    />
                  ) : (
                    <div className="no-image"><ImageIcon size={64} /></div>
                  )}

                  {availableImages.length > 1 && (
                    <>
                      <button className="image-nav-btn prev" onClick={handlePrevImage}>
                        <ChevronLeft size={24} />
                      </button>
                      <button className="image-nav-btn next" onClick={handleNextImage}>
                        <ChevronRight size={24} />
                      </button>
                      <div className="image-indicator">
                        {currentImageIndex + 1} / {availableImages.length}
                        {currentImage && ` (${currentImage.suffix})`}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="no-image"><ImageIcon size={64} /></div>
              )}
            </div>
            <div className="modal-details">
              <h2 className="modal-title">{product['種別'] === '既製品' ? product['商品名'] : product['タイトル']}</h2>

              {/* 基本情報 */}
              <div className="info-section">
                <h3 className="section-title">基本情報</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">受注№</span>
                    <span className="info-value">{product['受注№']}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">種別</span>
                    <span className="info-value">{product['種別']}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">商品コード</span>
                    <span className="info-value">{product['商品コード']}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">JANコード</span>
                    <span className="info-value">{product['JANコード']}</span>
                  </div>
                </div>
              </div>

              {/* 仕様 */}
              <div className="info-section">
                <h3 className="section-title">仕様</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">形状</span>
                    <span className="info-value">{product['形状']}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">重量</span>
                    <span className="info-value">{product['重量']}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">材質名称</span>
                    <span className="info-value">{product['材質名称']}</span>
                  </div>
                </div>
              </div>

              {/* 印刷情報 */}
              {(product['表色数'] || product['裏色数'] || product['総色数'] || product['印刷代']) && (
                <div className="info-section">
                  <h3 className="section-title">印刷情報</h3>
                  <div className="info-grid">
                    {product['表色数'] && (
                      <div className="info-row">
                        <span className="info-label">表色数</span>
                        <span className="info-value">{product['表色数']}</span>
                      </div>
                    )}
                    {product['裏色数'] && (
                      <div className="info-row">
                        <span className="info-label">裏色数</span>
                        <span className="info-value">{product['裏色数']}</span>
                      </div>
                    )}
                    {product['総色数'] && (
                      <div className="info-row">
                        <span className="info-label">総色数</span>
                        <span className="info-value">{product['総色数']}</span>
                      </div>
                    )}
                    {product['印刷代'] && (
                      <div className="info-row">
                        <span className="info-label">印刷代</span>
                        <span className="info-value">{product['印刷代']}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 価格・数量 */}
              <div className="info-section highlight">
                <h3 className="section-title">価格・数量</h3>
                <div className="info-grid">
                  <div className="info-row highlight">
                    <span className="info-label">受注数</span>
                    <span className="info-value">{product['受注数']}</span>
                  </div>
                  <div className="info-row highlight">
                    <span className="info-label">単価</span>
                    <span className="info-value">
                      {product['単価'] ? `¥${parseFloat(product['単価']).toLocaleString()}` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* その他 */}
              <div className="info-section">
                <h3 className="section-title">その他</h3>
                <div className="info-grid">
                  {product['直送先名称'] && (
                    <div className="info-row">
                      <span className="info-label">直送先名称</span>
                      <span className="info-value">{product['直送先名称']}</span>
                    </div>
                  )}
                  {product['最新受注日'] && (
                    <div className="info-row">
                      <span className="info-label">最新受注日</span>
                      <span className="info-value">{product['最新受注日']}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProductCard = ({ product, dirHandle, webImages, onClick, onAddToCart }) => {
    const getAgeColorClass = (dateStr) => {
      if (!dateStr) return '';
      const orderDate = new Date(dateStr);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());

      if (monthsDiff >= 24) return 'age-alert-red';
      if (monthsDiff >= 22) return 'age-alert-yellow';
      return '';
    };

    const ageClass = getAgeColorClass(product['最新受注日']);

    return (
      <div className={`amazon-product-card ${ageClass}`}>
        <div className="amazon-card-image" onClick={onClick}>
          <ProductImage
            dirHandle={dirHandle}
            filename={product['受注№']}
            productCode={product['商品コード']}
            productType={product['種別'] || product['形状']}
            materialName={product['材質名称']}
            webImages={webImages}
            className="card-image"
            onClick={null}
          />
        </div>
        <div className="amazon-card-content">
          <h3 className="amazon-card-title" onClick={onClick}>{product['種別'] === '既製品' ? product['商品名'] : product['タイトル']}</h3>
          <div className="amazon-card-meta">
            <span className="amazon-card-id">#{product['受注№']}</span>
            {product['商品コード'] && (
              <span className="amazon-card-id"> | {product['商品コード']}</span>
            )}
          </div>
          <div className="amazon-card-details">
            <div className="amazon-detail-row">
              <span className="amazon-detail-label">重量:</span>
              <span className="amazon-detail-value">{product['重量']}</span>
            </div>
            <div className="amazon-detail-row">
              <span className="amazon-detail-label">材質:</span>
              <span className="amazon-detail-value">{product['材質名称']}</span>
            </div>
          </div>
          {product['単価'] && (
            <div className="amazon-card-price">¥{parseFloat(product['単価']).toLocaleString()}</div>
          )}
          <button
            className="amazon-add-to-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
          >
            <ShoppingCart size={16} />
            カートに追加
          </button>
        </div>
      </div>
    );
  };

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
      '種別': '',
      '重量': '',
      '材質名称': '',
      '総色数': '',
      '直送先名称': ''
    });

    // Load persisted data on mount
    useEffect(() => {
      const loadPersistedData = async () => {
        try {
          const savedData = await get('excelData');
          const savedFileName = await get('fileName');
          const savedDirHandle = await get('dirHandle');

          if (savedData) setData(savedData);
          if (savedFileName) setFileName(savedFileName);
          if (savedDirHandle) {
            setDirHandle(savedDirHandle);
            try {
              const perm = await savedDirHandle.queryPermission({ mode: 'read' });
              setPermissionGranted(perm === 'granted');
            } catch (e) {
              console.error("Error querying permission:", e);
              setPermissionGranted(false);
            }
          }
        } catch (err) {
          console.error("Error loading persisted data:", err);
        }
      };
      loadPersistedData();

      // Load web images map
      fetch('/product_images.json')
        .then(res => res.json())
        .then(data => setWebImages(data))
        .catch(err => console.error("Error loading product_images.json:", err));
    }, []);

    // Save data when it changes
    useEffect(() => {
      if (data.length > 0) set('excelData', data);
      if (fileName) set('fileName', fileName);
    }, [data, fileName]);

    // Save dirHandle when it changes
    useEffect(() => {
      if (dirHandle) set('dirHandle', dirHandle);
    }, [dirHandle]);

    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        setData(jsonData);
      };
      reader.readAsBinaryString(file);
    };

    const handleFolderSelect = async () => {
      try {
        if (dirHandle && !permissionGranted) {
          const perm = await dirHandle.requestPermission({ mode: 'read' });
          setPermissionGranted(perm === 'granted');
        } else {
          const handle = await window.showDirectoryPicker();
          setDirHandle(handle);
          setPermissionGranted(true);
        }
      } catch (err) {
        console.error("Error selecting folder:", err);
      }
    };

    const uniqueValues = useMemo(() => {
      const getUnique = (key) => {
        return [...new Set(data.map(item => item[key]).filter(Boolean))].sort();
      };
      return {
        '種別': getUnique('種別'),
        '重量': getUnique('重量'),
        '材質名称': getUnique('材質名称'),
        '総色数': getUnique('総色数'),
        '直送先名称': getUnique('直送先名称')
      };
    }, [data]);

    const filteredData = useMemo(() => {
      let result = data.filter(item => {
        const matchesFilters = Object.keys(filters).every(key => {
          if (!filters[key]) return true;
          return String(item[key]) === String(filters[key]);
        });

        if (!matchesFilters) return false;
        if (!keyword) return true;

        const lowerKeyword = keyword.toLowerCase();
        return Object.values(item).some(val =>
          String(val).toLowerCase().includes(lowerKeyword)
        );
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

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
      setCurrentPage(1);
    }, [filters, keyword, sortBy]);

    const handleFilterChange = (key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
      setFilters({
        '種別': '',
        '重量': '',
        '材質名称': '',
        '総色数': '',
        '直送先名称': ''
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
                  <label>{key}</label>
                  <select
                    value={filters[key]}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className="amazon-select"
                  >
                    <option value="">全て</option>
                    {uniqueValues[key].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
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
                                    productType={row['種別'] || row['形状']}
                                    materialName={row['材質名称']}
                                    webImages={webImages}
                                    onClick={(url) => {
                                      setModalImage(url);
                                    }}
                                  />
                                ) : col === 'タイトル' ? (
                                  row['種別'] === '既製品' ? row['商品名'] : row['タイトル']
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
          />
        )}
      </div>
    );
  }

  export default App;
