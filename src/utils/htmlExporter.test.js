import { describe, it, expect } from 'vitest';
import { createProductHtmlString } from './htmlExporter';

describe('createProductHtmlString', () => {
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
    }
  ];

  it('should successfully generate HTML string with correct headers and data but NO prices', async () => {
    const html = await createProductHtmlString(mockProducts, '28031_（株）千亀利ライスセンター.xlsx', null);
    
    expect(html).toBeDefined();
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('【28031_株式会社千亀利ライスセンター 様】 取扱商品一覧');
    
    // Check included values
    expect(html).toContain('別注ポリ袋A');
    expect(html).toContain('12345');
    expect(html).toContain('A001');
    expect(html).toContain('LDPE');
    expect(html).toContain('4901234567890');
    expect(html).toContain('2026/07/01');

    // Check excluded price columns
    expect(html).not.toContain('<th>単価</th>');
    expect(html).not.toContain('<th>印刷代</th>');
    
    expect(html).not.toContain('単価');
    expect(html).not.toContain('印刷代');
  });

  it('should escape HTML special characters to prevent XSS', async () => {
    const maliciousProducts = [
      {
        '受注№': '99999<script>alert("xss")</script>',
        '商品コード': 'CODE" onclick="alert(1)',
        'タイトル': '<b>悪意あるタイトル</b> & "ダブルクォート"',
        '商品名': '<b>悪意あるタイトル</b> & "ダブルクォート"',
        '種別': '既製品',
        '形状': '単袋',
        '材質名称': '<img src=x onerror=alert(1)>',
        '重量': '10g',
        'JANコード': '0000',
        '最新受注日': '2026-07-01'
      }
    ];

    const html = await createProductHtmlString(maliciousProducts, '<script>evil</script>.xlsx', null);

    // Verify special characters are escaped and not rendered as raw tags
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>evil</script>');

    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;evil&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;悪意あるタイトル&lt;/b&gt; &amp; &quot;ダブルクォート&quot;');
  });

  it('should throw an error for empty products', async () => {
    await expect(createProductHtmlString([], 'test.xlsx', null)).rejects.toThrow('出力するデータがありません');
    await expect(createProductHtmlString(null, 'test.xlsx', null)).rejects.toThrow();
  });
});
