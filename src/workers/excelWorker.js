import * as XLSX from 'xlsx';

// Optimize memory usage
// dense: true -> reduces memory for sparse sheets
// cellStyles: false -> ignore styles (we only need data)
const DO_NOT_PROCESS = { cellStyles: false, cellFormula: false, cellHTML: false, cellNF: false, cellText: false };

self.onmessage = async (e) => {
    const { data: fileBuffer, fileName } = e.data;

    try {
        // Read file
        const workbook = XLSX.read(fileBuffer, { type: 'array', dense: true, ...DO_NOT_PROCESS });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('シートが見つかりません');
        }

        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(ws);

        // Send back success
        self.postMessage({ type: 'success', data: jsonData });
    } catch (err) {
        // Send back error
        self.postMessage({
            type: 'error',
            error: err.message || 'Parsing failed',
            details: err.toString()
        });
    }
};
