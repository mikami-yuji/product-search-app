import React, { useState, useRef } from 'react';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import OrderSheet from './OrderSheet';

const CartModal = ({ cart, onClose, onUpdateQuantity, onRemove, onClear, total, fileName }) => {
    const [copied, setCopied] = useState(false);
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    const generateEmailText = () => {
        const date = new Date().toLocaleDateString('ja-JP');
        // ファイル名から拡張子を削除し、（株）を株式会社に置き換えて会社名として表示
        const companyName = fileName
            ? fileName.replace(/\.[^/.]+$/, "").replace(/[\(（]株[\)）]/g, "株式会社")
            : "株式会社サンプル商事";

        let emailText = `お疲れ様です。\n\n`;
        emailText += `【注文依頼】\n\n`;
        emailText += `注文日: ${date}\n`;
        emailText += `発注者: ${companyName}\n\n`;
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
            emailText += `\n`;
        });

        emailText += `${'='.repeat(60)}\n`;
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
                    {cart.map((item, index) => {
                        const price = parseFloat(item['単価']) || 0;
                        const printingCost = parseFloat(item['印刷代']) || 0;
                        const itemTotal = (price * item.quantity) + printingCost;

                        return (
                            <div key={index} className="cart-item">
                                <div className="cart-item-info">
                                    <h3>{item['種別'] === '既製品' ? item['商品名'] : item['タイトル']}</h3>
                                    <p className="cart-item-meta">#{item['受注№']} | {item['材質名称']}</p>
                                    {item['単価'] && (
                                        <div className="cart-item-price-details">
                                            <p>単価: ¥{price.toLocaleString()} × {item.quantity}</p>
                                            {printingCost > 0 && (
                                                <p>印刷代: ¥{printingCost.toLocaleString()}</p>
                                            )}
                                            <p className="cart-item-subtotal">小計: ¥{itemTotal.toLocaleString()}</p>
                                        </div>
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
                        );
                    })}
                </div>
                <div className="cart-footer">
                    <div className="cart-total">
                        <span>合計:</span>
                        <span className="cart-total-price">¥{total.toLocaleString()}</span>
                    </div>
                    <div className="cart-actions">
                        <button
                            className="cart-print-btn"
                            onClick={handlePrint}
                        >
                            発注書作成
                        </button>
                        <button
                            className={`cart-checkout-btn ${copied ? 'copied' : ''}`}
                            onClick={handleCopyEmail}
                        >
                            {copied ? '✓ コピーしました！' : 'メール文章をコピー'}
                        </button>
                    </div>
                </div>
            </div>
            <div style={{ display: 'none' }}>
                <OrderSheet
                    ref={componentRef}
                    cart={cart}
                    totalAmount={total}
                    fileName={fileName}
                />
            </div>
        </div>
    );
};

export default CartModal;
