import React from 'react';
import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Acceptée', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'En préparation', color: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Prête', color: 'bg-indigo-100 text-indigo-700' },
  searching_driver: { label: 'Recherche livreur', color: 'bg-orange-100 text-orange-700' },
  driver_assigned: { label: 'Livreur assigné', color: 'bg-cyan-100 text-cyan-700' },
  in_delivery: { label: 'En livraison', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-700' };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
      config.color
    )}>
      {config.label}
    </span>
  );
}