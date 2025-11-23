import React from 'react';
import { ShoppingCart } from 'lucide-react';
import ProductImage from './ProductImage';

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

export default ProductCard;
