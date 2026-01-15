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
import WelcomeModal from '@/components/modals/WelcomeModal';
import { useAuth } from '@/components/auth/useAuth';
import CookieConsent from '@/components/cookies/CookieConsent';
import InstallPrompt from '@/components/pwa/InstallPrompt';

export default function Layout({ children, currentPageName }) {
  const { user, isLoading: loading } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState(false);

  useEffect(() => {
    // Show welcome modal if user has no profile set up
    if (user && !user.current_profile && currentPageName !== 'ProfileSetup') {
      setShowWelcomeModal(true);
    }
  }, [user, currentPageName]);

  useEffect(() => {
    // Check if cookies already accepted
    const consent = localStorage.getItem('cookie_consent');
    if (consent) {
      const preferences = JSON.parse(consent);
      if (preferences.marketing || preferences.analytics) {
        setCookiesAccepted(true);
        initializeTracking(preferences);
      }
    }
  }, []);

  const initializeTracking = (preferences) => {
    // Initialize Google Tag Manager if analytics cookies accepted
    if (preferences.analytics) {
      // GTM is already loaded in Helmet
    }
  };

  // Track page views with Meta Pixel on route changes
  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [currentPageName]);

  const handleCookieAccept = (preferences) => {
    setCookiesAccepted(true);
    initializeTracking(preferences);
  };

  const handleCookieReject = () => {
    setCookiesAccepted(false);
  };

  // Pages that don't need navigation
  const noNavPages = ['ProfileSetup', 'ManageProfiles', 'AdminValidation'];
  const showNav = !noNavPages.includes(currentPageName) && user;

  // Fetch cart count for badge
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Fetch active orders count
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ client_id: user?.id }),
    enabled: !!user?.id
  });

  const activeOrdersCount = orders.filter(o => 
    !['delivered', 'cancelled'].includes(o.status)
  ).length;

  // Fetch unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('chatService', { action: 'unread-count' });
      return response.data.unreadCount;
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  const getNavItems = () => {
    const currentProfile = user?.current_profile || user?.profiles?.client?.is_active ? 'client' : null;
    if (!currentProfile) return [];

    // Admin navigation
    if (user?.role === 'admin') {
      return [
        { icon: Home, label: 'Dashboard', page: 'AdminDashboard' },
        { icon: Store, label: 'Boutiques', page: 'AdminShops' },
        { icon: Package, label: 'Articles', page: 'AdminProducts' },
        { icon: User, label: 'Compte', page: 'Account' },
      ];
    }

    switch (currentProfile) {
      case 'client':
        return [
          { icon: Home, label: 'Accueil', page: 'Home' },
          { icon: ShoppingBag, label: 'Panier', page: 'Cart', badge: cartCount },
          { icon: Package, label: 'Commandes', page: 'Orders' },
          { icon: User, label: 'Compte', page: 'Account' },
        ];
      case 'entreprise':
        return [];
      case 'livreur':
        return [
          { icon: Bike, label: 'Dashboard', page: 'DriverDashboard' },
          { icon: User, label: 'Compte', page: 'DriverAccount' },
        ];
      case 'agent':
        return [];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
        <meta name="google-site-verification" content="INa9gqcSulkml5JtloQvw_k9lVR-AKcxha0eRYbvqoI" />

        {/* Google Tag Manager */}
        <script>{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TR6B9PMQ');
        `}</script>

        {/* Meta Pixel Code */}
        <script>{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
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
          <>
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>
          </>
        )}
        </Helmet>

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe 
          src="https://www.googletagmanager.com/ns.html?id=GTM-TR6B9PMQ"
          height="0" 
          width="0" 
          style={{display: 'none', visibility: 'hidden'}}
        />
      </noscript>

      {/* Cookie Consent Banner */}
      <CookieConsent 
        onAccept={handleCookieAccept}
        onReject={handleCookieReject}
      />

      <div className="min-h-screen bg-slate-50 pb-20">
        <Toaster position="top-center" />
        <OneSignalInit user={user} />
        <NotificationPermission />
        <InstallPrompt />
        
        {/* Welcome Modal for first-time users */}
        <WelcomeModal 
          user={user}
          open={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
      
      {/* Profile Switcher (top right for desktop - clients only) */}
      {user && !noNavPages.includes(currentPageName) && user.current_profile === 'client' && (
        <div className="fixed top-4 right-4 z-50">
          <ProfileSwitcher user={user} />
        </div>
      )}
      
      {children}

      {/* Smart Bottom Navigation - Client */}
      {user && !noNavPages.includes(currentPageName) && user.current_profile === 'client' && (
        <SmartBottomNav 
          cartCount={cartCount} 
          activeOrdersCount={activeOrdersCount}
        />
      )}

      {/* Business Smart Navigation - Entreprise, Livreur & Agent */}
      {user && !noNavPages.includes(currentPageName) && (user.current_profile === 'entreprise' || user.current_profile === 'livreur' || user.current_profile === 'agent') && currentPageName === 'Home' && (
        <BusinessSmartNav 
          userRole={user.current_profile}
        />
      )}
      </div>
    </HelmetProvider>
  );
}