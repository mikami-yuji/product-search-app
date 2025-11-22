import React from 'react';
import './OrderSheet.css';

const OrderSheet = React.forwardRef(({ cart, totalAmount, date, fileName }, ref) => {
    const formatDate = (dateObj) => {
        const d = dateObj || new Date();
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };

    // ファイル名から拡張子を削除し、（株）を株式会社に置き換えて会社名として表示
    // fileNameが未定義の場合はデフォルト値を表示
    const companyName = fileName
        ? fileName.replace(/\.[^/.]+$/, "").replace(/[\(（]株[\)）]/g, "株式会社")
        : "株式会社サンプル商事";

    const getUnit = (item) => {
        const type = item['形状'] ? String(item['形状']).trim() : '';

        if (type === 'RA' || type === 'RZ') return 'm';
        if (type === '単袋') return '枚';

        return '個';
    };

    return (
        <div className="order-sheet-hidden">
            <div ref={ref} className="order-sheet-container">
                {/* Header */}
                <div className="order-sheet-header">
                    <div className="order-sheet-title">発注書</div>
                    <div className="order-sheet-date">発注日: {formatDate(date)}</div>
                </div>

                {/* Info Area */}
                <div className="order-sheet-info">
                    <div className="order-sheet-recipient">
                        <div className="recipient-name">株式会社アサヒパック　御中</div>
                        <div>下記商品を注文いたします。</div>
                    </div>
                    <div className="order-sheet-sender">
                        <div className="sender-company">{companyName}</div>
                    </div>
                </div>

                {/* Product Table */}
                <table className="order-sheet-table">
                    <thead>
                        <tr>
                            <th className="col-no">No.</th>
                            <th className="col-order-no">受注No</th>
                            <th className="col-code">商品コード</th>
                            <th className="col-name">品名</th>
                            <th className="col-qty">数量</th>
                            <th className="col-unit">単位</th>
                            <th className="col-price">単価</th>
                            <th className="col-amount">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, index) => (
                            <tr key={index}>
                                <td className="col-no">{index + 1}</td>
                                <td className="col-order-no">{item['受注№']}</td>
                                <td className="col-code">{item['商品コード']}</td>
                                <td className="col-name">{item['タイトル'] || item['品名']}</td>
                                <td className="col-qty">{item.quantity}</td>
                                <td className="col-unit">{getUnit(item)}</td>
                                <td className="col-price">
                                    {item['単価'] ? `¥${parseFloat(item['単価']).toLocaleString()}` : '-'}
                                </td>
                                <td className="col-amount">
                                    {item['単価']
                                        ? `¥${(parseFloat(item['単価']) * item.quantity).toLocaleString()}`
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                        {/* Empty rows to fill space if needed */}
                        {Array.from({ length: Math.max(0, 10 - cart.length) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="col-no"></td>
                                <td className="col-order-no"></td>
                                <td className="col-code"></td>
                                <td className="col-name"></td>
                                <td className="col-qty"></td>
                                <td className="col-unit"></td>
                                <td className="col-price"></td>
                                <td className="col-amount"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary */}
                <div className="order-sheet-summary">
                    <table className="summary-table">
                        <tbody>
                            <tr>
                                <th>合計金額</th>
                                <td>¥{totalAmount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="order-sheet-footer">
                    <div className="remarks-box">
                        <div className="remarks-title">備考</div>
                        <div>
                            希望納期: <br />
                            納品場所:
                        </div>
                    </div>
                    <div className="seal-box">
                        <div className="seal-item"><div className="seal-title">承認</div></div>
                        <div className="seal-item"><div className="seal-title">審査</div></div>
                        <div className="seal-item"><div className="seal-title">担当</div></div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default OrderSheet;
