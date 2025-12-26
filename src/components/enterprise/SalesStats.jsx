import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingBag, Star } from 'lucide-react';

export default function SalesStats({ orders, products }) {
  // Calculs statistiques
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const avgOrderValue = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;
  
  // Statistiques par période
  const today = new Date();
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate.toDateString() === today.toDateString();
  });
  
  const thisWeekOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    return orderDate >= weekAgo;
  });
  
  const thisMonthOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    return orderDate.getMonth() === today.getMonth() && 
           orderDate.getFullYear() === today.getFullYear();
  });

  const stats = [
    {
      title: "Revenus totaux",
      value: `${totalRevenue.toLocaleString()} HTG`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100"
    },
    {
      title: "Commandes totales",
      value: totalOrders,
      subtitle: `${deliveredOrders} livrées`,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-100"
    },
    {
      title: "Valeur moyenne",
      value: `${avgOrderValue.toFixed(0)} HTG`,
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-100"
    },
    {
      title: "Produits actifs",
      value: products.filter(p => p.is_available).length,
      subtitle: `sur ${products.length}`,
      icon: Star,
      color: "text-purple-600",
      bg: "bg-purple-100"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Cartes statistiques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-1 truncate">{stat.title}</p>
                    <p className="text-base sm:text-lg font-bold text-slate-800 truncate">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistiques par période */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance par période</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-slate-50 rounded-lg">
              <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Aujourd'hui</p>
              <p className="text-lg sm:text-xl font-bold text-slate-800">{todayOrders.length}</p>
              <p className="text-[10px] sm:text-xs text-slate-400">commandes</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Cette semaine</p>
              <p className="text-xl font-bold text-slate-800">{thisWeekOrders.length}</p>
              <p className="text-xs text-slate-400">commandes</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Ce mois</p>
              <p className="text-xl font-bold text-slate-800">{thisMonthOrders.length}</p>
              <p className="text-xs text-slate-400">commandes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produits les plus vendus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produits les plus vendus</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const productSales = {};
            orders.filter(o => o.status === 'delivered').forEach(order => {
              order.items?.forEach(item => {
                if (!productSales[item.product_id]) {
                  productSales[item.product_id] = {
                    name: item.name,
                    quantity: 0,
                    revenue: 0
                  };
                }
                productSales[item.product_id].quantity += item.quantity;
                productSales[item.product_id].revenue += item.total;
              });
            });

            const topProducts = Object.values(productSales)
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 5);

            return topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((product, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium text-slate-700">{product.name}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{product.quantity} vendus</p>
                      <p className="text-xs text-slate-500">{product.revenue} HTG</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Aucune vente encore</p>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}