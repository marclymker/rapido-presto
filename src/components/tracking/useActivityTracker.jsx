import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/auth/useAuth';

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

      // Track avec Meta Pixel aussi
      if (window.fbq) {
        if (activityData.activity_type === 'product_view') {
          window.fbq('track', 'ViewContent', {
            content_ids: [activityData.product_id],
            content_name: activityData.product_name,
            content_category: activityData.category
          });
        } else if (activityData.activity_type === 'add_to_cart') {
          window.fbq('track', 'AddToCart', {
            content_ids: [activityData.product_id],
            content_name: activityData.product_name
          });
        }
      }
    } catch (error) {
      console.log('Tracking error:', error);
    }
  };

  const trackProductView = (product, shop) => {
    trackActivity({
      activity_type: 'product_view',
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      shop_id: shop?.id
    });
  };

  const trackCategoryView = (category) => {
    trackActivity({
      activity_type: 'category_view',
      category: category
    });
  };

  const trackShopView = (shop) => {
    trackActivity({
      activity_type: 'shop_view',
      shop_id: shop.id,
      metadata: { shop_name: shop.company_name }
    });
  };

  const trackSearch = (query) => {
    trackActivity({
      activity_type: 'search',
      search_query: query
    });
  };

  const trackAddToCart = (product) => {
    trackActivity({
      activity_type: 'add_to_cart',
      product_id: product.id,
      product_name: product.name,
      category: product.category
    });
  };

  return {
    trackProductView,
    trackCategoryView,
    trackShopView,
    trackSearch,
    trackAddToCart
  };
}