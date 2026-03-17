import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { Calendar, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Blog() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['blog-articles'],
    queryFn: () => base44.entities.BlogArticle.filter({ status: 'published' }, '-published_date'),
    staleTime: 10 * 60 * 1000
  });

  const sortedArticles = React.useMemo(() => {
    return articles.sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
  }, [articles]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <Helmet>
        <title>Blog Rapido Presto - Conseils Mariage, Mode et Lifestyle</title>
        <meta name="description" content="Découvrez nos articles de blog sur la mode, les mariages, les fleurs et bien plus. Conseils, tendances et actualités." />
        <meta property="og:title" content="Blog Rapido Presto" />
        <meta property="og:description" content="Conseils et tendances pour vos événements et achats." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Blog Rapido</h1>
              <p className="text-slate-600 mt-2">Conseils, tendances et inspiration</p>
            </div>
            <Link to="/">
              <Button variant="outline">Retour à l'accueil</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-video bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Aucun article pour le moment</h2>
            <p className="text-slate-600">Les articles de blog seront bientôt disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedArticles.map((article) => (
              <Link
                key={article.id}
                to={`/BlogArticle?slug=${article.slug}`}
                className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Image */}
                <div className="aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={article.cover_image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <Calendar className="w-4 h-4" />
                    <time dateTime={article.published_date}>
                      {formatDistanceToNow(new Date(article.published_date), { locale: fr, addSuffix: true })}
                    </time>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {article.excerpt || article.content.substring(0, 150).replace(/[#*`]/g, '') + '...'}
                  </p>

                  {/* Button */}
                  <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm group-hover:gap-3 transition-all">
                    Lire l'article
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}