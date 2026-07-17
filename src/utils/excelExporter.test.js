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

  it('should successfully create a workbook with correct structures', () => {
    const wb = createProductExcelWorkbook(mockProducts, '28031_（株）千亀利ライスセンター.xlsx');
    
    expect(wb).toBeDefined();
    expect(wb.SheetNames).toContain('商品一覧');
    
    const ws = wb.Sheets['商品一覧'];
    expect(ws).toBeDefined();

    // Check cells
    // Row 1 (index 0): Title
    expect(ws['A1'].v).toBe('【28031_株式会社千亀利ライスセンター 様】 取扱商品一覧');
    
    // Row 4 (index 3): Headers
    expect(ws['A4'].v).toBe('No.');
    expect(ws['B4'].v).toBe('受注№');
    expect(ws['C4'].v).toBe('商品コード');
    expect(ws['D4'].v).toBe('品名');
    expect(ws['I4'].v).toBe('単価');

    // Row 5 (index 4): Data 1 (別注品: タイトルを表示)
    expect(ws['A5'].v).toBe(1);
    expect(ws['B5'].v).toBe('12345');
    expect(ws['C5'].v).toBe('A001');
    expect(ws['D5'].v).toBe('別注ポリ袋A');
    expect(ws['I5'].v).toBe(15);
    expect(ws['I5'].t).toBe('n');
    expect(ws['I5'].z).toBe('"¥"#,##0');
    expect(ws['J5'].v).toBe(5000);
    expect(ws['J5'].t).toBe('n');
    expect(ws['J5'].z).toBe('"¥"#,##0');

    // Row 6 (index 5): Data 2 (既製品: 商品名を表示)
    expect(ws['A6'].v).toBe(2);
    expect(ws['B6'].v).toBe('67890');
    expect(ws['C6'].v).toBe('K001');
    expect(ws['D6'].v).toBe('既製米袋K');
    expect(ws['I6'].v).toBe(30);
    expect(ws['J6']).toBeUndefined(); // 印刷代は空
  });

  it('should throw an error if product array is empty', () => {
    expect(() => createProductExcelWorkbook([], 'test.xlsx')).toThrow('出力するデータがありません');
    expect(() => createProductExcelWorkbook(null, 'test.xlsx')).toThrow();
  });
});
