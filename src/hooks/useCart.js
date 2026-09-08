import { useState, useEffect } from 'react';

const CART_STORAGE_KEY = 'product_search_cart';

const parsePrice = (val) => {
    if (!val) return 0;
    return parseFloat(String(val).replace(/,/g, '')) || 0;
};

export const useCart = (showToast) => {
    const [cart, setCart] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (err) {
            console.error('Failed to load cart from localStorage:', err);
            return [];
        }
    });
    const [showCart, setShowCart] = useState(false);

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch (err) {
            console.error('Failed to save cart to localStorage:', err);
        }
    }, [cart]);

    const addToCart = (product, quantity = 1) => {
        const qtyToAdd = quantity === 1 && product['受注数'] ? Number(product['受注数']) : quantity;

        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item =>
                item['商品コード'] === product['商品コード'] && item['受注№'] === product['受注№']
            );

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += qtyToAdd;
                return newCart;
            } else {
                // Generate a unique ID for the cart item
                const cartId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return [...prevCart, { ...product, quantity: qtyToAdd, cartId }];
            }
        });

        if (showToast) {
            showToast(`${product['商品名'] || product['タイトル']}をカートに追加しました`);
        }
    };

    const updateCartQuantity = (cartId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(cartId);
        } else {
            setCart(cart.map(item =>
                item.cartId === cartId ? { ...item, quantity: newQuantity } : item
            ));
        }
    };

    const removeFromCart = (cartId) => {
        setCart(cart.filter(item => item.cartId !== cartId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartTotal = cart.reduce((sum, item) => {
        const price = parsePrice(item['単価']);
        const printingCost = parsePrice(item['印刷代']);
        return sum + (price * item.quantity) + printingCost;
    }, 0);

    const cartItemCount = cart.length;

    return {
        cart,
        showCart,
        setShowCart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemCount
    };
};
