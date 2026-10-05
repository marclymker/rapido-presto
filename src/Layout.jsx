import React, { useState, useEffect, lazy, Suspense } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { Toaster } from "@/components/ui/sonner";
import { useQuery } from '@tanstack/react-query';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import SmartBottomNav from '@/components/navigation/SmartBottomNav';
import { useAuth } from '@/components/auth/useAuth';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { useServiceWorker } from '@/components/offline/useServiceWorker';
import { useCacheManager } from '@/components/offline/useCacheManager';
import OfflineIndicator from '@/components/offline/OfflineIndicator';
import ThemeProvider from '@/components/theme/ThemeProvider';
import AppFooter from '@/components/layout/AppFooter';

// Composants non-critiques chargés en différé (hors chemin critique de rendu)
const OneSignalInit = lazy(() => import('@/components/notifications/OneSignalInit'));
const SessionValidator = lazy(() => import('@/components/auth/SessionValidator'));
const GA4Tracker = lazy(() => import('@/components/tracking/GA4Tracker'));

// Détecte connexion lente (Save-Data ou 2G)
const isSlowConnection = () => {
  try {
    const c = navigator.connection;
    return !!(c && (c.saveData || ['slow-2g', '2g'].includes(c.effectiveType)));
  } catch (_) { return false; }
};

export default function Layout({ children, currentPageName }) {
  const { user } = useAuth();
  // Calculé une seule fois au montage du layout
  const [slowConnection] = useState(() => isSlowConnection());

  useServiceWorker();
  useCacheManager(user);

  useEffect(() => {
    if (user && !user.current_profile && currentPageName !== 'ProfileSetup') {
      firebaseApi.auth.updateMe({
        current_profile: 'client',
        profiles: {
          client: { is_active: true, created_at: new Date().toISOString() }
        }
      }).then(() => {
        window.location.reload();
      });
    }
  }, [user, currentPageName]);

  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [currentPageName]);

  const noNavPages = ['ProfileSetup', 'ManageProfiles', 'AdminValidation', 'Chat'];

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => firebaseApi.entities.Order.filter({ client_id: user?.id }),
    enabled: !!user?.id
  });

  const activeOrdersCount = orders.filter(o =>
    !['delivered', 'cancelled'].includes(o.status)
  ).length;

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f1115" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rapido" />
        <link rel="alternate" hrefLang="fr-HT" href="https://makariosbridal.shop" />
        <link rel="alternate" hrefLang="fr" href="https://makariosbridal.shop" />
        <link rel="alternate" hrefLang="x-default" href="https://makariosbridal.shop" />
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
        <meta name="google-site-verification" content="INa9gqcSulkml5JtloQvw_k9lVR-AKcxha0eRYbvqoI" />
        <meta name="google-site-verification" content="TGLvYzGeMnDhLk5dxXLxm-_9a3zAAgAt-BBTDzQehUM" />
        <meta name="google-site-verification" content="google2665276976d944ab" />
      </Helmet>

      <div className="flex flex-col w-full min-h-screen bg-slate-50">
        <Toaster position="top-center" />
        <ThemeProvider />
        <OfflineIndicator />

        {/* Composants non-critiques : chargés en différé après le rendu principal */}
        {/* Sur connexion lente, on ne charge pas les composants non-essentiels */}
        <Suspense fallback={null}>
          {!slowConnection && <OneSignalInit user={user} />}
          <SessionValidator user={user} />
          {!slowConnection && <GA4Tracker />}
        </Suspense>

        {user && !noNavPages.includes(currentPageName) && user.current_profile === 'client' && (
          <div className="fixed top-4 right-4 z-50">
            <ProfileSwitcher user={user} />
          </div>
        )}

        <div className="flex-1">
          {children}
        </div>

        {!noNavPages.includes(currentPageName) && (
          <SmartBottomNav
            activeOrdersCount={activeOrdersCount}
          />
        )}

        <AppFooter />
      </div>
      <style>{`
        html, body, #root {
          height: auto !important;
          overflow: visible !important;
        }
      `}</style>
    </HelmetProvider>
  );
}
