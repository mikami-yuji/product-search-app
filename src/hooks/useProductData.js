import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { get, set } from 'idb-keyval';

// Required columns for validation
const REQUIRED_COLUMNS = ['受注№', '商品コード', '商品名'];

export const useProductData = () => {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [dirHandle, setDirHandle] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load cached data on mount
    useEffect(() => {
        const loadCachedData = async () => {
            try {
                setIsLoading(true);
                const cachedData = await get('productData');
                const cachedFileName = await get('fileName');
                if (cachedData) setData(cachedData);
                if (cachedFileName) setFileName(cachedFileName);
            } catch (err) {
                console.error('Error loading cache:', err);
                setError('キャッシュの読み込みに失敗しました');
            } finally {
                setIsLoading(false);
            }
        };
        loadCachedData();
    }, []);

    const validateData = (jsonData) => {
        if (!jsonData || jsonData.length === 0) {
            throw new Error('データが空です');
        }

        const firstRow = jsonData[0];
        const missingColumns = REQUIRED_COLUMNS.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
            throw new Error(`必須列が見つかりません: ${missingColumns.join(', ')}`);
        }

        return true;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setFileName(file.name);

        const reader = new FileReader();

        reader.onerror = () => {
            setError('ファイルの読み込みに失敗しました');
            setIsLoading(false);
        };

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('シートが見つかりません');
                }

                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws);

                // Validate data structure
                validateData(jsonData);

                setData(jsonData);
                set('productData', jsonData);
                set('fileName', file.name);
                setError(null);
            } catch (err) {
                console.error('Error parsing file:', err);
                setError(err.message || 'ファイルの解析に失敗しました');
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleFolderSelect = async () => {
        try {
            const handle = await window.showDirectoryPicker();
            setDirHandle(handle);
            setPermissionGranted(true);
            setError(null);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting folder:', err);
                setError('フォルダの選択に失敗しました');
            }
        }
    };

    return {
        data,
        fileName,
        dirHandle,
        permissionGranted,
        error,
        isLoading,
        handleFileUpload,
        handleFolderSelect,
        clearError: () => setError(null)
    };
};
