import { useState } from 'react';

export const useCart = (showToast) => {
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

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
        const price = parseFloat(item['単価']) || 0;
        const printingCost = parseFloat(item['印刷代']) || 0;
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
