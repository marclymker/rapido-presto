import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CreditBanner() {
  return (
    <Link to={createPageUrl('Pricing')}>
      <div className="mx-4 my-2 p-4 bg-white border rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg flex items-center justify-center text-xl">
            💳
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">Rapido Premium</h4>
            <p className="text-xs text-slate-500">Profitez d'avantages exclusifs</p>
          </div>
        </div>
        <span className="text-slate-400 text-xl">›</span>
      </div>
    </Link>
  );
}
