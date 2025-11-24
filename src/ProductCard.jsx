import React from 'react';
import { ShoppingCart } from 'lucide-react';
import ProductImage from './ProductImage';
import HighlightText from './HighlightText';

const ProductCard = ({ product, dirHandle, onClick, onAddToCart, keyword }) => {
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

    const handleAddToCart = (e) => {
        e.stopPropagation();
        onAddToCart(product);
    };

    return (
        <div className={`amazon-product-card ${ageClass}`} onClick={onClick}>
            <div className="amazon-card-image-container">
                <ProductImage
                    dirHandle={dirHandle}
                    filename={product['受注№']}
                    productCode={product['商品コード']}
                    className="amazon-card-image"
                />
            </div>
            <div className="amazon-card-content">
                <h3 className="amazon-card-title">
                    <HighlightText
                        text={product['種別'] === '既製品' ? product['商品名'] : (product['タイトル'] || product['商品名'])}
                        keyword={keyword}
                    />
                </h3>
                <div className="amazon-card-meta">
                    <span className="amazon-card-code">
                        <HighlightText text={product['商品コード']} keyword={keyword} />
                    </span>
                    <span className="amazon-card-order-no">
                        <HighlightText text={product['受注№']} keyword={keyword} />
                    </span>
                </div>
                <div className="amazon-card-details">
                    <div className="amazon-detail-row">
                        <span className="amazon-detail-label">材質:</span>
                        <span className="amazon-detail-value">
                            <HighlightText text={product['材質名称']} keyword={keyword} />
                        </span>
                    </div>
                    <div className="amazon-detail-row">
                        <span className="amazon-detail-label">直送先:</span>
                        <span className="amazon-detail-value">
                            <HighlightText text={product['直送先名称']} keyword={keyword} />
                        </span>
                    </div>
                    {product['単価'] && (
                        <div className="amazon-card-price">
                            ¥{Number(product['単価']).toLocaleString()}
                        </div>
                    )}
                </div>
                <button
                    className="amazon-add-to-cart-btn"
                    onClick={handleAddToCart}
                >
                    <ShoppingCart size={18} />
                    カートに追加
                </button>
            </div>
        </div>
    );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(ProductCard, (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
        prevProps.product['受注№'] === nextProps.product['受注№'] &&
        prevProps.keyword === nextProps.keyword &&
        prevProps.dirHandle === nextProps.dirHandle
    );
});
