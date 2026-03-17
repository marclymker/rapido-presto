import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar, User, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import ProductCard from '@/components/ui/ProductCard';

export default function BlogArticle() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('slug');
  const [article, setArticle] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['blog-articles'],
    queryFn: () => base44.entities.BlogArticle.filter({ slug: slug, is_published: true })
  });

  // Charger les produits liés
  useEffect(() => {
    if (articles.length > 0) {
      const currentArticle = articles[0];
      setArticle(currentArticle);

      // Charger les produits
      if (currentArticle.related_products && currentArticle.related_products.length > 0) {
        base44.entities.Product.filter({ id: { $in: currentArticle.related_products } })
          .then(setRelatedProducts)
          .catch(err => console.error('Erreur chargement produits:', err));
      }
    }
  }, [articles]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 text-lg">Article non trouvé</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - Rapido Presto</title>
        <meta name="description" content={article.seo_description || article.excerpt} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.seo_description || article.excerpt} />
        <meta property="og:image" content={article.cover_image} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={article.published_date} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={article.title} />
        <meta property="twitter:description" content={article.seo_description || article.excerpt} />
        <meta property="twitter:image" content={article.cover_image} />
      </Helmet>

      <article className="min-h-screen bg-white">
        {/* Hero Image */}
        <div className="w-full h-96 md:h-[500px] overflow-hidden">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* Article Header */}
          <div className="mb-12 border-b pb-8">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              {article.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-slate-500 text-sm">
              {article.author && (
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>{article.author}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{format(new Date(article.published_date), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="prose prose-lg prose-slate max-w-none mb-16">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-slate-900" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-slate-900" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2 text-slate-800" {...props} />,
                p: ({ node, ...props }) => <p className="text-slate-700 leading-relaxed mb-4" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="text-purple-600 hover:text-purple-700 font-medium underline" {...props} />
                ),
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4" {...props} />,
                li: ({ node, ...props }) => <li className="text-slate-700" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-purple-600 pl-4 py-2 my-4 italic text-slate-600 bg-slate-50 rounded" {...props} />
                ),
                code: ({ node, inline, ...props }) => 
                  inline ? 
                    <code className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-800" {...props} /> :
                    <code className="block bg-slate-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="border-t pt-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ShoppingBag size={28} className="text-purple-600" />
                Produits mentionnés dans cet article
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    shop={{ company_name: product.shop_name }}
                    onViewDetails={() => {
                      window.location.href = `/ShopView?product=${product.slug || product.id}`;
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="mt-12 pt-8 border-t text-center">
            <a
              href="/Blog"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              <LinkIcon size={16} />
              Retour au blog
              <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </article>
    </>
  );
}

import { ShoppingBag } from 'lucide-react';