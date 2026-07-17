import { describe, it, expect } from 'vitest';
import { createProductExcelWorkbook } from './excelExporter';

describe('createProductExcelWorkbook', () => {
  const mockProducts = [
    {
      '受注№': '12345',
      '商品コード': 'A001',
      'タイトル': '別注ポリ袋A',
      '商品名': '',
      '種別': '別注品',
      '形状': '単袋',
      '材質名称': 'LDPE',
      '重量': '10g',
      '単価': '15',
      '印刷代': '5000',
      'JANコード': '4901234567890',
      '最新受注日': '2026-07-01'
    },
    {
      '受注№': '67890',
      '商品コード': 'K001',
      'タイトル': '',
      '商品名': '既製米袋K',
      '種別': '既製品',
      '形状': '単袋',
      '材質名称': 'HDPE',
      '重量': '20g',
      '単価': '30',
      '印刷代': '',
      'JANコード': '',
      '最新受注日': '2026-07-10'
    }
  ];

  it('should successfully create a workbook with correct structures', async () => {
    // Note: passing null for dirHandle to skip actual image loading in unit test
    const wb = await createProductExcelWorkbook(mockProducts, '28031_（株）千亀利ライスセンター.xlsx', null);
    
    expect(wb).toBeDefined();
    
    const ws = wb.getWorksheet('商品一覧');
    expect(ws).toBeDefined();

    // Check cells
    // Row 1 (index 1): Title
    expect(ws.getCell('A1').value).toBe('【28031_株式会社千亀利ライスセンター 様】 取扱商品一覧');
    
    // Row 4: Headers (including new image column at B)
    expect(ws.getCell('A4').value).toBe('No.');
    expect(ws.getCell('B4').value).toBe('商品画像');
    expect(ws.getCell('C4').value).toBe('受注№');
    expect(ws.getCell('D4').value).toBe('商品コード');
    expect(ws.getCell('E4').value).toBe('品名');
    expect(ws.getCell('J4').value).toBe('単価');

    // Row 5: Data 1 (別注品: タイトルを表示)
    expect(ws.getCell('A5').value).toBe(1);
    expect(ws.getCell('C5').value).toBe('12345');
    expect(ws.getCell('D5').value).toBe('A001');
    expect(ws.getCell('E5').value).toBe('別注ポリ袋A');
    expect(ws.getCell('J5').value).toBe(15);
    expect(ws.getCell('J5').numFmt).toBe('"¥"#,##0');
    expect(ws.getCell('K5').value).toBe(5000);
    expect(ws.getCell('K5').numFmt).toBe('"¥"#,##0');

    // Row 6: Data 2 (既製品: 商品名を表示)
    expect(ws.getCell('A6').value).toBe(2);
    expect(ws.getCell('C6').value).toBe('67890');
    expect(ws.getCell('D6').value).toBe('K001');
    expect(ws.getCell('E6').value).toBe('既製米袋K');
    expect(ws.getCell('J6').value).toBe(30);
    expect(ws.getCell('K6').value).toBeNull(); // 印刷代は空
  });

  it('should throw an error if product array is empty', async () => {
    await expect(createProductExcelWorkbook([], 'test.xlsx', null)).rejects.toThrow('出力するデータがありません');
    await expect(createProductExcelWorkbook(null, 'test.xlsx', null)).rejects.toThrow();
  });
});
