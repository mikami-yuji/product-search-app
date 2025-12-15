import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { get, set } from 'idb-keyval';

// Required columns for validation
const REQUIRED_COLUMNS = ['受注№', '商品コード', '商品名'];

export const useProductData = () => {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [lastModified, setLastModified] = useState(null);
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
                const cachedLastModified = await get('lastModified');

                if (cachedData) setData(cachedData);
                if (cachedFileName) setFileName(cachedFileName);
                if (cachedLastModified) setLastModified(cachedLastModified);
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
        setLastModified(file.lastModified);

        // Check for empty file
        if (file.size === 0) {
            setError('ファイルのサイズが0です。正しいファイルを選択してください。');
            setIsLoading(false);
            return;
        }



        const reader = new FileReader();

        reader.onerror = () => {
            setError('ファイルの読み込みに失敗しました');
            setIsLoading(false);
        };

        reader.onload = (evt) => {
            // Create worker for heavy processing
            const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
                const { type, data, error: errorMsg } = e.data;

                if (type === 'success') {
                    try {
                        // Validate data structure in main thread
                        validateData(data);

                        setData(data);
                        set('productData', data);
                        set('fileName', file.name);
                        set('lastModified', file.lastModified);
                        setError(null);
                    } catch (validationErr) {
                        setError(validationErr.message);
                        setData([]);
                    }
                } else {
                    console.error('Worker error:', e.data);
                    if (errorMsg && errorMsg.includes('Bad compressed size')) {
                        setError('ファイルが破損しているか、読み込めない形式です。別のファイルをお試しください。');
                    } else if (errorMsg && errorMsg.includes('Password')) {
                        setError('パスワード保護されたファイルは読み込めません。');
                    } else {
                        setError('ファイルの解析に失敗しました: ' + errorMsg);
                    }
                    setData([]);
                }

                // Cleanup
                setIsLoading(false);
                worker.terminate();
            };

            worker.onerror = (err) => {
                console.error('Worker infrastructure error:', err);
                setError('解析プロセスの起動に失敗しました。');
                setIsLoading(false);
                worker.terminate();
            };

            // Send data to worker (transferable object for performance)
            const buffer = evt.target.result;
            worker.postMessage({ data: buffer, fileName: file.name }, [buffer]);
        };

        reader.readAsArrayBuffer(file);
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
        lastModified,
        dirHandle,
        permissionGranted,
        error,
        isLoading,
        handleFileUpload,
        handleFolderSelect,
        clearError: () => setError(null)
    };
};
