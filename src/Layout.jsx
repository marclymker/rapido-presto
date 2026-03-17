import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, ShoppingBag, User, Package, Store, Bike, MessageCircle } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import OneSignalInit from '@/components/notifications/OneSignalInit';
import NotificationPermission from '@/components/notifications/NotificationPermission';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import ReactPixel from 'react-facebook-pixel';
import SmartBottomNav from '@/components/navigation/SmartBottomNav';
import BusinessSmartNav from '@/components/navigation/BusinessSmartNav';
import { useAuth } from '@/components/auth/useAuth';
import CookieConsent from '@/components/cookies/CookieConsent';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import SessionValidator from '@/components/auth/SessionValidator';
import GA4Tracker from '@/components/tracking/GA4Tracker';
import OfflineIndicator from '@/components/offline/OfflineIndicator';
import ThemeProvider from '@/components/theme/ThemeProvider';
import { useServiceWorker } from '@/components/offline/useServiceWorker';
import { useCacheManager } from '@/components/offline/useCacheManager';

export default function Layout({ children, currentPageName }) {
  const { user, isLoading: loading } = useAuth();
  const [cookiesAccepted, setCookiesAccepted] = useState(false);

  useServiceWorker();
  useCacheManager(user);

  useEffect(() => {
    if (user && !user.current_profile && currentPageName !== 'ProfileSetup') {
      base44.auth.updateMe({
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
    const consent = localStorage.getItem('cookie_consent');
    if (consent) {
      const preferences = JSON.parse(consent);
      if (preferences.marketing || preferences.analytics) {
        setCookiesAccepted(true);
      }
    }
  }, []);

  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [currentPageName]);

  const handleCookieAccept = (preferences) => {
    setCookiesAccepted(true);
  };

  const handleCookieReject = () => {
    setCookiesAccepted(false);
  };

  const noNavPages = ['ProfileSetup', 'ManageProfiles', 'AdminValidation'];

  const { data: dbCartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const [guestCartCount, setGuestCartCount] = useState(0);

  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('guest_cart');
      if (stored) {
        try {
          const guestCart = JSON.parse(stored);
          const count = guestCart.reduce((sum, item) => sum + item.quantity, 0);
          setGuestCartCount(count);
        } catch (e) {
          setGuestCartCount(0);
        }
      }
    }
  }, [user]);

  const cartCount = user
    ? dbCartItems.reduce((sum, item) => sum + item.quantity, 0)
    : guestCartCount;

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ client_id: user?.id }),
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
        <meta name="theme-color" content="#232F3E" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rapido" />
        <link rel="alternate" hreflang="fr-HT" href="https://rapidopresto.shop" />
        <link rel="alternate" hreflang="fr" href="https://rapidopresto.shop" />
        <link rel="alternate" hreflang="x-default" href="https://rapidopresto.shop" />
        <link rel="dns-prefetch" href="https://qtrypzzcjebvfcihiynt.supabase.co" />
        <link rel="preconnect" href="https://qtrypzzcjebvfcihiynt.supabase.co" crossOrigin="anonymous" />
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
        <meta name="google-site-verification" content="INa9gqcSulkml5JtloQvw_k9lVR-AKcxha0eRYbvqoI" />
        <meta name="google-site-verification" content="TGLvYzGeMnDhLk5dxXLxm-_9a3zAAgAt-BBTDzQehUM" />
        <meta name="google-site-verification" content="google2665276976d944ab" />
        <script defer src="https://www.googletagmanager.com/gtag/js?id=G-JHEWLB2WTT"></script>
        <script defer>{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-JHEWLB2WTT');
        `}</script>
        <script defer>{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.defer=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TGFJJPR4');
        `}</script>
        <script defer>{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.defer=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TR6B9PMQ');
        `}</script>
        <script defer>{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.defer=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-P7C42MMP');
        `}</script>
        <script defer>{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;t.defer=true;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1346505637253912');
          fbq('track', 'PageView');
        `}</script>
        <noscript>{`
          <img height="1" width="1" style="display:none"
          src="https://www.facebook.com/tr?id=1346505637253912&ev=PageView&noscript=1" />
        `}</noscript>
        {cookiesAccepted && (
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>
        )}
      </Helmet>

      <noscript>
        <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TGFJJPR4" height="0" width="0" style={{display: 'none', visibility: 'hidden'}} />
      </noscript>
      <noscript>
        <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TR6B9PMQ" height="0" width="0" style={{display: 'none', visibility: 'hidden'}} />
      </noscript>
      <noscript>
        <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P7C42MMP" height="0" width="0" style={{display: 'none', visibility: 'hidden'}} />
      </noscript>

      <CookieConsent onAccept={handleCookieAccept} onReject={handleCookieReject} />

      <div className="min-h-screen bg-slate-50">
        <Toaster position="top-center" />
        <ThemeProvider />
        <OneSignalInit user={user} />
        <NotificationPermission />
        <InstallPrompt />
        <SessionValidator user={user} />
        <GA4Tracker />
        <OfflineIndicator />

        {user && !noNavPages.includes(currentPageName) && user.current_profile === 'client' && (
          <div className="fixed top-4 right-4 z-50">
            <ProfileSwitcher user={user} />
          </div>
        )}

        {children}

        {!noNavPages.includes(currentPageName) && (
          <SmartBottomNav
            cartCount={cartCount}
            activeOrdersCount={activeOrdersCount}
          />
        )}
      </div>
    </HelmetProvider>
  );
}