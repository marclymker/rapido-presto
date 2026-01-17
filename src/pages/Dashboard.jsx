import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OrdersSection from '@/components/enterprise/OrdersSection';
import ProductsSection from '@/components/enterprise/ProductsSection';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('commandes');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  // Fetch user's shop (create if doesn't exist)
  const { data: myShop } = useQuery({
    queryKey: ['my-shop', user?.id],
    queryFn: async () => {
      const shops = await base44.entities.Shop.filter({ user_id: user.id });
      if (shops.length > 0) return shops[0];
      
      // Create shop automatically
      return base44.entities.Shop.create({
        user_id: user.id,
        company_name: `Boutique ${user.full_name}`,
        company_category: "Electronics",
        region: user.region || '',
        rating: 4.5,
        delivery_time_minutes: 30,
        is_active: true
      });
    },
    enabled: !!user?.id
  });

  // Fetch orders received (for shop)
  const { data: receivedOrders = [] } = useQuery({
    queryKey: ['shop-orders', myShop?.id],
    queryFn: () => base44.entities.Order.filter({ shop_id: myShop?.id }, '-created_date'),
    enabled: !!myShop?.id
  });

  // Fetch orders placed (as client)
  const { data: placedOrders = [] } = useQuery({
    queryKey: ['client-orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ client_id: user?.id }, '-created_date'),
    enabled: !!user?.id
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const allOrders = [...receivedOrders, ...placedOrders];
  const pendingReceivedOrders = receivedOrders.filter(o => o.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <Button 
              onClick={() => setActiveTab('produits')}
              className="bg-orange-500 hover:bg-orange-600 gap-2"
            >
              <Plus className="w-4 h-4" />
              Publier un produit
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="commandes" className="flex-1 gap-2">
              <Package className="w-4 h-4" />
              Commandes ({allOrders.length})
              {pendingReceivedOrders.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  {pendingReceivedOrders.length} nouvelle{pendingReceivedOrders.length > 1 ? 's' : ''}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="produits" className="flex-1">
              Mes Produits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="commandes" className="mt-4">
            <div className="space-y-6">
              {/* Commandes reçues */}
              {receivedOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 text-slate-800">Commandes reçues</h2>
                  <OrdersSection orders={receivedOrders} userType="merchant" />
                </div>
              )}

              {/* Commandes passées */}
              {placedOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 text-slate-800">Mes achats</h2>
                  <OrdersSection orders={placedOrders} userType="client" />
                </div>
              )}

              {allOrders.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500">Aucune commande</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="produits" className="mt-4">
            <ProductsSection shopId={myShop?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}