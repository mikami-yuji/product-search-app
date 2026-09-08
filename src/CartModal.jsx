import React, { useState, useRef } from 'react';
import { ShoppingCart, Trash2, Minus, Plus, Mail, Printer } from './icons';
import { useReactToPrint } from 'react-to-print';
import OrderSheet from './OrderSheet';

const parsePrice = (val) => {
    if (!val) return 0;
    return parseFloat(String(val).replace(/,/g, '')) || 0;
};

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
            ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社")
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

    const handleOpenMailer = () => {
        const emailText = generateEmailText();
        const companyName = fileName
            ? fileName.replace(/\.[^/.]+$/, "").replace(/[(（]株[)）]/g, "株式会社")
            : "発注依頼";
        const todayStr = new Date().toLocaleDateString('ja-JP');
        const subject = `【注文依頼】${companyName} (${todayStr})`;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`;
        window.location.href = mailtoUrl;
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
                        const price = parsePrice(item['単価']);
                        const printingCost = parsePrice(item['印刷代']);
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
                                        <button onClick={() => onUpdateQuantity(item.cartId, item.quantity - 100)}>
                                            <Minus size={16} />
                                        </button>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.cartId, parseInt(e.target.value) || 0)}
                                            min="0"
                                            step="100"
                                        />
                                        <button onClick={() => onUpdateQuantity(item.cartId, item.quantity + 100)}>
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <button className="cart-remove-btn" onClick={() => onRemove(item.cartId)}>
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
                    <div className="cart-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
                        <button
                            className="cart-action-btn cart-print-btn"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                color: '#ffffff',
                                backgroundColor: '#059669',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                gap: '8px'
                            }}
                            onClick={handlePrint}
                            title="発注書を印刷またはPDFとして出力します"
                        >
                            <Printer size={18} />
                            <span>発注書作成</span>
                        </button>
                        <button
                            className="cart-action-btn cart-mail-btn"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                color: '#ffffff',
                                backgroundColor: '#0284c7',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                gap: '8px'
                            }}
                            onClick={handleOpenMailer}
                            title="スマホ・PCのメールアプリを起動して注文文章を入力します"
                        >
                            <Mail size={18} />
                            <span>メール起動</span>
                        </button>
                        <button
                            className={`cart-action-btn cart-copy-btn ${copied ? 'copied' : ''}`}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                color: '#ffffff',
                                backgroundColor: copied ? '#16a34a' : '#1e3a8a',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                gap: '8px'
                            }}
                            onClick={handleCopyEmail}
                            title="メール送信用の注文文章をクリップボードにコピーします"
                        >
                            <span>{copied ? '✓ コピーしました！' : '文章コピー'}</span>
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
