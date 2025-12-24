import React from 'react';
import { Star, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ShopCard({ shop, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="h-32 bg-gradient-to-br from-orange-100 to-orange-50 relative overflow-hidden">
        {shop.company_logo_url ? (
          <img 
            src={shop.company_logo_url} 
            alt={shop.company_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-orange-300">
              {shop.company_name?.charAt(0) || 'E'}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-800 truncate">{shop.company_name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{shop.company_category}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{shop.rating?.toFixed(1) || '5.0'}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs">{shop.delivery_time_minutes || 30} min</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}