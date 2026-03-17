import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

export default function BlogManager() {
  const queryClient = useQueryClient();
  const [editingArticle, setEditingArticle] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    cover_image: '',
    author: '',
    seo_description: '',
    seo_keywords: '',
    related_products: [],
    status: 'draft'
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['admin-blog-articles'],
    queryFn: () => base44.entities.BlogArticle.list('-published_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-blog'],
    queryFn: () => base44.entities.Product.list()
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingArticle?.id) {
        return base44.entities.BlogArticle.update(editingArticle.id, data);
      } else {
        return base44.entities.BlogArticle.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-blog-articles']);
      resetForm();
      toast.success(editingArticle ? 'Article mis à jour' : 'Article créé');
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogArticle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-blog-articles']);
      toast.success('Article supprimé');
    }
  });

  const resetForm = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      cover_image: '',
      author: '',
      seo_description: '',
      seo_keywords: '',
      related_products: [],
      status: 'draft'
    });
    setShowPreview(false);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      ...article,
      seo_keywords: article.seo_keywords?.join(', ') || ''
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error('Remplissez au moins titre, slug et contenu');
      return;
    }

    const dataToSave = {
      ...formData,
      seo_keywords: formData.seo_keywords.split(',').map(k => k.trim()).filter(k => k),
      published_date: editingArticle?.published_date || new Date().toISOString()
    };

    saveMutation.mutate(dataToSave);
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion du Blog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArticle ? 'Modifier l\'article' : 'Créer un article'}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Titre de l'article"
                value={formData.title}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: generateSlug(e.target.value)
                  });
                }}
              />
              <Input
                placeholder="Slug (URL)"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Auteur"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
              <Input
                placeholder="URL image de couverture"
                value={formData.cover_image}
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              />
            </div>

            <Textarea
              placeholder="Extrait (aperçu court)"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="h-20"
            />

            <Textarea
              placeholder="Contenu complet (Markdown supporté)"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="h-48 font-mono text-sm"
            />

            <Textarea
              placeholder="Description SEO (160 caractères)"
              value={formData.seo_description}
              onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
              className="h-20"
            />

            <Input
              placeholder="Mots-clés SEO (séparés par des virgules)"
              value={formData.seo_keywords}
              onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
            />

            <div>
              <label className="text-sm font-medium mb-2 block">Produits liés</label>
              <div className="border rounded-lg p-3 h-40 overflow-y-auto space-y-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.related_products.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            related_products: [...formData.related_products, product.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            related_products: formData.related_products.filter(id => id !== product.id)
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="flex-1 border border-slate-300 rounded px-3 py-2"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
              <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? 'Éditer' : 'Prévisualiser'}
              </Button>
            </div>

            {showPreview && (
              <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-slate-50">
                <h1>{formData.title}</h1>
                <ReactMarkdown>{formData.content}</ReactMarkdown>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Articles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <Card key={article.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{article.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{article.slug}</p>
              </div>
              <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                {article.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            </div>

            <p className="text-sm text-slate-600 mb-4 line-clamp-2">
              {article.excerpt || article.content.substring(0, 100)}
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(article)}
              >
                <Edit2 className="w-3 h-3 mr-1" />
                Éditer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm('Supprimer cet article ?')) {
                    deleteMutation.mutate(article.id);
                  }
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Supprimer
              </Button>
              {article.status === 'published' && (
                <a
                  href={`/BlogArticle?slug=${article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    Voir
                  </Button>
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
          <p className="text-slate-600">Aucun article. Créez le premier!</p>
        </div>
      )}
    </div>
  );
}