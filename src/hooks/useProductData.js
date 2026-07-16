import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { get, set } from 'idb-keyval';

// Required columns for validation
const REQUIRED_COLUMNS = ['受注№', '商品コード', '商品名'];

/**
 * Get a list of Excel files from the directory handle.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<Array<{name: string, handle: FileSystemFileHandle}>>}
 */
const getExcelFilesFromDir = async (dirHandle) => {
    const files = [];
    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls'))) {
                files.push({
                    name: entry.name,
                    handle: entry
                });
            }
        }
    } catch (err) {
        console.error('Error reading directory entries:', err);
    }
    return files;
};

export const useProductData = () => {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [lastModified, setLastModified] = useState(null);
    const [dirHandle, setDirHandle] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [customerDirHandle, setCustomerDirHandle] = useState(null);
    const [customerPermissionGranted, setCustomerPermissionGranted] = useState(false);
    const [customerFiles, setCustomerFiles] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load cached data on mount
    useEffect(() => {
        /**
         * Load initial cached data from IndexedDB
         * @returns {Promise<void>}
         */
        const loadCachedData = async () => {
            try {
                setIsLoading(true);
                const cachedData = await get('productData');
                const cachedFileName = await get('fileName');
                const cachedLastModified = await get('lastModified');
                const cachedDirHandle = await get('imageDirHandle');
                const cachedCustomerDirHandle = await get('customerDirHandle');

                if (cachedData) setData(cachedData);
                if (cachedFileName) setFileName(cachedFileName);
                if (cachedLastModified) setLastModified(cachedLastModified);
                
                if (cachedDirHandle) {
                    setDirHandle(cachedDirHandle);
                    // コメント: 保存済みフォルダの権限を確認し、既に許可されていれば接続済みにする
                    const options = { mode: 'read' };
                    const permission = await cachedDirHandle.queryPermission(options);
                    if (permission === 'granted') {
                        setPermissionGranted(true);
                    } else {
                        setPermissionGranted(false);
                    }
                }

                if (cachedCustomerDirHandle) {
                    setCustomerDirHandle(cachedCustomerDirHandle);
                    const options = { mode: 'read' };
                    const permission = await cachedCustomerDirHandle.queryPermission(options);
                    if (permission === 'granted') {
                        setCustomerPermissionGranted(true);
                        const files = await getExcelFilesFromDir(cachedCustomerDirHandle);
                        setCustomerFiles(files);
                    } else {
                        setCustomerPermissionGranted(false);
                    }
                }
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

    /**
     * Process the Excel file and update state/cache.
     * @param {File} file
     * @returns {Promise<void>}
     */
    const processExcelFile = async (file) => {
        setIsLoading(true);
        setError(null);
        setFileName(file.name);
        setLastModified(file.lastModified);

        // Initial check for 0 byte file (common with cloud placeholders)
        if (file.size === 0) {
            console.log('File size is 0. Attempting to wake up cloud file...');
        }

        const readWithRetry = async (attempt = 1) => {
            const MAX_RETRIES = 3;
            const RETRY_DELAY = 1500; // 1.5 seconds

            if (file.size === 0) {
                setError(`クラウドからデータを取得中... (${attempt}/${MAX_RETRIES})`);
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onerror = () => {
                    reject(new Error(`Read failed (Code: ${reader.error?.code})`));
                };

                reader.onload = (evt) => {
                    const buffer = evt.target.result;
                    if (buffer.byteLength === 0 && attempt <= MAX_RETRIES) {
                        console.warn(`Attempt ${attempt}: Read 0 bytes. Retrying...`);
                        setTimeout(() => readWithRetry(attempt + 1).then(resolve).catch(reject), RETRY_DELAY);
                    } else {
                        resolve(buffer);
                    }
                };

                reader.readAsArrayBuffer(file);
            });
        };

        try {
            if (file.size === 0) {
                setError('クラウドからデータを取得中... (これには数秒かかる場合があります)');
            }

            const buffer = await readWithRetry();

            if (buffer.byteLength === 0) {
                throw new Error('File is empty after retries');
            }

            console.log(`Buffer loaded: ${buffer.byteLength} bytes`);

            // Create worker for heavy processing
            const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
                const { type, data: parsedData, error: errorMsg, details } = e.data;

                if (type === 'success') {
                    try {
                        validateData(parsedData);
                        setData(parsedData);
                        set('productData', parsedData);
                        set('fileName', file.name);
                        set('lastModified', file.lastModified);
                        setError(null);
                    } catch (validationErr) {
                        setError(validationErr.message);
                        setData([]);
                    }
                } else {
                    console.error('Worker error:', errorMsg, details);

                    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                    let userMsg = `エラーが発生しました (File: ${sizeMB}MB)`;

                    if (errorMsg && errorMsg.includes('Bad compressed size')) {
                        userMsg = `ファイルが破損しているか、ダウンロードが完了していません。\n(Bad compressed size)\n\nスマホの場合は、iCloud/Google Driveから「このiPhone内」に保存してから再度お試しください。`;
                    } else if (errorMsg && errorMsg.includes('Password')) {
                        userMsg = 'パスワード保護されたファイルは読み込めません。';
                    } else {
                        userMsg = `ファイルの解析に失敗しました: ${errorMsg}`;
                    }
                    setError(userMsg);
                    setData([]);
                }

                setIsLoading(false);
                worker.terminate();
            };

            worker.onerror = (err) => {
                console.error('Worker infrastructure error:', err);
                setError('解析プロセスの起動に失敗しました。');
                setIsLoading(false);
                worker.terminate();
            };

            worker.postMessage({ data: buffer, fileName: file.name }, [buffer]);

        } catch (err) {
            console.error('File processing error:', err);
            if (file.size === 0) {
                setError('ファイルの取得に失敗しました。クラウドからダウンロードされていない可能性があります。\n一度「ファイル」アプリで開いてから再度お試しください。');
            } else {
                setError('ファイルの読み込みに失敗しました。');
            }
            setIsLoading(false);
        }
    };

    /**
     * Handle manual Excel file upload.
     * @param {React.ChangeEvent<HTMLInputElement>} e
     * @returns {void}
     */
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        processExcelFile(file);
    };

    /**
     * Handle image folder selection and connection.
     * @returns {Promise<void>}
     */
    const handleFolderSelect = async () => {
        try {
            // コメント: すでに保存されたハンドルがあり、かつパーミッション未付与の場合、再度パーミッションを要求する
            if (dirHandle) {
                const options = { mode: 'read' };
                const permission = await dirHandle.requestPermission(options);
                if (permission === 'granted') {
                    setPermissionGranted(true);
                    setError(null);
                    return;
                }
            }

            // コメント: ハンドルがない、またはパーミッション要求が拒否された場合は新しくフォルダ選択ピッカーを開く
            const handle = await window.showDirectoryPicker();
            setDirHandle(handle);
            setPermissionGranted(true);
            setError(null);
            // コメント: 選択したディレクトリハンドルをIndexedDBにキャッシュ保存する
            await set('imageDirHandle', handle);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting folder:', err);
                setError('フォルダの選択に失敗しました');
            }
        }
    };

    /**
     * Handle customer data folder selection and connection.
     * @returns {Promise<void>}
     */
    const handleCustomerFolderSelect = async () => {
        try {
            if (customerDirHandle) {
                const options = { mode: 'read' };
                const permission = await customerDirHandle.requestPermission(options);
                if (permission === 'granted') {
                    setCustomerPermissionGranted(true);
                    const files = await getExcelFilesFromDir(customerDirHandle);
                    setCustomerFiles(files);
                    setError(null);
                    return;
                }
            }

            const handle = await window.showDirectoryPicker();
            setCustomerDirHandle(handle);
            setCustomerPermissionGranted(true);
            const files = await getExcelFilesFromDir(handle);
            setCustomerFiles(files);
            setError(null);
            await set('customerDirHandle', handle);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting customer folder:', err);
                setError('顧客フォルダの選択に失敗しました');
            }
        }
    };

    /**
     * Load a specific customer file from the connected customer directory.
     * @param {string} name
     * @returns {Promise<void>}
     */
    const loadCustomerFile = async (name) => {
        if (!customerDirHandle) return;
        try {
            const fileHandle = await customerDirHandle.getFileHandle(name);
            const file = await fileHandle.getFile();
            await processExcelFile(file);
        } catch (err) {
            console.error('Error loading customer file:', err);
            setError(`顧客ファイル「${name}」の読み込みに失敗しました`);
        }
    };

    return {
        data,
        fileName,
        lastModified,
        dirHandle,
        permissionGranted,
        customerDirHandle,
        customerPermissionGranted,
        customerFiles,
        error,
        isLoading,
        handleFileUpload,
        handleFolderSelect,
        handleCustomerFolderSelect,
        loadCustomerFile,
        clearError: () => setError(null)
    };
};
