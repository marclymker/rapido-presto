import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BlogArticleForm from '@/components/blog/BlogArticleForm';

export default function BlogManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const handleShareToSocial = async (article) => {
    setPublishingId(article.id);
    try {
      const res = await base44.functions.invoke('publishBlogToSocial', { articleId: article.id });
      const data = res.data;
      if (data.success) {
        const fb = data.results?.facebook?.success ? '✅ Facebook' : `❌ Facebook: ${data.results?.facebook?.error}`;
        const ig = data.results?.instagram?.success ? '✅ Instagram' : `❌ Instagram: ${data.results?.instagram?.error}`;
        toast.success(`Publié! ${fb} | ${ig}`);
        queryClient.invalidateQueries(['blog-articles-all']);
      } else {
        toast.error(data.error || 'Erreur de publication');
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setPublishingId(null);
    }
  };

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['blog-articles-all'],
    queryFn: () => base44.entities.BlogArticle.list('-created_date', 100)
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogArticle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['blog-articles-all']);
      toast.success('Article supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression')
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }) => 
      base44.entities.BlogArticle.update(id, { is_published: !isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries(['blog-articles-all']);
      toast.success('Statut mis à jour');
    }
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingArticle(null);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries(['blog-articles-all']);
    handleCloseForm();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Gestion du Blog</h1>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvel article
          </Button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border">
            <p className="text-slate-500 mb-4">Aucun article créé pour l'instant</p>
            <Button onClick={() => setShowForm(true)} className="bg-orange-600">
              Créer votre premier article
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {articles.map(article => (
              <div
                key={article.id}
                className="bg-white rounded-lg border p-6 flex items-start gap-6 hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                {article.cover_image_url && (
                  <div className="w-24 h-24 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                    <img
                      src={`${article.cover_image_url}?w=100&h=100&fit=cover`}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-lg font-bold text-slate-900 line-clamp-1">
                      {article.title}
                    </h2>
                    <Badge variant={article.is_published ? "default" : "outline"}>
                      {article.is_published ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {article.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>Créé: {format(new Date(article.created_date), 'd MMM yyyy', { locale: fr })}</span>
                    {article.published_date && (
                      <span>Publié: {format(new Date(article.published_date), 'd MMM yyyy', { locale: fr })}</span>
                    )}
                    {article.related_products?.length > 0 && (
                      <span>{article.related_products.length} produit(s) lié(s)</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingArticle(article);
                      setShowForm(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublishMutation.mutate({
                      id: article.id,
                      isPublished: article.is_published
                    })}
                  >
                    {article.is_published ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>

                  <Link to={`/BlogArticle?slug=${article.slug}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      Voir
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Êtes-vous sûr?')) {
                        deleteArticleMutation.mutate(article.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <BlogArticleForm
          article={editingArticle}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}