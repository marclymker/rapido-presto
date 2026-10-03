import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

// Le suivi de navigation est facultatif et ne doit jamais bloquer le rendu.
export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    useEffect(() => {
        if (!isAuthenticated || typeof window === 'undefined') return;
        const pathname = location.pathname || '/';
        const pathSegment = pathname === '/' ? mainPageKey : pathname.replace(/^\//, '').split('/')[0];
        const pageName = Object.keys(Pages).find(
            key => key.toLowerCase() === pathSegment.toLowerCase()
        ) || pathSegment;
        try {
            const current = JSON.parse(window.localStorage.getItem('rapido_navigation_events') || '[]');
            current.push({ page: pageName, at: new Date().toISOString() });
            window.localStorage.setItem('rapido_navigation_events', JSON.stringify(current.slice(-50)));
        } catch (_) {
            // Le suivi local reste facultatif.
        }
    }, [location.pathname, isAuthenticated, Pages, mainPageKey]);

    return null;
}
