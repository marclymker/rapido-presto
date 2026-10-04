import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet-async';

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['blog-articles'],
    queryFn: () => base44.entities.BlogArticle.filter({ is_published: true }, '-published_date', 50)
  });

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.excerpt?.toLowerCase().includes(query) ||
      a.seo_keywords?.some(k => k.toLowerCase().includes(query))
    );
  }, [articles, searchQuery]);

  return (
    <>
      <Helmet>
        <title>Blog - Rapido Presto | Articles Mariage, Mode & Décoration</title>
        <meta name="description" content="Découvrez nos articles de blog sur les tendances mariage, conseils mode, décoration et shopping en Haïti." />
        <meta property="og:title" content="Blog - Rapido Presto" />
        <meta property="og:description" content="Articles, conseils et guides pour votre mariage, mode et décoration." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog Rapido Presto</h1>
            <p className="text-lg text-slate-300">Découvrez nos articles sur les tendances mariage, mode, décoration et shopping.</p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-base"
            />
          </div>
        </div>

        {/* Articles Grid */}
        <main className="max-w-6xl mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow animate-pulse">
                  <div className="w-full h-48 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">Aucun article trouvé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map(article => (
                <Link
                  key={article.id}
                  to={`/BlogArticle?slug=${article.slug}`}
                  className="group bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={`${article.cover_image_url}${article.cover_image_url?.includes('?') ? '&' : '?'}w=500&h=300&fit=cover`}
                      alt={article.cover_image_alt || article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <Calendar className="w-4 h-4" />
                      <time>{format(new Date(article.published_date), 'd MMM yyyy', { locale: fr })}</time>
                    </div>
                    
                    <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-orange-600">
                      {article.title}
                    </h2>
                    
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm">
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
    </>
  );
}