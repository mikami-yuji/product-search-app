import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProductFilters } from './useProductFilters';

// テスト用のダミー商品データ
const mockProducts = [
    { '受注№': 'ORD-AAA', '商品コード': 'CODE-111-AAA', 'タイトル': 'PETボトル 青 500ml', '商品名': 'PETボトル 青 500ml', '種別': '既製品', '重量': '50', '材質名称': 'PET', '総色数': '1', '直送先名称': '東京第一倉庫', '単価': '120', '最新受注日': '2026-01-10' },
    { '受注№': 'ORD-BBB', '商品コード': 'CODE-222-BBB', 'タイトル': 'PETボトル 赤 500ml', '商品名': 'PETボトル 赤 500ml', '種別': '既製品', '重量': '50', '材質名称': 'PET', '総色数': '2', '直送先名称': '大阪第二倉庫', '単価': '130', '最新受注日': '2026-02-15' },
    { '受注№': 'ORD-CCC', '商品コード': 'CODE-333-CCC', 'タイトル': '紙コップ ホワイト 200ml', '商品名': '紙コップ ホワイト 200ml', '種別': '別注品', '重量': '10', '材質名称': '紙', '総色数': '1', '直送先名称': '東京第一倉庫', '単価': '50', '最新受注日': '2026-03-01' },
    { '受注№': 'ORD-DDD', '商品コード': 'CODE-444-DDD', 'タイトル': '紙コップ クラフト 200ml', '商品名': '紙コップ クラフト 200ml', '種別': '別注品', '重量': '12', '材質名称': '紙', '総色数': '4', '直送先名称': '名古屋倉庫', '単価': '60', '最新受注日': '2026-03-05' }
];

