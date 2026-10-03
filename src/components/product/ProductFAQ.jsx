import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebase } from '@/api/firebaseClient';
import { ChevronDown } from 'lucide-react';

export default function ProductFAQ({ product, shop }) {
  const [openIdx, setOpenIdx] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['faq', product?.id],
    queryFn: () => firebase.functions.invoke('generateProductFAQ', {
      product_name: product.name,
      description: product.description,
      category: product.category,
      shop_name: shop?.company_name,
      delivery_time: product.delivery_time,
    }).then(r => r.data),
    enabled: !!product?.id,
    staleTime: 60 * 60 * 1000, // 1h — évite de régénérer à chaque visite
    gcTime: 2 * 60 * 60 * 1000,
  });

  const faqs = data?.faqs || [];

  if (isLoading) return (
    <div className="bg-white mt-2 px-4 py-4 shadow-sm">
      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-3" />
      {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg mb-2 animate-pulse" />)}
    </div>
  );

  if (!faqs.length) return null;

  // JSON-LD FAQPage pour SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer }
    }))
  };

  return (
    <div className="bg-white mt-2 px-4 py-4 shadow-sm">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <h2 className="text-sm font-bold text-gray-900 mb-3">Questions fréquentes</h2>
      <div className="space-y-1.5">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
            >
              <span className="flex-1 pr-2 leading-snug">{faq.question}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`} />
            </button>
            {openIdx === i && (
              <div className="px-3 pb-3 text-xs text-gray-600 leading-relaxed border-t border-gray-50 pt-2">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}