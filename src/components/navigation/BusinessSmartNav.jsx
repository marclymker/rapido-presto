import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Package, Store, Bike, TrendingUp, User } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function BusinessSmartNav({ activeTab, setActiveTab, userRole, pendingCount = 0 }) {
  const navigate = useNavigate();

  const navItems = userRole === 'entreprise' ? [
    { id: 'orders', label: 'Commandes', icon: Package, badge: pendingCount, page: 'EnterpriseDashboard' },
    { id: 'products', label: 'Articles', icon: Store, page: 'EnterpriseDashboard' },
    { id: 'stats', label: 'Stats', icon: TrendingUp, page: 'EnterpriseDashboard' },
    { id: 'home', label: 'Catalogue', icon: Home, external: true }
  ] : userRole === 'agent' ? [
    { id: 'dashboard', label: 'Dashboard', icon: Home, page: 'AgentDashboard' },
    { id: 'clients', label: 'Clients', icon: Package, page: 'AgentClients' },
    { id: 'commissions', label: 'Commissions', icon: TrendingUp, page: 'AgentCommissions' },
    { id: 'account', label: 'Compte', icon: User, page: 'AgentAccount' }
  ] : [
    { id: 'available', label: 'Disponibles', icon: Package, page: 'DriverDashboard' },
    { id: 'active', label: 'En cours', icon: Bike, page: 'DriverDashboard' },
    { id: 'home', label: 'Catalogue', icon: Home, external: true }
  ];

  const handleNavClick = (item) => {
    if (setActiveTab) {
      setActiveTab(item.id);
    } else if (item.page) {
      navigate(createPageUrl(item.page));
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-50 safe-bottom"
      style={{ boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)' }}
    >
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          if (item.external) {
            return (
              <Link
                key={item.id}
                to={createPageUrl('Home')}
                className="flex flex-col items-center justify-center flex-1 gap-1"
              >
                <div className={`p-2 rounded-2xl transition-all ${
                  active ? 'bg-orange-50 text-orange-600 scale-110' : 'text-gray-400'
                }`}>
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-black tracking-tight uppercase ${
                  active ? 'text-orange-600' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className="flex flex-col items-center justify-center flex-1 gap-1 relative"
            >
              <div className={`p-2 rounded-2xl transition-all relative ${
                active ? 'bg-blue-50 text-blue-600 scale-110' : 'text-gray-400'
              }`}>
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                {item.badge > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] border-2 border-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] font-black tracking-tight uppercase ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}