describe('useProductFilters', () => {
    /**
     * @returns {void}
     */
    it('初期状態が正しくセットアップされること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        expect(result.current.keyword).toBe('');
        expect(result.current.searchScope).toBe('all');
        expect(result.current.sortBy).toBe('');
        expect(result.current.currentPage).toBe(1);
        expect(result.current.suggestions).toEqual([]);
        expect(result.current.filteredData).toHaveLength(4);
        expect(result.current.filters).toEqual({
            '種別': [],
            '重量': [],
            '材質名称': [],
            '総色数': [],
            '直送先名称': []
        });
    });

    /**
     * @returns {void}
     */
    it('キーワード検索（Fuzzy検索）が正しく動作すること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        act(() => {
            result.current.setKeyword('PETボトル');
        });

        // 「PETボトル」が含まれる2つの商品がヒットするはず
        expect(result.current.filteredData).toHaveLength(2);
        expect(result.current.filteredData[0]['受注№']).toBe('ORD-AAA');
        expect(result.current.filteredData[1]['受注№']).toBe('ORD-BBB');
    });

    /**
     * @returns {void}
     */
    it('検索スコープ（対象指定）の切り替えが機能すること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        // タイトルのみのスコープでコードを検索するとヒットしないはず
        act(() => {
            result.current.setSearchScope('title');
            result.current.setKeyword('CODE-111-AAA');
        });
        expect(result.current.filteredData).toHaveLength(0);

        // スコープを 'code' または 'all' に変えるとヒットするはず
        act(() => {
            result.current.setSearchScope('code');
        });
        expect(result.current.filteredData).toHaveLength(1);
        expect(result.current.filteredData[0]['受注№']).toBe('ORD-AAA');
    });

    /**
     * @returns {void}
     */
    it('オートコンプリート用のサジェスト候補が正しく抽出されること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        act(() => {
            result.current.setKeyword('PET');
        });

        expect(result.current.suggestions.length).toBeGreaterThan(0);
        // マッチした値（タイトルなど）が候補に含まれていること
        expect(result.current.suggestions).toContain('PETボトル 青 500ml');
        expect(result.current.suggestions).toContain('PETボトル 赤 500ml');
    });

    /**
     * @returns {void}
     */
    it('フィルターの複数選択（チェックボックス式トグル）が正しく動作すること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        // 材質名称: 'PET' を選択
        act(() => {
            result.current.handleFilterChange('材質名称', 'PET');
        });
        expect(result.current.filteredData).toHaveLength(2);
        expect(result.current.filters['材質名称']).toEqual(['PET']);

        // さらに 材質名称: '紙' を追加選択（同じカテゴリは OR 検索）
        act(() => {
            result.current.handleFilterChange('材質名称', '紙');
        });
        expect(result.current.filteredData).toHaveLength(4);
        expect(result.current.filters['材質名称']).toEqual(['PET', '紙']);

        // 種別: '別注品' を選択（異なるカテゴリ間は AND 検索）
        act(() => {
            result.current.handleFilterChange('種別', '別注品');
        });
        expect(result.current.filteredData).toHaveLength(2); // '紙' のかつ '別注品' である2件
        expect(result.current.filteredData[0]['受注№']).toBe('ORD-CCC');
    });

    /**
     * @returns {void}
     */
    it('ファセットカウント（該当件数）がリアルタイムに正しく計算されること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        // 初期状態での件数
        expect(result.current.facetCounts['材質名称']['PET']).toBe(2);
        expect(result.current.facetCounts['材質名称']['紙']).toBe(2);

        // 種別: '別注品' にフィルターをかけた状態
        act(() => {
            result.current.handleFilterChange('種別', '別注品');
        });

        // 異なるカテゴリ（材質名称）のファセットカウントは、種別=別注品で絞り込んだ結果になるはず
        expect(result.current.facetCounts['材質名称']['PET']).toBe(0); // 別注品にPETはない
        expect(result.current.facetCounts['材質名称']['紙']).toBe(2);   // 別注品の紙は2つ

        // 同じカテゴリである「種別」のカウントは、自らの条件を除外して計算されるため、初期値が維持されるはず
        expect(result.current.facetCounts['種別']['既製品']).toBe(2);
        expect(result.current.facetCounts['種別']['別注品']).toBe(2);
    });

    /**
     * @returns {void}
     */
    it('並び替え（ソート）機能が正しく動作すること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        // 価格の安い順にソート
        act(() => {
            result.current.setSortBy('price-asc');
        });
        expect(result.current.filteredData[0]['受注№']).toBe('ORD-CCC'); // ¥50
        expect(result.current.filteredData[3]['受注№']).toBe('ORD-BBB'); // ¥130

        // 最新受注日順にソート
        act(() => {
            result.current.setSortBy('date-desc');
        });
        expect(result.current.filteredData[0]['受注№']).toBe('ORD-DDD'); // 2026-03-05
        expect(result.current.filteredData[3]['受注№']).toBe('ORD-AAA'); // 2026-01-10
    });

    /**
     * @returns {void}
     */
    it('フィルターのクリア機能が正しく動作すること', () => {
        const { result } = renderHook(() => useProductFilters(mockProducts));

        act(() => {
            result.current.handleFilterChange('材質名称', 'PET');
            result.current.setKeyword('青');
        });
        expect(result.current.filteredData).toHaveLength(1);

        // 特定のフィルターカテゴリをクリア
        act(() => {
            result.current.clearFilterKey('材質名称');
        });
        expect(result.current.filters['材質名称']).toEqual([]);
        // キーワード検索は残っているはず
        expect(result.current.keyword).toBe('青');

        // すべてクリア
        act(() => {
            result.current.clearFilters();
        });
        expect(result.current.keyword).toBe('');
        expect(result.current.filteredData).toHaveLength(4);
    });

    /**
     * @returns {Promise<void>}
     */
    it('データ（顧客）が変更されたときにページ番号が1にリセットされること', async () => {
        const { result, rerender } = renderHook(({ products }) => useProductFilters(products), {
            initialProps: { products: mockProducts }
        });

        // ページを 2 に設定
        act(() => {
            result.current.setCurrentPage(2);
        });
        expect(result.current.currentPage).toBe(2);

        // 新しいデータ（顧客データの変更）を渡して再描画
        const newProducts = [
            { '受注№': 'ORD-NEW', '商品コード': 'CODE-NEW', 'タイトル': '新規商品', '種別': '既製品' }
        ];
        act(() => {
            rerender({ products: newProducts });
        });

        // ページが1にリセットされていること
        await waitFor(() => {
            expect(result.current.currentPage).toBe(1);
        });
    });
});
