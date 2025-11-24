import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { get, set } from 'idb-keyval';

export const useProductData = () => {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [dirHandle, setDirHandle] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);

    // Load cached data on mount
    useEffect(() => {
        const loadCachedData = async () => {
            try {
                const cachedData = await get('productData');
                const cachedFileName = await get('fileName');
                if (cachedData) setData(cachedData);
                if (cachedFileName) setFileName(cachedFileName);
            } catch (err) {
                console.error('Error loading cache:', err);
            }
        };
        loadCachedData();
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        set('fileName', file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const workbook = XLSX.read(bstr, { type: 'binary' });
            const wsname = workbook.SheetNames[0];
            const ws = workbook.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            setData(jsonData);
            set('productData', jsonData);
        };
        reader.readAsBinaryString(file);
    };

    const handleFolderSelect = async () => {
        try {
            const handle = await window.showDirectoryPicker();
            setDirHandle(handle);
            setPermissionGranted(true);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error selecting folder:', err);
            }
        }
    };

    return {
        data,
        fileName,
        dirHandle,
        permissionGranted,
        handleFileUpload,
        handleFolderSelect
    };
};
