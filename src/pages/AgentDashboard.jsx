import React, { useState, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Package, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProductCard from '@/components/ui/ProductCard';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    firebaseApi.auth.me().then(setUser).catch(() => {});
  }, []);

  // Stats
  const { data: myClients = [] } = useQuery({
    queryKey: ['agent-clients', user?.id],
    queryFn: () => firebaseApi.entities.AgentClient.filter({ agent_id: user?.id }),
    enabled: !!user?.id
  });

  const totalClients = myClients.length;
  const totalOrders = myClients.reduce((sum, c) => sum + c.order_total, 0);
  const totalCommission = myClients
    .filter(c => c.status === 'Terminée' && !c.commission_claimed)
    .reduce((sum, c) => sum + c.commission_amount, 0);

  // Produits Makarios Bridal uniquement
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => firebaseApi.entities.Shop.filter({ is_active: true })
  });

  const makariosShop = shops.find(s =>
    s.company_name?.toLowerCase().includes('makarios')
  );

  const { data: products = [] } = useQuery({
    queryKey: ['makarios-products', makariosShop?.id],
    queryFn: () => firebaseApi.entities.Product.filter({
      shop_id: makariosShop?.id,
      is_available: true
    }),
    enabled: !!makariosShop?.id
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Dashboard Agent</h1>
        <p className="text-slate-600">Bienvenue, {user?.full_name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Clients</p>
              <p className="text-xl font-black text-slate-900">{totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Ventes</p>
              <p className="text-xl font-black text-slate-900">{totalOrders.toLocaleString()} HTG</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Commissions</p>
              <p className="text-xl font-black text-slate-900">{totalCommission.toLocaleString()} HTG</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">En cours</p>
              <p className="text-xl font-black text-slate-900">
                {myClients.filter(c => c.status === 'En cours').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link to={createPageUrl('AgentClients')}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Users className="w-4 h-4 mr-2" />
            Mes Clients
          </Button>
        </Link>
        <Link to={createPageUrl('AgentCommissions')}>
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <DollarSign className="w-4 h-4 mr-2" />
            Commissions
          </Button>
        </Link>
        <Link to={createPageUrl('AgentAccount')}>
          <Button className="w-full bg-slate-600 hover:bg-slate-700">
            Mon Compte
          </Button>
        </Link>
      </div>

      {/* Catalogue Makarios Bridal */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {makariosShop ? makariosShop.company_name : 'Catalogue Produits'}
          </h2>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {products.length} articles
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map(product => (
            <div key={product.id} className="relative">
              <ProductCard
                product={product}
                shop={makariosShop}
                onAdd={() => toast.info('Ajoutez ce produit à une commande client')}
                onClick={() => toast.info('Consultez les détails dans "Mes Clients"')}
              />
              <div className="absolute top-2 left-2 bg-purple-600 text-white text-[8px] font-bold px-2 py-0.5 rounded z-10">
                MAKARIOS
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
