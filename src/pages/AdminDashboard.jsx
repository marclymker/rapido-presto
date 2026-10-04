import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Store, DollarSign, ShoppingCart, ArrowLeft, CheckCircle, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch all data
  const { data: orders = [] } = useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100)
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['admin-all-shops'],
    queryFn: () => base44.entities.Shop.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-all-products'],
    queryFn: () => base44.entities.Product.list('-created_date')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: user?.role === 'admin'
  });

  const { data: agentClients = [] } = useQuery({
    queryKey: ['admin-agent-clients'],
    queryFn: () => base44.entities.AgentClient.list('-created_date')
  });

  // Filter agents
  const agents = allUsers.filter(u => u.profiles?.agent?.is_active);

  // Stats
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    totalShops: shops.filter(s => s.is_active).length,
    totalProducts: products.filter(p => p.is_available !== false).length,
    totalAgents: agents.length,
    totalCommissions: agentClients.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
    claimedCommissions: agentClients.filter(c => c.commission_claimed).reduce((sum, c) => sum + c.commission_amount, 0)
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Accès réservé aux administrateurs</p>
          <Button className="mt-4" onClick={() => window.location.href = createPageUrl('Home')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-slate-900">Admin Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Commandes</p>
                <p className="text-xl font-black">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Revenus</p>
                <p className="text-xl font-black">{(stats.totalRevenue / 1000).toFixed(0)}k</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Boutiques</p>
                <p className="text-xl font-black">{stats.totalShops}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Produits</p>
                <p className="text-xl font-black">{stats.totalProducts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white">
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="products">Articles</TabsTrigger>
            <TabsTrigger value="shops">Boutiques</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
          </TabsList>

          {/* Orders */}
          <TabsContent value="orders" className="mt-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="font-bold text-lg mb-4">Toutes les commandes ({orders.length})</h2>
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="border-b pb-3 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm">#{order.order_number}</p>
                      <p className="text-xs text-slate-600">{order.client_name}</p>
                      <p className="text-xs text-slate-500">{order.shop_name}</p>
                      <p className="font-black text-sm mt-1">{order.total?.toLocaleString()} HTG</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {order.status}
                      </Badge>
                      <p className="text-xs text-slate-500">
                        {new Date(order.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Agents */}
          <TabsContent value="agents" className="mt-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="font-bold text-lg mb-4">Tous les agents ({agents.length})</h2>
              <div className="space-y-3">
                {agents.map(agent => {
                  const agentSales = agentClients.filter(c => c.agent_id === agent.id);
                  const totalSales = agentSales.reduce((sum, c) => sum + c.order_total, 0);
                  const totalCommission = agentSales.reduce((sum, c) => sum + c.commission_amount, 0);
                  
                  return (
                    <div key={agent.id} className="border-b pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold">{agent.full_name}</p>
                          <p className="text-xs text-slate-600">{agent.email}</p>
                          <p className="text-xs text-slate-500">{agent.profiles?.agent?.phone}</p>
                          <div className="flex gap-4 mt-2">
                            <div>
                              <p className="text-xs text-slate-500">Clients</p>
                              <p className="font-bold text-sm">{agentSales.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Ventes</p>
                              <p className="font-bold text-sm">{totalSales.toLocaleString()} HTG</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Commissions</p>
                              <p className="font-bold text-sm text-green-600">{totalCommission.toLocaleString()} HTG</p>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700">Agent</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="mt-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Tous les articles ({products.length})</h2>
                <Link to={createPageUrl('AdminProducts')}>
                  <Button className="bg-orange-500 hover:bg-orange-600 gap-2">
                    <Package className="w-4 h-4" />
                    Gérer / Ajout en masse
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map(product => (
                  <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-slate-50">
                      {product.image_url ? (
                        <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">📦</div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      <p className="text-xs text-slate-600">{product.shop_name}</p>
                      <p className="font-bold text-sm text-orange-600 mt-1">{product.price?.toLocaleString()} HTG</p>
                      <Badge className={`text-xs mt-1 ${
                        product.is_available !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.is_available !== false ? 'Disponible' : 'Épuisé'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Shops */}
          <TabsContent value="shops" className="mt-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="font-bold text-lg mb-4">Toutes les boutiques ({shops.length})</h2>
              <div className="space-y-3">
                {shops.map(shop => {
                  const shopProducts = products.filter(p => p.shop_id === shop.id);
                  const shopOrders = orders.filter(o => o.shop_id === shop.id);
                  const shopRevenue = shopOrders.reduce((sum, o) => sum + o.total, 0);
                  
                  return (
                    <div key={shop.id} className="border-b pb-3 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                        {shop.company_logo_url ? (
                          <img src={shop.company_logo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Store className="w-full h-full p-2 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold">{shop.company_name}</p>
                            <p className="text-xs text-slate-600">{shop.company_category} • {shop.region}</p>
                            <div className="flex gap-4 mt-2">
                              <div>
                                <p className="text-xs text-slate-500">Produits</p>
                                <p className="font-bold text-sm">{shopProducts.length}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Commandes</p>
                                <p className="font-bold text-sm">{shopOrders.length}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Revenus</p>
                                <p className="font-bold text-sm">{shopRevenue.toLocaleString()} HTG</p>
                              </div>
                            </div>
                          </div>
                          <Badge className={shop.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {shop.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Commissions */}
          <TabsContent value="commissions" className="mt-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Toutes les commissions</h2>
                <div className="flex gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Commissions</p>
                    <p className="font-black text-green-600">{stats.totalCommissions.toLocaleString()} HTG</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Réclamées</p>
                    <p className="font-black text-purple-600">{stats.claimedCommissions.toLocaleString()} HTG</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {agentClients.map(client => {
                  const agent = allUsers.find(u => u.id === client.agent_id);
                  
                  return (
                    <div key={client.id} className="border-b pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm">{client.full_name}</p>
                          <p className="text-xs text-slate-600">Agent: {agent?.full_name || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{client.event_type}</p>
                          <div className="flex gap-4 mt-2">
                            <div>
                              <p className="text-xs text-slate-500">Total</p>
                              <p className="font-bold text-sm">{client.order_total?.toLocaleString()} HTG</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Commission</p>
                              <p className="font-bold text-sm text-green-600">{client.commission_amount?.toLocaleString()} HTG</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={
                            client.status === 'Terminée' ? 'bg-green-100 text-green-700' :
                            client.status === 'Annulée' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {client.status}
                          </Badge>
                          {client.commission_claimed ? (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Réclamée
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              Non réclamée
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          <Link to={createPageUrl('AllOrdersAdmin')}>
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <ShoppingCart className="w-6 h-6 mb-1" />
              <span className="text-xs">Gérer Commandes</span>
            </Button>
          </Link>
          <Link to={createPageUrl('AdminShops')}>
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <Store className="w-6 h-6 mb-1" />
              <span className="text-xs">Gérer Boutiques</span>
            </Button>
          </Link>
          <Link to={createPageUrl('AdminProducts')}>
            <Button variant="outline" className="w-full h-20 flex flex-col">
              <Package className="w-6 h-6 mb-1" />
              <span className="text-xs">Gérer Articles</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}