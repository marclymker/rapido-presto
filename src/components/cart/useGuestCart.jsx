import { useState, useEffect } from 'react';

const GUEST_CART_KEY = 'guest_cart';

export function useGuestCart() {
  const [guestCart, setGuestCart] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    if (stored) {
      try {
        setGuestCart(JSON.parse(stored));
      } catch (e) {
        setGuestCart([]);
      }
    }
  }, []);

  const saveGuestCart = (cart) => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    setGuestCart(cart);
  };

  const addToGuestCart = (item) => {
    const existing = guestCart.find(i => i.product_id === item.product_id);

    if (existing) {
      const updated = guestCart.map(i =>
        i.product_id === item.product_id
          ? { ...i, quantity: i.quantity + (item.quantity || 1) }
          : i
      );
      saveGuestCart(updated);
    } else {
      saveGuestCart([...guestCart, { ...item, quantity: item.quantity || 1 }]);
    }
  };

  const updateGuestCartItem = (productId, quantity) => {
    const updated = guestCart.map(i =>
      i.product_id === productId ? { ...i, quantity } : i
    );
    saveGuestCart(updated);
  };

  const removeFromGuestCart = (productId) => {
    const updated = guestCart.filter(i => i.product_id !== productId);
    saveGuestCart(updated);
  };

  const clearGuestCart = () => {
    localStorage.removeItem(GUEST_CART_KEY);
    setGuestCart([]);
  };

  return {
    guestCart,
    addToGuestCart,
    updateGuestCartItem,
    removeFromGuestCart,
    clearGuestCart
  };
}
