import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/auth/useAuth';
import { trackGA4ViewItem, trackGA4AddToCart, trackGA4BeginCheckout, trackGA4Purchase } from '@/components/tracking/GA4Tracker';

export function useActivityTracker() {
  const { user } = useAuth();

  const getSessionId = () => {
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('guest_session_id', sessionId);
    }
    return sessionId;
  };

  const trackActivity = async (activityData) => {
    try {
      const userId = user?.id || getSessionId();
      
      await base44.entities.UserActivity.create({
        user_id: userId,
        ...activityData
      });
    } catch (error) {
      // Tracking errors are non-blocking
    }
  };

  // 🎯 TRACKING PRODUIT VU (ViewContent)
  const trackProductView = (product, shop) => {
    const price = parseFloat(product.promo_price || product.price || 0);
    
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_ids: [product.id],
        content_type: 'product',
        content_name: product.name,
        content_category: product.category,
        contents: [{ id: product.id, quantity: 1, item_price: price }],
        value: price,
        currency: 'HTG'
      });
    }

    // GA4 eCommerce
    trackGA4ViewItem(product);

    // Activité interne
    trackActivity({
      activity_type: 'product_view',
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      shop_id: shop?.id
    });
  };

  // 🛒 TRACKING AJOUT PANIER (AddToCart)
  const trackAddToCart = (product, quantity = 1) => {
    const price = parseFloat(product.promo_price || product.price || 0);
    const totalValue = price * quantity;

    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_type: 'product',
        content_name: product.name,
        content_category: product.category,
        contents: [{ id: product.id, quantity, item_price: price }],
        value: totalValue,
        currency: 'HTG'
      });
    }

    // GA4 eCommerce
    trackGA4AddToCart(product, quantity);

    // Activité interne
    trackActivity({
      activity_type: 'add_to_cart',
      product_id: product.id,
      product_name: product.name,
      category: product.category
    });
  };

  // 💳 TRACKING DÉBUT CHECKOUT (InitiateCheckout)
  const trackInitiateCheckout = (cartItems, total) => {
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: cartItems.map(item => item.product_id),
        content_type: 'product',
        num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        contents: cartItems.map(item => ({ id: item.product_id, quantity: item.quantity, item_price: item.unit_price })),
        value: parseFloat(total),
        currency: 'HTG'
      });
    }

    // GA4 eCommerce
    trackGA4BeginCheckout(cartItems, total);
  };

  // ✅ TRACKING ACHAT COMPLÉTÉ (Purchase)
  const trackPurchase = (order) => {
    if (window.fbq) {
      window.fbq('track', 'Purchase', {
        content_ids: order.items?.map(item => item.product_id) || [],
        content_type: 'product',
        num_items: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        contents: order.items?.map(item => ({ id: item.product_id, quantity: item.quantity, item_price: item.unit_price })) || [],
        value: parseFloat(order.total),
        currency: 'HTG',
        order_id: order.order_number
      });
    }

    // GA4 eCommerce
    trackGA4Purchase(order);
  };

  const trackCategoryView = (category) => {
    trackActivity({ activity_type: 'category_view', category });
  };

  const trackShopView = (shop) => {
    trackActivity({
      activity_type: 'shop_view',
      shop_id: shop.id,
      metadata: { shop_name: shop.company_name }
    });
  };

  const trackSearch = (query) => {
    // Meta Pixel Search event
    if (window.fbq && query?.trim()) {
      window.fbq('track', 'Search', {
        search_string: query,
        content_type: 'product'
      });
    }
    trackActivity({ activity_type: 'search', search_query: query });
  };

  return {
    trackProductView,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackCategoryView,
    trackShopView,
    trackSearch
  };
}