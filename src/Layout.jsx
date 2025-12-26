import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Home, ShoppingBag, User, Package, Store, Bike } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import OneSignalInit from '@/components/notifications/OneSignalInit';
import NotificationPermission from '@/components/notifications/NotificationPermission';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import ReactPixel from 'react-facebook-pixel';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Initialize Meta Pixel
  useEffect(() => {
    ReactPixel.init('1346505637253912');
    ReactPixel.pageView();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    ReactPixel.pageView();
  }, [currentPageName]);

  // Pages that don't need navigation
  const noNavPages = ['ProfileSetup', 'ManageProfiles', 'AdminValidation'];
  const showNav = !noNavPages.includes(currentPageName) && user;

  // Fetch cart count for badge
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id && user?.current_profile === 'client'
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getNavItems = () => {
    const currentProfile = user?.current_profile || user?.profiles?.client?.is_active ? 'client' : null;
    if (!currentProfile) return [];

    // Admin navigation
    if (user?.role === 'admin') {
      return [
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
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>
      </Helmet>
      <div className="min-h-screen bg-slate-50">
        <Toaster position="top-center" />
        <OneSignalInit user={user} />
        <NotificationPermission />
      
      {/* Profile Switcher (top right for desktop - clients only) */}
      {user && !noNavPages.includes(currentPageName) && user.current_profile === 'client' && (
        <div className="fixed top-4 right-4 z-50">
          <ProfileSwitcher user={user} />
        </div>
      )}
      
      {children}


      </div>
    </HelmetProvider>
  );
}