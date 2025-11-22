import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 試行するベースURLのリスト
const BASE_URLS = [
    'https://www.asahipac.co.jp/product/flat1/',
    'https://www.asahipac.co.jp/product/craft3/',
    'https://www.asahipac.co.jp/product/craft2/',
    'https://www.asahipac.co.jp/product/craft1/',
    'https://www.asahipac.co.jp/product/flat2/',
    'https://www.asahipac.co.jp/product/flat3/',
    'https://www.asahipac.co.jp/product/shigen/',
    'https://www.asahipac.co.jp/product/kome/',
];

const OUTPUT_FILE = path.join(__dirname, 'public', 'product_images.json');

async function fetchImageForCode(code) {
    if (!code || String(code).length < 5) return null;
    const codeStr = String(code);

    const substrings = [
        codeStr.slice(2, 5), // 3-5 digits (3 chars) - Pattern: ●●▲▲▲●●●● (Prioritized)
        codeStr.slice(1, 5)  // 2-5 digits (4 chars) - Pattern: ●▲▲▲▲●●●●
    ];

    for (const sub of substrings) {
        for (const baseUrl of BASE_URLS) {
            const url = `${baseUrl}${sub}/`;
            try {
                console.log(`Checking URL: ${url}`);
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                const $ = cheerio.load(response.data);

                // Try to find the main image
                // Based on inspection: .img_box_main img or .img_box img
                let imgSrc = $('.img_box_main img').attr('src') || $('.img_box img').attr('src');

                // Fallback: Look for any image in wp-content/uploads
                if (!imgSrc) {
                    $('img').each((i, el) => {
                        const src = $(el).attr('src');
                        if (src && src.includes('wp-content/uploads') && !src.includes('logo') && !src.includes('icon')) {
                            imgSrc = src;
                            return false; // break
                        }
                    });
                }

                if (imgSrc) {
                    // Resolve relative URLs
                    if (imgSrc.startsWith('/')) {
                        imgSrc = `https://www.asahipac.co.jp${imgSrc}`;
                    } else if (!imgSrc.startsWith('http')) {
                        imgSrc = `${baseUrl}${sub}/${imgSrc}`;
                    }
                    console.log(`Found image for code ${code} (sub: ${sub}) at ${url}: ${imgSrc}`);
                    return imgSrc;
                }
            } catch (error) {
                // 404 or other error, continue to next url/substring
                // console.log(`Failed to fetch ${url}: ${error.message}`);
            }
        }
    }

    return null;
}

async function main() {
    try {
        let productCodes = new Set();

        // 1. Find all Excel files in the current directory
        const files = await fs.readdir(__dirname);
        const excelFiles = files.filter(f =>
            (f.endsWith('.xlsx') || f.endsWith('.xls')) &&
            !f.startsWith('~$') && // Ignore temp files
            !f.includes('node_modules')
        );

        if (excelFiles.length === 0) {
            console.log("No Excel files found in directory. Using dummy codes.");
            productCodes.add('001230000');
            productCodes.add('101050000');
            productCodes.add('005020501'); // User provided example
        } else {
            console.log(`Found Excel files: ${excelFiles.join(', ')}`);

            for (const file of excelFiles) {
                try {
                    const filePath = path.join(__dirname, file);
                    console.log(`Reading file: ${file}`);

                    const workbook = XLSX.readFile(filePath);
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet);

                    data.forEach(row => {
                        // 種別または形状が「既製品」「雑材」の場合のみ対象にする
                        const type = String(row['種別'] || row['形状'] || '').trim();
                        if (row['商品コード'] && (type === '既製品' || type === '雑材')) {
                            productCodes.add(String(row['商品コード']));
                        }
                    });
                } catch (err) {
                    console.error(`Error reading ${file}:`, err.message);
                }
            }
        }

        const codesArray = Array.from(productCodes);
        console.log(`Found ${codesArray.length} unique product codes to check.`);

        const imageMap = {};

        // Load existing map if exists to avoid re-fetching
        try {
            const existing = await fs.readFile(OUTPUT_FILE, 'utf-8');
            Object.assign(imageMap, JSON.parse(existing));
        } catch (e) { }

        for (const code of codesArray) {
            if (imageMap[code]) continue; // Skip if already found

            const imgUrl = await fetchImageForCode(code);
            if (imgUrl) {
                imageMap[code] = imgUrl;
            }

            // Be nice to the server
            await new Promise(r => setTimeout(r, 500));
        }

        // Ensure public dir exists
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

        await fs.writeFile(OUTPUT_FILE, JSON.stringify(imageMap, null, 2));
        console.log(`Saved image map to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("Error in main:", error);
    }
}

main();
