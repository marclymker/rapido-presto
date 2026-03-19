import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      // Navigation
      welcome: "Bienvenue sur Rapido Presto",
      marketplace: "Marketplace",
      my_shop: "Ma boutique",
      categories: "Catégories",
      search_placeholder: "Rechercher un produit...",
      daily_selection: "Sélection du jour",
      products_count: "{{count}} produits",
      // Cart
      cart: "Panier",
      add_to_cart: "Ajouter au panier",
      added_to_cart: "Ajouté au panier !",
      finalize_order: "Finaliser ma commande",
      dont_forget: "N'oubliez pas vos achats !",
      items_in_cart: "Il vous reste <b>{{count}} article{{plural}}</b> dans votre panier.",
      // Product
      out_of_stock: "Rupture de stock",
      delivery: "Livraison",
      price: "Prix",
      // Status
      loading: "Chargement...",
      no_product_found: "Aucun produit trouvé",
      // SEO
      seo_title: "Rapido Presto - Marketplace en Haïti | Livraison Rapide",
      seo_description: "Découvrez tous les produits disponibles sur Rapido Presto - Mode, Mariage, Fleurs, Electronics et plus. Livraison rapide en Haïti.",
      // Footer
      customer_service: "Service client",
      about: "À propos",
    }
  },
  en: {
    translation: {
      welcome: "Welcome to Rapido Presto",
      marketplace: "Marketplace",
      my_shop: "My shop",
      categories: "Categories",
      search_placeholder: "Search for a product...",
      daily_selection: "Today's selection",
      products_count: "{{count}} products",
      cart: "Cart",
      add_to_cart: "Add to cart",
      added_to_cart: "Added to cart!",
      finalize_order: "Complete my order",
      dont_forget: "Don't forget your items!",
      items_in_cart: "You have <b>{{count}} item{{plural}}</b> in your cart.",
      out_of_stock: "Out of stock",
      delivery: "Delivery",
      price: "Price",
      loading: "Loading...",
      no_product_found: "No product found",
      seo_title: "Rapido Presto - Marketplace in Haiti | Fast Delivery",
      seo_description: "Discover all products available on Rapido Presto - Fashion, Wedding, Flowers, Electronics and more. Fast delivery in Haiti.",
      customer_service: "Customer service",
      about: "About",
    }
  },
  ht: {
    translation: {
      welcome: "Byenveni sou Rapido Presto",
      marketplace: "Makèt",
      my_shop: "Boutik mwen",
      categories: "Kategori",
      search_placeholder: "Chèche yon pwodwi...",
      daily_selection: "Chwa jou a",
      products_count: "{{count}} pwodwi",
      cart: "Panye",
      add_to_cart: "Ajoute nan panye",
      added_to_cart: "Ajoute nan panye!",
      finalize_order: "Finalize kòmann mwen",
      dont_forget: "Pa bliye achè w yo!",
      items_in_cart: "Ou gen <b>{{count}} atik{{plural}}</b> nan panye w.",
      out_of_stock: "Pa gen an stock",
      delivery: "Livrezon",
      price: "Pri",
      loading: "Ap chaje...",
      no_product_found: "Pa jwenn okenn pwodwi",
      seo_title: "Rapido Presto - Makèt ann Ayiti | Livrezon Rapid",
      seo_description: "Dekouvri tout pwodwi ki disponib sou Rapido Presto - Mòd, Maryaj, Flè, Elektwonik ak plis. Livrezon rapid ann Ayiti.",
      customer_service: "Sèvis kliyan",
      about: "Sou nou",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;