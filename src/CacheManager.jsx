import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { getCacheStats, clearImageCache } from './utils/imageCache';

const CacheManager = ({ onClose }) => {
    const [stats, setStats] = useState({ count: 0, totalSizeMB: '0.00' });
    const [isClearing, setIsClearing] = useState(false);

    const loadStats = async () => {
        const cacheStats = await getCacheStats();
        setStats(cacheStats);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleClearCache = async () => {
        if (!confirm('すべての画像キャッシュを削除しますか？')) return;

        setIsClearing(true);
        try {
            await clearImageCache();
            await loadStats();
            alert('キャッシュをクリアしました');
        } catch (err) {
            alert('キャッシュのクリアに失敗しました');
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="cache-manager-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cache-manager-header">
                    <h2>
                        <Database size={24} />
                        画像キャッシュ管理
                    </h2>
                    <button onClick={onClose} className="modal-close-btn">×</button>
                </div>

                <div className="cache-manager-content">
                    <div className="cache-stats">
                        <div className="cache-stat-item">
                            <span className="cache-stat-label">キャッシュ数:</span>
                            <span className="cache-stat-value">{stats.count} 枚</span>
                        </div>
                        <div className="cache-stat-item">
                            <span className="cache-stat-label">合計サイズ:</span>
                            <span className="cache-stat-value">{stats.totalSizeMB} MB</span>
                        </div>
                    </div>

                    <div className="cache-actions">
                        <button
                            onClick={loadStats}
                            className="cache-btn cache-btn-secondary"
                            disabled={isClearing}
                        >
                            <RefreshCw size={18} />
                            更新
                        </button>
                        <button
                            onClick={handleClearCache}
                            className="cache-btn cache-btn-danger"
                            disabled={isClearing || stats.count === 0}
                        >
                            <Trash2 size={18} />
                            {isClearing ? 'クリア中...' : 'すべてクリア'}
                        </button>
                    </div>

                    <div className="cache-info">
                        <p>💡 画像は自動的にキャッシュされ、オフラインでも表示できます</p>
                        <p>📦 最大100枚まで保存され、7日間有効です</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CacheManager;
