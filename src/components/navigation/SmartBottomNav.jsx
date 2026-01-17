import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Package, User, MessageCircle, ShoppingBag } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SmartBottomNav({ cartCount = 0, activeOrdersCount = 0 }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Fetch unread messages
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('chatService', { action: 'unread-count' });
        return response.data.unreadCount;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000
  });

  const navItems = [
    { 
      id: 'home', 
      label: 'Accueil', 
      icon: Home, 
      page: 'Home'
    },
    { 
      id: 'chat', 
      label: 'Chat', 
      icon: MessageCircle, 
      page: 'Chat',
      badge: unreadCount
    },
    { 
      id: 'cart', 
      label: 'Panier', 
      icon: ShoppingBag, 
      page: 'Cart',
      badge: cartCount
    },
    { 
      id: 'dashboard', 
      label: 'Boutique', 
      icon: Package, 
      page: 'Dashboard',
      badge: activeOrdersCount
    },
    { 
      id: 'account', 
      label: 'Compte', 
      icon: User, 
      page: 'Account'
    }
  ];

  const isActive = (page) => {
    return location.pathname.includes(page.toLowerCase());
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 transition-transform duration-300 safe-bottom z-50 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.page);
          
          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              className="flex flex-col items-center justify-center w-full h-full gap-1 group relative"
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 transition-all ${
                    active 
                      ? 'text-orange-500 scale-110' 
                      : 'text-gray-400 group-active:scale-90'
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.badge > 0 && (
                  <Badge className="absolute -top-1 -right-2 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] border-2 border-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span 
                className={`text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  active ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-orange-500 rounded-full"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}