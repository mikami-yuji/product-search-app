// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from './useCart';

describe('useCart hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty cart when localStorage is empty', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
    expect(result.current.cartItemCount).toBe(0);
  });

  it('should restore cart items from localStorage on mount', () => {
    const initialItems = [
      {
        cartId: 'test-1',
        '受注№': '10001',
        '商品コード': 'A01',
        '商品名': 'テスト商品',
        '単価': '1,500',
        '印刷代': '300',
        quantity: 2
      }
    ];
    localStorage.setItem('product_search_cart', JSON.stringify(initialItems));

    const { result } = renderHook(() => useCart());
    expect(result.current.cart.length).toBe(1);
    expect(result.current.cartItemCount).toBe(1);
    // (1500 * 2) + 300 = 3300
    expect(result.current.cartTotal).toBe(3300);
  });

  it('should correctly calculate cart total with comma-separated price values', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart({
        '受注№': '20001',
        '商品コード': 'B01',
        'タイトル': 'ポリ袋特大',
        '単価': '2,400',
        '印刷代': '1,200',
        '受注数': 3
      }, 3);
    });

    expect(result.current.cart.length).toBe(1);
    // (2400 * 3) + 1200 = 8400
    expect(result.current.cartTotal).toBe(8400);

    // Add another item with comma
    act(() => {
      result.current.addToCart({
        '受注№': '20002',
        '商品コード': 'B02',
        'タイトル': 'クラフト袋',
        '単価': '12,500',
        '印刷代': '0'
      }, 1);
    });

    // 8400 + (12500 * 1) = 20900
    expect(result.current.cartTotal).toBe(20900);
  });

  it('should update localStorage when items are added, updated, or removed', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart({
        '受注№': '30001',
        '商品コード': 'C01',
        '商品名': '保存テスト品',
        '単価': '500'
      }, 1);
    });

    const savedAfterAdd = JSON.parse(localStorage.getItem('product_search_cart'));
    expect(savedAfterAdd.length).toBe(1);
    expect(savedAfterAdd[0]['受注№']).toBe('30001');

    const cartId = result.current.cart[0].cartId;

    act(() => {
      result.current.updateCartQuantity(cartId, 5);
    });

    const savedAfterUpdate = JSON.parse(localStorage.getItem('product_search_cart'));
    expect(savedAfterUpdate[0].quantity).toBe(5);

    act(() => {
      result.current.removeFromCart(cartId);
    });

    const savedAfterRemove = JSON.parse(localStorage.getItem('product_search_cart'));
    expect(savedAfterRemove).toEqual([]);
  });

  it('should clear cart completely when clearCart is called', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart({ '受注№': '40001', '商品コード': 'D01', '単価': '100' });
      result.current.addToCart({ '受注№': '40002', '商品コード': 'D02', '単価': '200' });
    });

    expect(result.current.cart.length).toBe(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
    expect(JSON.parse(localStorage.getItem('product_search_cart'))).toEqual([]);
  });
});
