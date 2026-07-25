import { describe, it, expect } from 'vitest';
import { extractCustomerCode, normalizeOrderNumber, generateOrderNoVariants } from './imageKeyUtils';

describe('imageKeyUtils', () => {
  describe('extractCustomerCode', () => {
    it('should extract leading numbers from customer filename correctly', () => {
      expect(extractCustomerCode('22072_（株）中尾米穀店.xlsx')).toBe('22072');
      expect(extractCustomerCode('16152_トーベイ（株）.xlsx')).toBe('16152');
      expect(extractCustomerCode('２２０７２_全角顧客')).toBe('22072');
      expect(extractCustomerCode('コードなし顧客')).toBe('');
      expect(extractCustomerCode(null)).toBe('');
    });
  });

  describe('normalizeOrderNumber', () => {
    it('should normalize order numbers properly', () => {
      expect(normalizeOrderNumber('1005235.jpg')).toBe('1005235');
      expect(normalizeOrderNumber('１００５２３５')).toBe('1005235');
      expect(normalizeOrderNumber('100,5235')).toBe('1005235');
      expect(normalizeOrderNumber('1005235.0')).toBe('1005235');
      expect(normalizeOrderNumber('')).toBe('');
    });
  });

  describe('generateOrderNoVariants', () => {
    it('should generate expected search variants for an order number', () => {
      const variants = generateOrderNoVariants('1005235');
      expect(variants).toContain('1005235');
      expect(variants).toContain('1005235-01');
      expect(variants).toContain('1005235_01');
      expect(variants).toContain('1005235a');
      expect(variants.length).toBeGreaterThan(5);
    });

    it('should pad zeros if unpadded number is short', () => {
      const variants = generateOrderNoVariants('5235');
      expect(variants).toContain('5235');
      expect(variants).toContain('0005235');
      expect(variants).toContain('00005235');
    });
  });
});
