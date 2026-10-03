import React from 'react';
import { TrendingUp, Package, DollarSign, Users } from 'lucide-react';

export default function StatsSection({ orders = [] }) {
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  const stats = [
    {
      label: 'Revenus Total',
      value: `${totalRevenue.toFixed(0)} HTG`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      trend: '+12%'
    },
    {
      label: 'Commandes Total',
      value: totalOrders,
      icon: Package,
      color: 'bg-blue-100 text-blue-600',
      trend: '+8%'
    },
    {
      label: 'En Attente',
      value: pendingOrders,
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600',
      trend: `${pendingOrders} nouveau${pendingOrders > 1 ? 'x' : ''}`
    },
    {
      label: 'Livrées',
      value: completedOrders,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
      trend: 'Cette semaine'
    }
  ];

  return (
    <div className="p-8">
      <h2 className="text-2xl font-black mb-6 text-gray-900">Statistiques</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-green-600">{stat.trend}</span>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Graphique Placeholder */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Évolution des ventes</h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {[30, 45, 60, 40, 70, 55, 80].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-gray-400 font-medium">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}