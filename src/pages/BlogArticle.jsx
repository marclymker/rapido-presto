import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { Calendar, Share2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import ProductCard from '@/components/ui/ProductCard';
import { createPageUrl } from '@/utils';
import { getClientPrice } from '@/components/utils/priceCalculation';

export default function BlogArticle() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const slug = urlParams.get('slug');

  // Fetch article
  const { data: articles = [] } = useQuery({
    queryKey: ['blog-articles'],
    queryFn: () => base44.entities.BlogArticle.filter({ slug, status: 'published' })
  });

  const article = articles[0];

  // Fetch related products
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true })
  });

  const relatedProducts = useMemo(() => {
    if (!article?.related_products) return [];
    return allProducts.filter(p => article.related_products.includes(p.id)).slice(0, 6);
  }, [article, allProducts]);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Article non trouvé</h2>
          <Link to="/Blog">
            <Button className="mt-4">Retour au blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const seoDescription = article.seo_description || article.excerpt || article.content.substring(0, 160);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Helmet>
        <title>{article.title} | Blog Rapido Presto</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={article.cover_image} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={article.cover_image} />
        {article.seo_keywords?.length > 0 && (
          <meta name="keywords" content={article.seo_keywords.join(', ')} />
        )}
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/Blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au blog
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Cover Image */}
        <div className="aspect-video mb-8 rounded-lg overflow-hidden shadow-md">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <time dateTime={article.published_date}>
              {new Date(article.published_date).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          {article.author && <span>Par {article.author}</span>}
          <button className="flex items-center gap-2 hover:text-orange-600 transition-colors">
            <Share2 className="w-4 h-4" />
            Partager
          </button>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 leading-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Content */}
        <div className="prose prose-slate max-w-none mb-12">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-slate-900">{children}</h1>,
              h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-slate-800">{children}</h2>,
              p: ({ children }) => <p className="text-slate-700 mb-4 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-slate-700">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-slate-700">{children}</ol>,
              li: ({ children }) => <li className="mb-2">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-orange-500 pl-4 my-4 text-slate-600 italic">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-orange-600 hover:underline">
                  {children}
                </a>
              ),
              code: ({ inline, children }) => (
                inline ? (
                  <code className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-900">{children}</code>
                ) : (
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">
                    <code>{children}</code>
                  </pre>
                )
              )
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-slate-200 pt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Produits mentionnés dans cet article</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProducts.map((product) => {
                const shop = shops.find(s => s.id === product.shop_id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    shop={shop}
                    onClick={() => {
                      if (shop?.slug && product.slug) {
                        window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.slug}`;
                      }
                    }}
                    onAdd={() => {
                      base44.auth.redirectToLogin(window.location.pathname);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Découvrez notre boutique</h3>
          <p className="text-slate-600 mb-4">Trouvez les produits mentionnés dans cet article et bien d'autres.</p>
          <Link to="/">
            <Button className="bg-orange-600 hover:bg-orange-700">Voir tous les produits</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}