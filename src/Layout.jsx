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
        return [
          { icon: Store, label: 'Dashboard', page: 'EnterpriseDashboard' },
          { icon: User, label: 'Compte', page: 'EnterpriseAccount' },
        ];
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
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossorigin="anonymous"></script>
      </Helmet>
      <div className="min-h-screen bg-slate-50 pb-20">
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

      {/* Bottom Navigation */}
      {showNav && navItems.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="max-w-lg mx-auto flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors relative ${
                    isActive 
                      ? 'text-orange-500' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge className="absolute top-1 right-2 h-5 w-5 p-0 flex items-center justify-center bg-orange-500 text-white text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      </div>
    </HelmetProvider>
  );
}