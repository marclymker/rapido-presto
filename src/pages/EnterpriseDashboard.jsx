import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import { createPageUrl } from '@/utils';

export default function EnterpriseDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.current_profile !== 'entreprise') {
        const redirectPages = {
          client: 'Home',
          livreur: 'DriverDashboard'
        };
        window.location.href = createPageUrl(redirectPages[u.current_profile] || 'Home');
      }
    }).catch(() => {});
  }, []);

  const { data: myShop } = useQuery({
    queryKey: ['my-shop', user?.id],
    queryFn: async () => {
      const shops = await base44.entities.Shop.filter({ user_id: user.id });
      if (shops.length > 0) return shops[0];
      
      const entrepriseData = user.profiles?.entreprise || {};
      if (entrepriseData.is_active) {
        return base44.entities.Shop.create({
          user_id: user.id,
          company_name: entrepriseData.company_name,
          company_category: entrepriseData.company_category,
          company_logo_url: entrepriseData.company_logo_url,
          commune: user.commune,
          rating: entrepriseData.rating || 4.5,
          delivery_time_minutes: entrepriseData.delivery_time_minutes || 30,
          is_active: true
        });
      }
      return null;
    },
    enabled: !!user?.id
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['shop-orders', myShop?.id],
    queryFn: () => base44.entities.Order.filter({ shop_id: myShop?.id }, '-created_date'),
    enabled: !!myShop?.id
  });

  if (!user || user.current_profile !== 'entreprise') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  const entrepriseData = user.profiles?.entreprise || {};
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const menuItems = [
    { id: 'orders', label: 'Commandes', icon: '📦', badge: pendingOrders.length },
    { id: 'products', label: 'Mes Articles', icon: '🛍️' },
    { id: 'stats', label: 'Statistiques', icon: '📈' },
    { id: 'settings', label: 'Réglages', icon: '⚙️' },
    { id: 'account', label: 'Mon Compte', icon: '👤' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-1/5 min-w-[200px] bg-white border-r flex flex-col py-6 shadow-lg">
        <div className="px-6 mb-10">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter">RAPIDO PRESTO</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Dashboard Partenaire</p>
        </div>
        
        <nav className="flex-1 space-y-2 px-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold text-sm relative ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' 
                : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 pt-4 border-t space-y-2">
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden">
              {entrepriseData.company_logo_url ? (
                <img src={entrepriseData.company_logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-5 h-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-gray-800 truncate">{entrepriseData.company_name}</p>
              <p className="text-[10px] text-gray-500 truncate">{entrepriseData.company_category}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Switch checked={myShop?.is_active !== false} disabled />
              <span className="text-xs font-medium text-gray-700">
                {myShop?.is_active !== false ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>

          <div className="px-4">
            <ProfileSwitcher user={user} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-gray-800 mb-8">{menuItems.find(m => m.id === activeTab)?.label}</h2>
          
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-8xl mb-6">{menuItems.find(m => m.id === activeTab)?.icon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Section en construction</h3>
              <p className="text-gray-500 text-lg">
                Cette fonctionnalité sera disponible bientôt.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}