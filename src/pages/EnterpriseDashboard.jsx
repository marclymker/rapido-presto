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
      {/* SIDEBAR - ICÔNES UNIQUEMENT */}
      <aside className="w-[75px] bg-white border-r flex flex-col py-6 shadow-lg relative">
        <div className="px-4 mb-8">
          <div className="text-2xl text-center">🚀</div>
        </div>
        
        <nav className="flex-1 space-y-2 px-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex flex-col items-center justify-center py-4 rounded-xl transition-all relative group ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={item.label}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[9px] font-bold">{item.label.split(' ')[0]}</span>
              {item.badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {activeTab === item.id && (
                <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="px-2 pt-4 border-t space-y-3">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden mb-2">
              {entrepriseData.company_logo_url ? (
                <img src={entrepriseData.company_logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6 text-orange-500" />
              )}
            </div>
            <div className="text-center">
              <Switch 
                checked={myShop?.is_active !== false} 
                disabled 
                className="scale-75"
              />
            </div>
          </div>

          <div className="px-2">
            <ProfileSwitcher user={user} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT - PANE 2 */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 animate-fade-in">
          {/* Header de section */}
          <div className="mb-6">
            <h2 className="text-3xl font-black text-gray-900">{menuItems.find(m => m.id === activeTab)?.label}</h2>
            <p className="text-sm text-gray-500 mt-1">Gérez vos {menuItems.find(m => m.id === activeTab)?.label.toLowerCase()}</p>
          </div>
          
          {/* Content Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">{menuItems.find(m => m.id === activeTab)?.icon}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">Aujourd'hui</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Aucune donnée</h3>
              <p className="text-sm text-gray-500">Cette section sera bientôt disponible</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">Stats</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">0</h3>
              <p className="text-sm text-gray-500">Activités en cours</p>
            </div>

            {/* Card 3 - Full width */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-sm md:col-span-2 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Besoin d'aide ?</h3>
                  <p className="text-sm opacity-90">Consultez notre guide de démarrage</p>
                </div>
                <button className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
                  En savoir plus
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}