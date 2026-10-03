import React from 'react';
import { Check, Package, ChefHat, Bike, Home } from 'lucide-react';
import { cn } from "@/lib/utils";

const orderSteps = [
  { status: 'pending', label: 'Reçue', icon: Package },
  { status: 'preparing', label: 'En préparation', icon: ChefHat },
  { status: 'in_delivery', label: 'En livraison', icon: Bike },
  { status: 'delivered', label: 'Livrée', icon: Home }
];

const statusToStepIndex = {
  'pending': 0,
  'accepted': 0,
  'preparing': 1,
  'ready': 1,
  'searching_driver': 1,
  'driver_assigned': 2,
  'in_delivery': 2,
  'delivered': 3,
  'cancelled': -1
};

const estimatedTimes = {
  'pending': '5-10 min',
  'preparing': '15-25 min',
  'in_delivery': '10-20 min',
  'delivered': 'Terminé'
};

export default function OrderProgressBar({ status }) {
  const currentStepIndex = statusToStepIndex[status] || 0;
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 font-medium">Commande annulée</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200">
          <div
            className="h-full bg-orange-500 transition-all duration-500"
            style={{ width: `${(currentStepIndex / (orderSteps.length - 1)) * 100}%` }}
          />
        </div>

        <div className="relative flex justify-between">
          {orderSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <div key={step.status} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted && "bg-orange-500 border-orange-500 text-white",
                    isCurrent && "bg-white border-orange-500 text-orange-500 ring-4 ring-orange-100 scale-110",
                    isUpcoming && "bg-white border-slate-300 text-slate-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <p className={cn(
                  "text-xs mt-2 text-center font-medium",
                  isCurrent && "text-orange-500",
                  isCompleted && "text-slate-700",
                  isUpcoming && "text-slate-400"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-[10px] text-orange-400 mt-1 font-medium">
                    ~{estimatedTimes[status] || '...'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}