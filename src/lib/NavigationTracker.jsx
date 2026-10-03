import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pagesConfig } from '@/pages.config';

/** Suivi analytique respectueux : aucune écriture Firestore à chaque navigation. */
export default function NavigationTracker() {
  const location = useLocation();
  const { Pages, mainPage } = pagesConfig;

  useEffect(() => {
    const pageName = location.pathname === '/'
      ? mainPage
      : Object.keys(Pages).find((key) => key.toLowerCase() === location.pathname.slice(1).split('/')[0].toLowerCase());
    if (typeof window.gtag === 'function' && pageName) {
      window.gtag('event', 'page_view', { page_path: location.pathname, page_title: pageName });
    }
  }, [location.pathname, Pages, mainPage]);

  return null;
}
