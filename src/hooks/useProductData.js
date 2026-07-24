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

export const isFileSystemSupported = typeof window !== 'undefined' && !!window.showDirectoryPicker;

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
                const cachedCustomerDirHandle = isFileSystemSupported ? await get('customerDirHandle') : null;

                if (cachedData) setData(cachedData);
                if (cachedFileName) setFileName(cachedFileName);
                if (cachedLastModified) setLastModified(cachedLastModified);
                
                if (cachedDirHandle && isFileSystemSupported) {
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

                if (cachedCustomerDirHandle && isFileSystemSupported) {
                    setCustomerDirHandle(cachedCustomerDirHandle);
                    const options = { mode: 'read' };
                    const permission = await cachedCustomerDirHandle.queryPermission(options);
                    if (permission === 'granted') {
                        setCustomerPermissionGranted(true);
                        const files = await getExcelFilesFromDir(cachedCustomerDirHandle);
                        files.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' }));
                        setCustomerFiles(files);
                    } else {
                        // コメント: パーミッションが一時的に切れていても、以前取得したファイル名一覧のキャッシュがあれば表示を維持する
                        const cachedCustomerFilesList = await get('customerFilesListCache');
                        if (cachedCustomerFilesList && cachedCustomerFilesList.length > 0) {
                            setCustomerFiles(cachedCustomerFilesList);
                            setCustomerPermissionGranted(true);
                        } else {
                            setCustomerPermissionGranted(false);
                        }
                    }
                } else if (!isFileSystemSupported) {
                    // コメント: モバイル環境などの場合は、IndexedDBに保存されたファイル名およびFileオブジェクトのリストを復元する
                    const cachedCustomerFiles = await get('customerFilesCache');
                    if (cachedCustomerFiles && cachedCustomerFiles.length > 0) {
                        setCustomerFiles(cachedCustomerFiles);
                        setCustomerPermissionGranted(true);
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

            // Workerを使わずメインスレッドで直接パースを行う (UIフリーズ防止のため非同期マクロタスク内で実行)
            const parseExcelDirectly = () => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        try {
                            const DO_NOT_PROCESS = { cellStyles: false, cellFormula: false, cellHTML: false, cellNF: false, cellText: false };
                            const workbook = XLSX.read(buffer, { type: 'array', dense: true, ...DO_NOT_PROCESS });

                            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                                throw new Error('シートが見つかりません');
                            }

                            const wsname = workbook.SheetNames[0];
                            const ws = workbook.Sheets[wsname];
                            const jsonData = XLSX.utils.sheet_to_json(ws);
                            
                            resolve(jsonData);
                        } catch (err) {
                            reject(err);
                        }
                    }, 0);
                });
            };

            try {
                const parsedData = await parseExcelDirectly();
                validateData(parsedData);
                setData(parsedData);
                set('productData', parsedData);
                set('fileName', file.name);
                set('lastModified', file.lastModified);
                setError(null);
            } catch (err) {
                console.error('Parsing failed:', err);
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                let userMsg = `エラーが発生しました (File: ${sizeMB}MB)`;

                if (err.message && err.message.includes('Bad compressed size')) {
                    userMsg = `ファイルが破損しているか、ダウンロードが完了していません。\n(Bad compressed size)\n\nスマホの場合は、iCloud/Google Driveから「このiPhone内」に保存してから再度お試しください。`;
                } else if (err.message && err.message.includes('Password')) {
                    userMsg = 'パスワード保護されたファイルは読み込めません。';
                } else {
                    userMsg = `ファイルの解析に失敗しました: ${err.message}`;
                }
                setError(userMsg);
                setData([]);
            } finally {
                setIsLoading(false);
            }

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

    /** @type {[Map<string, File>, React.Dispatch<React.SetStateAction<Map<string, File>>>]} */
    const [imageFilesMap, setImageFilesMap] = useState(new Map());

    /**
     * スマホ等のファイルインプット選択時に画像ファイル群をメモリマップ化（無駄なディスク待機をゼロ化し一瞬で表示）
     * @param {React.ChangeEvent<HTMLInputElement>} e
     */
    const handleImageFilesSelect = (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const newMap = new Map(imageFilesMap);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const name = file.name;
            const dotIdx = name.lastIndexOf('.');
            const rawName = dotIdx > 0 ? name.substring(0, dotIdx).trim() : name.trim();
            const lowerRawName = rawName.toLowerCase();
            const lowerFileName = name.toLowerCase();

            newMap.set(lowerRawName, file);
            newMap.set(lowerFileName, file);

            const cleaned = lowerRawName
                .replace(/,/g, '')
                .replace(/\.0+$/, '')
                .replace(/[ａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
            if (cleaned !== lowerRawName) {
                newMap.set(cleaned, file);
            }
            const unpadded = cleaned.replace(/^0+/, '');
            if (unpadded && unpadded !== cleaned) {
                newMap.set(unpadded, file);
            }

            const relPath = file.webkitRelativePath;
            if (relPath) {
                const parts = relPath.split('/');
                if (parts.length > 1) {
                    const folderSegment = parts[parts.length - 2].trim().toLowerCase();
                    if (folderSegment) {
                        newMap.set(`${folderSegment}/${lowerRawName}`, file);
                        if (cleaned !== lowerRawName) {
                            newMap.set(`${folderSegment}/${cleaned}`, file);
                        }
                        const codeMatch = folderSegment.match(/^([0-9a-z]+)/i);
                        if (codeMatch) {
                            const code = codeMatch[1].toLowerCase();
                            newMap.set(`${code}/${lowerRawName}`, file);
                            if (cleaned !== lowerRawName) {
                                newMap.set(`${code}/${cleaned}`, file);
                            }
                        }
                    }
                }
            }
        }

        setImageFilesMap(newMap);
        setPermissionGranted(true);
        setError(null);
    };

    /**
     * Handle image folder selection and connection.
     * @returns {Promise<void>}
     */
    const handleFolderSelect = async () => {
        try {
            if (isFileSystemSupported) {
                if (dirHandle) {
                    const options = { mode: 'read' };
                    const permission = await dirHandle.requestPermission(options);
                    if (permission === 'granted') {
                        setPermissionGranted(true);
                        setError(null);
                        return;
                    }
                }

                const handle = await window.showDirectoryPicker();
                setDirHandle(handle);
                setPermissionGranted(true);
                setError(null);
                await set('imageDirHandle', handle);
                return;
            }

            document.getElementById('image-files-input')?.click();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting folder, falling back:', err);
                document.getElementById('image-files-input')?.click();
            }
        }
    };

    /**
     * Handle customer data folder selection and connection.
     * @returns {Promise<void>}
     */
    const handleCustomerFolderSelect = async () => {
        if (!isFileSystemSupported) return;
        try {
            if (customerDirHandle) {
                const options = { mode: 'read' };
                const permission = await customerDirHandle.requestPermission(options);
                if (permission === 'granted') {
                    setCustomerPermissionGranted(true);
                    const files = await getExcelFilesFromDir(customerDirHandle);
                    files.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' }));
                    setCustomerFiles(files);
                    // コメント: ファイル名リストをキャッシュに保存する（リロード時の表示用）
                    await set('customerFilesListCache', files.map(f => ({ name: f.name })));
                    setError(null);
                    return;
                }
            }

            const handle = await window.showDirectoryPicker();
            setCustomerDirHandle(handle);
            setCustomerPermissionGranted(true);
            const files = await getExcelFilesFromDir(handle);
            files.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' }));
            setCustomerFiles(files);
            setError(null);
            await set('customerDirHandle', handle);
            // コメント: ファイル名リストをキャッシュに保存する（リロード時の表示用）
            await set('customerFilesListCache', files.map(f => ({ name: f.name })));
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting customer folder:', err);
                setError('顧客フォルダの選択に失敗しました');
            }
        }
    };

    /**
     * Handle multiple customer files upload from input on mobile.
     * @param {React.ChangeEvent<HTMLInputElement>} e
     * @returns {Promise<void>}
     */
    const handleCustomerFilesSelect = async (e) => {
        const files = Array.from(e.target.files).filter(
            file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        );
        const mappedFiles = files.map(file => ({
            name: file.name,
            file: file
        }));
        mappedFiles.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' }));
        setCustomerFiles(mappedFiles);
        setCustomerPermissionGranted(files.length > 0);
        setError(null);
        // コメント: モバイル等の環境向けに、選択されたファイルをIndexedDBに丸ごとキャッシュする
        try {
            await set('customerFilesCache', mappedFiles);
        } catch (err) {
            console.error('Failed to cache customer files:', err);
        }
    };

    /**
     * Load a specific customer file from the connected customer directory.
     * @param {string} name
     * @returns {Promise<void>}
     */
    const loadCustomerFile = async (name) => {
        try {
            let file;
            if (isFileSystemSupported && customerDirHandle) {
                // コメント: PC環境でリロード後などにパーミッションが切れている場合、オンデマンドでパーミッションを要求する
                const options = { mode: 'read' };
                let permission = await customerDirHandle.queryPermission(options);
                if (permission !== 'granted') {
                    permission = await customerDirHandle.requestPermission(options);
                }

                if (permission === 'granted') {
                    setCustomerPermissionGranted(true);
                    const fileHandle = await customerDirHandle.getFileHandle(name);
                    file = await fileHandle.getFile();
                } else {
                    throw new Error('フォルダへのアクセス権限がありません');
                }
            } else {
                const found = customerFiles.find(f => f.name === name);
                if (found && found.file) {
                    file = found.file;
                }
            }

            if (file) {
                await processExcelFile(file);
            } else {
                throw new Error('ファイルが見つかりません');
            }
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
        imageFilesMap,
        permissionGranted,
        customerDirHandle,
        customerPermissionGranted,
        customerFiles,
        error,
        isLoading,
        isFileSystemSupported,
        handleFileUpload,
        handleFolderSelect,
        handleImageFilesSelect,
        handleCustomerFolderSelect,
        handleCustomerFilesSelect,
        loadCustomerFile,
        clearError: () => setError(null)
    };
};
