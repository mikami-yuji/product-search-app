import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, FileX, RotateCcw } from './icons';
import { getCacheStats, clearImageCache } from './utils/imageCache';
import { del } from 'idb-keyval';

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

    const handleClearImages = async () => {
        if (!confirm('すべての画像キャッシュを削除しますか？\n（画像は再度読み込まれます）')) return;

        setIsClearing(true);
        try {
            await clearImageCache();
            await loadStats();
            alert('画像キャッシュをクリアしました');
        } catch {
            alert('キャッシュのクリアに失敗しました');
        } finally {
            setIsClearing(false);
        }
    };

    const handleClearData = async () => {
        if (!confirm('保存されたExcelデータを削除しますか？\n（次回アプリ起動時に再度ファイル読み込みが必要になります）')) return;

        setIsClearing(true);
        try {
            await del('productData');
            await del('fileName');
            await del('lastModified');
            // コメント: 追加した顧客フォルダ・ファイルキャッシュも削除
            await del('customerDirHandle');
            await del('customerFilesCache');
            await del('customerFilesListCache');
            alert('商品データおよび顧客接続キャッシュを削除しました。\n反映するにはページを再読み込みしてください。');
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('データの削除に失敗しました');
            setIsClearing(false);
        }
    };

    const handleForceUpdateApp = async () => {
        if (!confirm('アプリの全キャッシュ（Service Worker・全画像・データ）をクリアして最新版に更新しますか？')) return;

        setIsClearing(true);
        try {
            // Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            // Clear Cache Storage
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            // Clear IndexedDB / Image cache
            await clearImageCache();
            await del('productData');
            await del('fileName');
            await del('lastModified');
            await del('customerDirHandle');
            await del('customerFilesCache');
            await del('customerFilesListCache');

            alert('すべてのキャッシュを削除しました。最新版に再読み込みします。');
            window.location.reload();
        } catch (err) {
            console.error('Failed to force update app:', err);
            alert('更新処理中にエラーが発生しました');
            setIsClearing(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="cache-manager-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cache-manager-header">
                    <h2>
                        <Database size={24} />
                        キャッシュ管理
                    </h2>
                    <button onClick={onClose} className="modal-close-btn">×</button>
                </div>

                <div className="cache-manager-content">
                    <div className="cache-stats">
                        <div className="cache-stat-item">
                            <span className="cache-stat-label">画像キャッシュ:</span>
                            <span className="cache-stat-value">{stats.count} 枚 ({stats.totalSizeMB} MB)</span>
                        </div>
                    </div>

                    <div className="cache-actions-group">
                        <h3>アプリ更新</h3>
                        <div className="cache-actions">
                            <button
                                onClick={handleForceUpdateApp}
                                className="cache-btn cache-btn-primary"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-surface)' }}
                                disabled={isClearing}
                            >
                                <RotateCcw size={18} />
                                最新版に強制更新（全キャッシュ削除）
                            </button>
                            <p className="cache-desc">
                                古いバージョンのキャッシュが残っている場合に、Service Workerと全キャッシュを破棄して最新版に強制アップデートします。
                            </p>
                        </div>

                        <h3>データ管理</h3>
                        <div className="cache-actions">
                            <button
                                onClick={handleClearData}
                                className="cache-btn cache-btn-warning"
                                disabled={isClearing}
                            >
                                <FileX size={18} />
                                商品データを削除
                            </button>
                            <p className="cache-desc">
                                読み込んだExcelデータを削除します。<br />
                                表示がおかしい時などに試してください。
                            </p>
                        </div>

                        <h3>画像管理</h3>
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
                                onClick={handleClearImages}
                                className="cache-btn cache-btn-danger"
                                disabled={isClearing || stats.count === 0}
                            >
                                <Trash2 size={18} />
                                画像を全削除
                            </button>
                        </div>
                    </div>

                    <div className="cache-info">
                        <p>💡 データは自動的に保存され、次回起動時に高速表示されます</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CacheManager;
