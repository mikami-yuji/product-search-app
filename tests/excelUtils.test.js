// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { normalizeProductRow, normalizeProductRows } from '../src/utils/excelUtils';

describe('excelUtils - 列名ゆらぎ自動補正', () => {
    it('受注No、品番、品名、販売単価などのゆらぎを標準キーに自動マッピングすること', () => {
        const rawRow = {
            '受注No': '55667',
            '品番': 'BOX-001',
            '品名': 'サンプル段ボールA',
            '販売単価': '150',
            '数量': '200'
        };

        const result = normalizeProductRow(rawRow);

        expect(result['受注№']).toBe('55667');
        expect(result['商品コード']).toBe('BOX-001');
        expect(result['商品名']).toBe('サンプル段ボールA');
        expect(result['単価']).toBe('150');
        expect(result['受注数']).toBe('200');
    });

    it('全角英数や記号のゆらぎ（受注Ｎｏ．, 商品ＣＤ）も認識すること', () => {
        const rawRow = {
            '受注Ｎｏ．': '99881',
            '商品ＣＤ': 'CD-999',
            'タイトル': '特注パッケージ',
            '上代': 2500
        };

        const result = normalizeProductRow(rawRow);

        expect(result['受注№']).toBe('99881');
        expect(result['商品コード']).toBe('CD-999');
        expect(result['商品名']).toBe('特注パッケージ');
        expect(result['単価']).toBe(2500);
    });

    it('すでに標準キーが存在している場合は上書きしないこと', () => {
        const rawRow = {
            '受注№': '11111',
            '受注No': '99999',
            '商品コード': 'STANDARD-01',
            '品番': 'ALIAS-01',
            '商品名': '正規商品名'
        };

        const result = normalizeProductRow(rawRow);

        expect(result['受注№']).toBe('11111');
        expect(result['商品コード']).toBe('STANDARD-01');
        expect(result['商品名']).toBe('正規商品名');
    });

    it('normalizeProductRows で配列全体を処理できること', () => {
        const rawRows = [
            { '伝票番号': '101', 'コード': 'A1', '名称': '商品1' },
            { '受注番号': '102', '商品CD': 'B2', '品目名': '商品2' }
        ];

        const results = normalizeProductRows(rawRows);

        expect(results).toHaveLength(2);
        expect(results[0]['受注№']).toBe('101');
        expect(results[0]['商品コード']).toBe('A1');
        expect(results[0]['商品名']).toBe('商品1');
        expect(results[1]['受注№']).toBe('102');
        expect(results[1]['商品コード']).toBe('B2');
        expect(results[1]['商品名']).toBe('商品2');
    });

    it('nullや空データが渡されてもエラーにならず安全に処理すること', () => {
        expect(normalizeProductRow(null)).toBe(null);
        expect(normalizeProductRow({})).toEqual({});
        expect(normalizeProductRows(null)).toEqual([]);
    });
});
