import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';

export const useProductFilters = (data) => {
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        '種別': [],
        '重量': [],
        '材質名称': [],
        '総色数': [],
        '直送先名称': []
    });

    // Get unique values for each filter
    const uniqueValues = useMemo(() => {
        const getUnique = (key, sortFn) => {
            const values = [...new Set(data.map(item => item[key]).filter(Boolean))];
            return sortFn ? values.sort(sortFn) : values.sort();
        };

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

    // Apply filters and search
    const filteredData = useMemo(() => {
        let result = data;

        // Keyword Search (Fuzzy)
        if (keyword) {
            const fuse = new Fuse(data, {
                keys: ['タイトル', '商品名', '受注№', '商品コード', '材質名称', '直送先名称', '形状', 'JANコード'],
                threshold: 0.3,
                ignoreLocation: true,
                useExtendedSearch: true
            });
            const searchResults = fuse.search(keyword);
            result = searchResults.map(res => res.item);
        }

        // Filter Match
        result = result.filter(item => {
            return Object.keys(filters).every(key => {
                if (filters[key].length === 0) return true;
                return filters[key].includes(String(item[key]));
            });
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

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, keyword, sortBy]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value ? [value] : []
        }));
    };

    const clearFilters = () => {
        setFilters({
            '種別': [],
            '重量': [],
            '材質名称': [],
            '総色数': [],
            '直送先名称': []
        });
        setKeyword('');
    };

    return {
        keyword,
        setKeyword,
        sortBy,
        setSortBy,
        currentPage,
        setCurrentPage,
        filters,
        uniqueValues,
        filteredData,
        handleFilterChange,
        clearFilters
    };
};
