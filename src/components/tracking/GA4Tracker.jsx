import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const trackGA4Event = (eventName, params = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};

export const trackGA4Purchase = (order) => {
  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: order.order_number,
      value: order.total,
      currency: 'HTG',
      items: order.items.map((item, index) => ({
        item_id: item.product_id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.unit_price,
        index: index
      }))
    });
  }
};

export const trackGA4AddToCart = (product, quantity = 1) => {
  if (window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'HTG',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: quantity,
        item_category: product.category
      }]
    });
  }
};

export const trackGA4ViewItem = (product) => {
  if (window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'HTG',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category
      }]
    });
  }
};

export const trackGA4BeginCheckout = (cartItems, total) => {
  if (window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'HTG',
      value: total,
      items: cartItems.map((item, index) => ({
        item_id: item.product_id,
        item_name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        index: index
      }))
    });
  }
};

export default function GA4Tracker() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href
      });
    }
  }, [location]);

  return null;
}