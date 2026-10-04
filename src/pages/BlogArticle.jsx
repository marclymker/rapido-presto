import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import ProductCard from '@/components/ui/ProductCard';

export default function BlogArticle() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const slug = urlParams.get('slug');

  const { data: articles = [] } = useQuery({
    queryKey: ['blog-articles'],
    queryFn: () => base44.entities.BlogArticle.filter({ is_published: true })
  });

  const article = useMemo(() => {
    return articles.find(a => a.slug === slug);
  }, [articles, slug]);

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 100)
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }, '-created_date', 60)
  });

  const relatedProducts = useMemo(() => {
    if (!article?.related_products) return [];
    return article.related_products
      .map(productId => allProducts.find(p => p.id === productId))
      .filter(Boolean)
      .slice(0, 6);
  }, [article, allProducts]);

  const handleShare = () => {
    const url = window.location.href;
    const title = article?.title || 'Article Kairos';

    if (navigator.share) {
      navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié!');
    }
  };

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 pb-20">
        <p className="text-slate-500 mb-4">Article non trouvé</p>
        <Button onClick={() => navigate('/Blog')}>Retour au blog</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - Blog Kairos</title>
        <meta name="description" content={article.seo_description || article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.seo_description || article.excerpt} />
        <meta property="og:image" content={article.cover_image_url} />
        <meta property="og:image:alt" content={article.cover_image_alt || article.title} />
        <meta property="og:url" content={window.location.href} />
        <meta property="article:published_time" content={article.published_date} />
        <meta property="article:author" content={article.author || 'Kairos'} />
        {article.seo_keywords?.map(keyword => (
          <meta key={keyword} name="keywords" content={keyword} />
        ))}
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-white pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/Blog')}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-4 py-12">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-8 pb-8 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <time>{format(new Date(article.published_date), 'd MMMM yyyy', { locale: fr })}</time>
            </div>
            <span>Par {article.author || 'Kairos'}</span>
          </div>

          {/* Cover Image */}
          {article.cover_image_url && (
            <figure className="mb-12">
              <img
                src={`${article.cover_image_url}${article.cover_image_url?.includes('?') ? '&' : '?'}w=800&q=85`}
                alt={article.cover_image_alt || article.title}
                className="w-full h-auto rounded-lg shadow-lg"
              />
              {article.cover_image_alt && (
                <figcaption className="text-sm text-slate-500 text-center mt-2">
                  {article.cover_image_alt}
                </figcaption>
              )}
            </figure>
          )}

          {/* Article Body */}
          <div className="prose prose-lg max-w-none mb-12">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-slate-900">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-slate-900">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold mt-4 mb-2 text-slate-900">{children}</h3>,
                p: ({ children }) => <p className="text-slate-700 leading-relaxed mb-4">{children}</p>,
                a: ({ children, href }) => (
                  <a href={href} className="text-orange-600 hover:text-orange-700 font-semibold" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-slate-700">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-700">{children}</ol>,
                li: ({ children }) => <li className="text-slate-700">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-orange-500 pl-4 py-2 my-4 bg-slate-50 italic text-slate-600">
                    {children}
                  </blockquote>
                ),
                img: ({ src, alt }) => (
                  <img
                    src={`${src}${src?.includes('?') ? '&' : '?'}w=800&q=85`}
                    alt={alt}
                    className="w-full h-auto rounded-lg my-4 shadow"
                  />
                )
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-16 pt-12 border-t">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Produits mentionnés dans cet article
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedProducts.map(product => {
                  const shop = shops.find(s => s.id === product.shop_id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      shop={shop}
                      hideId={true}
                      onAdd={() => {
                        base44.auth.redirectToLogin(window.location.pathname);
                      }}
                      onClick={() => {
                        if (shop?.slug && product.id) {
                          window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.id}`;
                        } else {
                          window.location.href = createPageUrl('ShopView') + `?slug=${shop?.slug}`;
                        }
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </article>
      </div>
    </>
  );
}
