import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { get, set } from 'idb-keyval';
import { extractCustomerCode, normalizeOrderNumber } from '../utils/imageKeyUtils';

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
    const [imageFilesMap, setImageFilesMap] = useState(new Map());
    const [imageFolderName, setImageFolderName] = useState('');

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
                const cachedImageFolderName = await get('imageFolderNameCache');

                if (cachedData) setData(cachedData);
                if (cachedFileName) setFileName(cachedFileName);
                if (cachedLastModified) setLastModified(cachedLastModified);
                if (cachedImageFolderName) setImageFolderName(cachedImageFolderName);
                
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
                    // スマホではリロード後にメモリ上のimageFilesMapが空になるため、初期化時はpermissionGrantedをfalseにする
                    setPermissionGranted(false);
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
            // Attempting to wake up cloud file
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
                setFileName(file.name);
                setLastModified(file.lastModified);
                setError(null);

                // 選択中顧客名に完全連動して、画像取得元フォルダ名を動的更新 (例: 16152_トーベイ（株）)
                const cleanCustFolderName = String(file.name).replace(/\.xlsx?$/i, '').trim();
                if (cleanCustFolderName) {
                    setImageFolderName(cleanCustFolderName);
                    set('imageFolderNameCache', cleanCustFolderName).catch(err => console.error('Failed to cache image folder name:', err));
                }

                // UI描画をブロックしないようバックグラウンドでIndexedDBに保存
                Promise.all([
                    set('productData', parsedData),
                    set('fileName', file.name),
                    set('lastModified', file.lastModified)
                ]).catch(err => console.error('Failed to update IndexedDB cache in background:', err));
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

    /**
     * スマホ等のファイルインプット選択時に画像ファイル群をメモリマップ化（全バリエーションキーを網羅してPCと同等に一瞬で表示）
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

            // 1. 完全一致ファイル名および小文字ファイル名
            newMap.set(name, file);
            newMap.set(lowerFileName, file);
            newMap.set(rawName, file);
            newMap.set(lowerRawName, file);

            // 2. 正規化・記号除去・全角半角キー
            const cleaned = lowerRawName
                .replace(/,/g, '')
                .replace(/\.0+$/, '')
                .replace(/[ａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

            if (cleaned) {
                newMap.set(cleaned, file);

                const unpadded = cleaned.replace(/^0+/, '');
                if (unpadded) {
                    newMap.set(unpadded, file);
                    newMap.set(unpadded.padStart(7, '0'), file);
                    newMap.set(unpadded.padStart(8, '0'), file);
                }
            }

            // 3. フォルダパスが含まれる場合（webkitRelativePath）- 全階層セグメントを登録
            const relPath = file.webkitRelativePath ? String(file.webkitRelativePath).normalize('NFC') : '';
            if (relPath) {
                const parts = relPath.split('/');
                for (let p = 0; p < parts.length - 1; p++) {
                    const folderSegment = parts[p].trim().toLowerCase();
                    if (folderSegment) {
                        newMap.set(`${folderSegment}/${lowerRawName}`, file);
                        newMap.set(`${folderSegment}/${lowerFileName}`, file);
                        if (cleaned) {
                            newMap.set(`${folderSegment}/${cleaned}`, file);
                        }

                        // 先頭の顧客コード（例: 16152）を抽出してコードプレフィックスキーを登録
                        const codeMatch = folderSegment.match(/^([0-9a-z]+)/i);
                        if (codeMatch) {
                            const code = codeMatch[1].toLowerCase();
                            newMap.set(`${code}/${lowerRawName}`, file);
                            newMap.set(`${code}/${lowerFileName}`, file);
                            if (cleaned) {
                                newMap.set(`${code}/${cleaned}`, file);
                            }
                        }
                    }
                }
            }

            // 3b. 選択中の顧客名・顧客コードプレフィックスを全自動バインド
            if (fileName) {
                const custClean = String(fileName).replace(/\.xlsx?$/i, '').trim().toLowerCase();
                const custCode = extractCustomerCode(fileName);
                if (custClean) {
                    newMap.set(`${custClean}/${lowerFileName}`, file);
                    newMap.set(`${custClean}/${lowerRawName}`, file);
                    if (cleaned) newMap.set(`${custClean}/${cleaned}`, file);
                }
                if (custCode) {
                    newMap.set(`${custCode}/${lowerFileName}`, file);
                    newMap.set(`${custCode}/${lowerRawName}`, file);
                    if (cleaned) newMap.set(`${custCode}/${cleaned}`, file);
                }
            }

            // 4. アンダースコア・ハイフン区切りファイル名（例: 27099_1005235 や みどりフーズ_1005235）から受注№部分を自動抽出
            const subParts = rawName.split(/[_#-]/);
            if (subParts.length > 1) {
                const lastPart = subParts[subParts.length - 1].trim().toLowerCase();
                const cleanLast = lastPart
                    .replace(/,/g, '')
                    .replace(/\.0+$/, '')
                    .replace(/[ａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

                if (cleanLast) {
                    newMap.set(cleanLast, file);
                    const unpaddedLast = cleanLast.replace(/^0+/, '');
                    if (unpaddedLast) {
                        newMap.set(unpaddedLast, file);
                        newMap.set(unpaddedLast.padStart(7, '0'), file);
                        newMap.set(unpaddedLast.padStart(8, '0'), file);
                    }
                }
            }

            // 5. 末尾のアルファベット枝番 (例: 44884A -> 44884) を除外した純粋数字キーの登録
            const baseNumMatch = lowerRawName.match(/^([0-9]+)[a-z]+$/i);
            if (baseNumMatch) {
                const pureNum = baseNumMatch[1];
                newMap.set(pureNum, file);
                const unpaddedPure = pureNum.replace(/^0+/, '');
                if (unpaddedPure) {
                    newMap.set(unpaddedPure, file);
                    newMap.set(unpaddedPure.padStart(7, '0'), file);
                    newMap.set(unpaddedPure.padStart(8, '0'), file);
                }
            }
        }

        // 選択中の顧客ファイル名があれば優先して取得元表示にする
        let activeCustFolder = fileName ? String(fileName).replace(/\.xlsx?$/i, '').trim() : '';

        // 選択された画像群からトップレベルフォルダ名を取得
        let detectedFolderName = activeCustFolder;
        if (!detectedFolderName && files.length > 0) {
            const firstRelPath = files[0].webkitRelativePath;
            if (firstRelPath) {
                const parts = firstRelPath.split('/');
                if (parts.length > 1) {
                    detectedFolderName = parts[0];
                }
            }
            if (!detectedFolderName) {
                // ファイル名からディレクトリ風表示を生成
                const firstFileName = files[0].name;
                const dotIdx = firstFileName.lastIndexOf('.');
                const baseName = dotIdx > 0 ? firstFileName.substring(0, dotIdx) : firstFileName;
                detectedFolderName = files.length === 1 ? baseName : `${baseName} 他${files.length}件`;
            }
        }

        if (detectedFolderName) {
            setImageFolderName(detectedFolderName);
            set('imageFolderNameCache', detectedFolderName).catch(err => console.error('Failed to cache image folder name:', err));
        }

        setImageFilesMap(new Map(newMap));
        setPermissionGranted(true);
        setError(null);

        // スマホ画面で画像読み込み完了を確実に認知させる通知
        if (files.length > 0) {
            console.log(`[ImageLoader] Loaded ${files.length} images into map. Total keys: ${newMap.size}`);
        }
    };

    /**
     * Handle image folder selection and connection.
     * スマホ等の File System API 非対応環境では image-files-input を優先起動します。
     * @returns {Promise<void>}
     */
    const handleFolderSelect = async () => {
        if (!isFileSystemSupported) {
            // スマホで「フォルダごと」一括選択させるため、webkitdirectory付きインプット(image-folder-input)を最優先起動
            const mobileInput = document.getElementById('image-folder-input') || document.getElementById('image-files-input');
            if (mobileInput) {
                mobileInput.value = ''; // 同一選択や再選択でも確実に onChange を発火させるためのクリア
                mobileInput.click();
                return;
            }
        }

        try {
            if (isFileSystemSupported && window.showDirectoryPicker) {
                const handle = await window.showDirectoryPicker();
                setDirHandle(handle);
                setPermissionGranted(true);
                setError(null);
                await set('imageDirHandle', handle);
                return;
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
        }

        const fallbackInput = document.getElementById('image-files-input') || document.getElementById('image-folder-input');
        if (fallbackInput) {
            fallbackInput.click();
        }
    };

    /**
     * Handle customer data folder selection and connection.
     * スマホ等の File System API 非対応環境では customer-files-input を優先起動します。
     * @returns {Promise<void>}
     */
    const handleCustomerFolderSelect = async () => {
        if (!isFileSystemSupported) {
            const mobileInput = document.getElementById('customer-files-input') || document.getElementById('customer-folder-input');
            if (mobileInput) {
                mobileInput.click();
                return;
            }
        }

        try {
            if (isFileSystemSupported && window.showDirectoryPicker) {
                const handle = await window.showDirectoryPicker();
                setCustomerDirHandle(handle);
                setCustomerPermissionGranted(true);
                const files = await getExcelFilesFromDir(handle);
                files.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' }));
                setCustomerFiles(files);
                setError(null);
                await set('customerDirHandle', handle);
                await set('customerFilesListCache', files.map(f => ({ name: f.name })));
                
                // 顧客ファイルが存在すれば先頭のファイルを自動読み込み
                if (files.length > 0) {
                    const firstFile = await files[0].handle.getFile();
                    if (firstFile) {
                        await processExcelFile(firstFile);
                    }
                }
                return;
            }
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.error('Error selecting customer folder:', err);
            }
        }

        const fallbackInput = document.getElementById('customer-files-input') || document.getElementById('customer-folder-input');
        if (fallbackInput) {
            fallbackInput.click();
        }
    };

    /**
     * Handle multiple customer files upload from input on mobile.
     * 選択後に自動的に先頭の顧客ファイルを読み込みます。
     * @param {React.ChangeEvent<HTMLInputElement>} e
     * @returns {Promise<void>}
     */
    const handleCustomerFilesSelect = async (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList).filter(
            file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        );

        if (files.length === 0) {
            setError('有効なExcelファイル(.xlsx, .xls)が選択されていません');
            return;
        }

        const mappedFiles = files.map(file => ({
            name: file.name,
            file: file
        }));
        mappedFiles.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' }));
        setCustomerFiles(mappedFiles);
        setCustomerPermissionGranted(true);
        setError(null);

        // モバイル環境向けに、軽量なファイル名リストのみをIndexedDBにキャッシュ（重いFileオブジェクトの複製遅延を防止）
        const fileListCache = mappedFiles.map(f => ({ name: f.name }));
        set('customerFilesCache', fileListCache).catch(err => console.error('Failed to cache customer files:', err));

        // 選択された顧客ファイルの先頭を自動的にロード
        if (mappedFiles.length > 0 && mappedFiles[0].file) {
            await processExcelFile(mappedFiles[0].file);
        }
    };

    /**
     * Load a specific customer file from the connected customer directory.
     * 完全一致・拡張子なし一致・先頭の顧客コード（例: 22072）を考慮して照合します。
     * @param {string} name
     * @returns {Promise<void>}
     */
    const loadCustomerFile = async (name) => {
        setIsLoading(true);
        try {
            let file;
            const targetCustomerCode = extractCustomerCode(name);
            const cleanTargetName = String(name).replace(/\.xlsx?$/i, '').trim().toLowerCase();

            if (isFileSystemSupported && customerDirHandle) {
                // コメント: PC環境でリロード後などにパーミッションが切れている場合、オンデマンドでパーミッションを要求する
                const options = { mode: 'read' };
                let permission = await customerDirHandle.queryPermission(options);
                if (permission !== 'granted') {
                    permission = await customerDirHandle.requestPermission(options);
                }

                if (permission === 'granted') {
                    setCustomerPermissionGranted(true);
                    try {
                        const fileHandle = await customerDirHandle.getFileHandle(name);
                        file = await fileHandle.getFile();
                    } catch {
                        // ファイル名で直接取得できなかった場合、拡張子や顧客コードによる柔軟検索
                        const files = await getExcelFilesFromDir(customerDirHandle);
                        const matched = files.find(f => {
                            const cleanFName = f.name.replace(/\.xlsx?$/i, '').trim().toLowerCase();
                            if (cleanFName === cleanTargetName) return true;
                            if (targetCustomerCode && extractCustomerCode(f.name) === targetCustomerCode) return true;
                            return false;
                        });
                        if (matched) {
                            file = await matched.handle.getFile();
                        }
                    }
                } else {
                    setCustomerPermissionGranted(false);
                    throw new Error('フォルダへのアクセス権限が許可されていません');
                }
            } else {
                let found = customerFiles.find(f => f.name === name);
                if (!found) {
                    found = customerFiles.find(f => {
                        const cleanFName = String(f.name).replace(/\.xlsx?$/i, '').trim().toLowerCase();
                        if (cleanFName === cleanTargetName) return true;
                        if (targetCustomerCode && extractCustomerCode(f.name) === targetCustomerCode) return true;
                        return false;
                    });
                }
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
        } finally {
            setIsLoading(false);
        }
    };

    return {
        data,
        fileName,
        lastModified,
        dirHandle,
        imageFilesMap,
        imageFolderName,
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
