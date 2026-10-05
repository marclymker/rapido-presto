import React, { useState, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import { createPageUrl } from '@/utils';
import OrdersSection from '@/components/enterprise/OrdersSection';
import ProductsSection from '@/components/enterprise/ProductsSection';
import StatsSection from '@/components/enterprise/StatsSection';
import SettingsSection from '@/components/enterprise/SettingsSection';
import AccountSection from '@/components/enterprise/AccountSection';
import BusinessSmartNav from '@/components/navigation/BusinessSmartNav';
import PaymentLinkBuilder from '@/components/enterprise/PaymentLinkBuilder';

export default function EnterpriseDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    firebaseApi.auth.me().then(u => {
      setUser(u);
      if (!['marketplace', 'entreprise'].includes(u.current_profile)) {
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
      const shops = await firebaseApi.entities.Shop.filter({ user_id: user.id });
      if (shops.length > 0) return shops[0];

      // Create shop automatically with default values
      return firebaseApi.entities.Shop.create({
        user_id: user.id,
        company_name: user.profiles?.entreprise?.company_name || `Boutique ${user.full_name}`,
        company_category: user.profiles?.entreprise?.company_category || "Electronics",
        company_logo_url: user.profiles?.entreprise?.company_logo_url || '',
        region: user.region || '',
        rating: 4.5,
        delivery_time_minutes: 30,
        is_active: true
      });
    },
    enabled: !!user?.id
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['shop-orders', myShop?.id],
    queryFn: () => firebaseApi.entities.Order.filter({ shop_id: myShop?.id }, '-created_date'),
    enabled: !!myShop?.id
  });

  // Fetch self orders (commandes passées par le marchand lui-même)
  const { data: selfOrders = [] } = useQuery({
    queryKey: ['self-orders', user?.id],
    queryFn: () => firebaseApi.entities.Order.filter({ client_id: user?.id }, '-created_date'),
    enabled: !!user?.id
  });

  if (!user || !['marketplace', 'entreprise'].includes(user.current_profile)) {
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
    { id: 'selfOrders', label: 'Mes Achats', icon: '🛒' },
    { id: 'products', label: 'Mes Articles', icon: '🛍️' },
    { id: 'paylink', label: 'Lien Paiement', icon: '🔗' },
    { id: 'chat', label: 'Chat', icon: '💬', page: 'Chat' },
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
              onClick={() => {
                if (item.page) {
                  window.location.href = createPageUrl(item.page);
                } else {
                  setActiveTab(item.id);
                }
              }}
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
      <main className="flex-1 overflow-y-auto bg-gray-50 pb-32">
        <div className="animate-fade-in h-full">
          {activeTab === 'orders' && <OrdersSection orders={orders} onAddProduct={() => setActiveTab('products')} />}
          {activeTab === 'selfOrders' && <OrdersSection orders={selfOrders} onAddProduct={() => setActiveTab('products')} userType="client" isSelfOrders={true} />}
          {activeTab === 'products' && <ProductsSection shopId={myShop?.id} />}
          {activeTab === 'paylink' && <PaymentLinkBuilder shop={myShop} user={user} />}
          {activeTab === 'stats' && <StatsSection orders={orders} />}
          {activeTab === 'settings' && <SettingsSection shop={myShop} />}
          {activeTab === 'account' && <AccountSection user={user} shop={myShop} />}
        </div>
      </main>

      {/* Business Smart Navigation */}
      <BusinessSmartNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole="entreprise"
        pendingCount={pendingOrders.length}
      />
    </div>
  );
}
