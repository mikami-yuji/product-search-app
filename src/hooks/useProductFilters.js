import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';

/**
 * 商品データの検索とフィルタリングを行うカスタムフック。
 * 
 * @param {import('../types/product').Product[]} data - 検索対象となる商品データの配列
 * @returns {{
 *   keyword: string,
 *   setKeyword: (kw: string) => void,
 *   searchScope: import('../types/product').SearchScope,
 *   setSearchScope: (scope: import('../types/product').SearchScope) => void,
 *   suggestions: string[],
 *   sortBy: string,
 *   setSortBy: (sort: string) => void,
 *   currentPage: number,
 *   setCurrentPage: (page: number | ((prev: number) => number)) => void,
 *   filters: import('../types/product').FiltersState,
 *   uniqueValues: import('../types/product').UniqueValues,
 *   facetCounts: import('../types/product').FacetCounts,
 *   filteredData: import('../types/product').Product[],
 *   handleFilterChange: (key: string, value: string) => void,
 *   clearFilterKey: (key: string) => void,
 *   clearFilters: () => void
 * }} フィルタリング関連の状態と制御用関数オブジェクト
 */
export const useProductFilters = (data) => {
    const [keyword, setKeyword] = useState('');
    const [searchScope, setSearchScope] = useState('all');
    const [sortBy, setSortBy] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // フィルターの選択状態。複数選択をサポートするため配列で保持する
    const [filters, setFilters] = useState({
        '種別': [],
        '重量': [],
        '材質名称': [],
        '総色数': [],
        '直送先名称': []
    });

    // 各フィルターキーに対応するユニークな選択肢のリスト
    const uniqueValues = useMemo(() => {
        /**
         * 特定のキーに対するユニークな値の配列を取得しソートする。
         * 
         * @param {string} key - 商品オブジェクトのプロパティ名
         * @param {((a: any, b: any) => number)} [sortFn] - ソート用関数
         * @returns {string[]} ユニークな値のソート済み配列
         */
        const getUnique = (key, sortFn) => {
            const values = [...new Set(data.map(item => item[key]).filter(Boolean))];
            return sortFn ? values.sort(sortFn) : values.sort();
        };

        /**
         * 数値的な順序でソートするための比較関数。
         * 
         * @param {any} a - 比較対象A
         * @param {any} b - 比較対象B
         * @returns {number} 比較結果の数値
         */
        const numericSort = (a, b) => {
            const numA = parseFloat(a) || 0;
            const numB = parseFloat(b) || 0;
            return numA - numB;
        };

        return {
            '種別': getUnique('種別'),
            '重量': getUnique('重量', numericSort),
            '材質名称': getUnique('材質名称'),
            '総色数': getUnique('総色数'),
            '直送先名称': getUnique('直送先名称')
        };
    }, [data]);

    // 入力キーワードに対するサジェスト（オートコンプリート）候補の計算
    const suggestions = useMemo(() => {
        if (!keyword || keyword.trim().length < 1) return [];

        const normalizedKeyword = keyword.toLowerCase().trim();
        const matches = new Set();

        // 候補の検索対象
        for (const item of data) {
            const title = item['タイトル'] || item['商品名'] || '';
            const code = item['商品コード'] || '';
            const orderNo = item['受注№'] || '';
            const material = item['材質名称'] || '';

            // スコープが 'title' または 'all' の場合、タイトルをチェック
            if (searchScope !== 'code') {
                if (title.toLowerCase().includes(normalizedKeyword)) {
                    matches.add(title);
                }
            }
            // スコープが 'code' または 'all' の場合、コード・受注Noをチェック
            if (searchScope !== 'title') {
                if (code.toLowerCase().includes(normalizedKeyword)) {
                    matches.add(code);
                }
                if (orderNo.toLowerCase().includes(normalizedKeyword)) {
                    matches.add(orderNo);
                }
            }
            // スコープが 'all' の場合、材質をチェック
            if (searchScope === 'all') {
                if (material.toLowerCase().includes(normalizedKeyword)) {
                    matches.add(material);
                }
            }

            if (matches.size >= 8) break; // 最大8件
        }

        return Array.from(matches);
    }, [data, keyword, searchScope]);

    // 各フィルターカテゴリ内の各値について、他のフィルターが適用された状態での該当件数（ファセットカウント）を算出
    const facetCounts = useMemo(() => {
        const counts = {};
        const filterKeys = Object.keys(filters);
        
        filterKeys.forEach(activeKey => {
            counts[activeKey] = {};
            
            // activeKey以外のフィルター条件と、キーワード検索を適用した中間結果を得る
            let tempResult = data;

            // 1. キーワード検索の適用
            if (keyword) {
                const keys = searchScope === 'all'
                    ? ['タイトル', '商品名', '受注№', '商品コード', '材質名称', '直送先名称', '形状', 'JANコード']
                    : searchScope === 'title'
                    ? ['タイトル', '商品名']
                    : ['受注№', '商品コード', 'JANコード'];

                const fuse = new Fuse(data, {
                    keys: keys,
                    threshold: 0.3,
                    ignoreLocation: true,
                    useExtendedSearch: true
                });
                tempResult = fuse.search(keyword).map(res => res.item);
            }

            // 2. 他のフィルターの適用
            tempResult = tempResult.filter(item => {
                return filterKeys.every(k => {
                    if (k === activeKey) return true; // このフィルターは無視
                    const selectedValues = filters[k];
                    if (!selectedValues || selectedValues.length === 0) return true;
                    return selectedValues.includes(String(item[k]));
                });
            });

            // 3. activeKeyのユニークな各値について、件数をカウント
            const uniqueVals = uniqueValues[activeKey] || [];
            uniqueVals.forEach(val => {
                counts[activeKey][val] = tempResult.filter(item => String(item[activeKey]) === String(val)).length;
            });
        });

        return counts;
    }, [data, filters, keyword, searchScope, uniqueValues]);

    // キーワード、フィルター、ソート条件をすべて適用した最終結果
    const filteredData = useMemo(() => {
        let result = data;

        // 1. キーワード検索の適用 (Fuzzy)
        if (keyword) {
            const keys = searchScope === 'all'
                ? ['タイトル', '商品名', '受注№', '商品コード', '材質名称', '直送先名称', '形状', 'JANコード']
                : searchScope === 'title'
                ? ['タイトル', '商品名']
                : ['受注№', '商品コード', 'JANコード'];

            const fuse = new Fuse(data, {
                keys: keys,
                threshold: 0.3,
                ignoreLocation: true,
                useExtendedSearch: true
            });
            const searchResults = fuse.search(keyword);
            result = searchResults.map(res => res.item);
        }

        // 2. 複数選択フィルターの適用
        result = result.filter(item => {
            return Object.keys(filters).every(key => {
                const selectedValues = filters[key];
                if (!selectedValues || selectedValues.length === 0) return true;
                return selectedValues.includes(String(item[key]));
            });
        });

        // 3. 並び替えの適用
        if (sortBy === 'price-asc') {
            result = [...result].sort((a, b) => (parseFloat(a['単価']) || 0) - (parseFloat(b['単価']) || 0));
        } else if (sortBy === 'price-desc') {
            result = [...result].sort((a, b) => (parseFloat(b['単価']) || 0) - (parseFloat(a['単価']) || 0));
        } else if (sortBy === 'date-desc') {
            result = [...result].sort((a, b) => {
                const dateA = new Date(a['最新受注日'] || 0);
                const dateB = new Date(b['最新受注日'] || 0);
                return dateB - dateA;
            });
        }

        return result;
    }, [data, filters, keyword, sortBy, searchScope]);

    // フィルター、キーワード、ソート条件の変更時にページ番号を1にリセットする
    useEffect(() => {
        const animFrame = requestAnimationFrame(() => {
            setCurrentPage(1);
        });
        return () => cancelAnimationFrame(animFrame);
    }, [filters, keyword, sortBy, searchScope]);

    /**
     * フィルター値のチェック状態を切り替える（トグル処理）。
     * 
     * @param {string} key - フィルターカテゴリのキー（例: '材質名称'）
     * @param {string} value - 選択・選択解除する値
     * @returns {void}
     */
    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const currentSelected = prev[key] || [];
            const isSelected = currentSelected.includes(value);
            const newSelected = isSelected
                ? currentSelected.filter(val => val !== value)
                : [...currentSelected, value];
            return {
                ...prev,
                [key]: newSelected
            };
        });
    };

    /**
     * 指定したフィルターキーのすべての選択状態をクリアする。
     * 
     * @param {string} key - クリア対象のフィルターキー
     * @returns {void}
     */
    const clearFilterKey = (key) => {
        setFilters(prev => ({
            ...prev,
            [key]: []
        }));
    };

    /**
     * すべてのフィルターと検索キーワードをリセットする。
     * 
     * @returns {void}
     */
    const clearFilters = () => {
        setFilters({
            '種別': [],
            '重量': [],
            '材質名称': [],
            '総色数': [],
            '直送先名称': []
        });
        setKeyword('');
        setSearchScope('all');
    };

    return {
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
        clearFilters
    };
};
