import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Search, Calendar } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['blog-articles'],
    queryFn: () => base44.entities.BlogArticle.filter({ is_published: true }, '-published_date', 100)
  });

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Blog - Rapido Presto | Articles, Conseils & Guides</title>
        <meta name="description" content="Découvrez nos articles de blog sur les produits de mariage, les tendances et les conseils d'experts." />
        <meta property="og:title" content="Blog - Rapido Presto" />
        <meta property="og:description" content="Articles et guides pour vos événements spéciaux" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-black mb-4">Notre Blog</h1>
            <p className="text-lg opacity-90">Conseils, inspirations et guides pour vos événements spéciaux</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>
          </div>

          {/* Articles Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">Aucun article trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/BlogArticle?slug=${article.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative aspect-video overflow-hidden bg-slate-200">
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors">
                      {article.title}
                    </h3>
                    
                    <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                      {article.excerpt || article.content.substring(0, 150)}
                    </p>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar size={14} />
                      {format(new Date(article.published_date), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}