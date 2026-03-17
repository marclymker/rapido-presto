import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2, Plus, Edit2, Trash2, Eye, EyeOff, Calendar, Save,
  X, ArrowLeft, Upload, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminBlog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Vérifier si admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    cover_image: '',
    published_date: new Date().toISOString().split('T')[0],
    is_published: false,
    related_products: [],
    seo_description: '',
    author: user?.full_name || ''
  });

  // Charger les articles
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['admin-blog-articles'],
    queryFn: () => base44.entities.BlogArticle.list('-updated_date', 100)
  });

  // Charger les produits pour le sélecteur
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('name', 100)
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BlogArticle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-articles'] });
      toast.success('Article créé avec succès');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.BlogArticle.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-articles'] });
      toast.success('Article mis à jour');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogArticle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-articles'] });
      toast.success('Article supprimé');
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, cover_image: file_url }));
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur upload: ' + error.message);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.cover_image) {
      toast.error('Titre, contenu et image sont obligatoires');
      return;
    }

    const dataToSubmit = {
      ...formData,
      slug: formData.slug || generateSlug(formData.title)
    };

    if (editingId) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      cover_image: '',
      published_date: new Date().toISOString().split('T')[0],
      is_published: false,
      related_products: [],
      seo_description: '',
      author: user?.full_name || ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (article) => {
    setFormData({
      ...article,
      published_date: article.published_date ? article.published_date.split('T')[0] : ''
    });
    setEditingId(article.id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (showForm) resetForm();
                else window.history.back();
              }}
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-3xl font-black text-slate-900">Gestion du Blog</h1>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus size={20} className="mr-2" />
              Nouvel article
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-slate-200">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Modifier l\'article' : 'Créer un nouvel article'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Titre */}
              <div>
                <Label className="mb-2">Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      title: e.target.value,
                      slug: !editingId ? generateSlug(e.target.value) : prev.slug
                    }));
                  }}
                  placeholder="Mon super article..."
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <Label className="mb-2">Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="mon-super-article"
                />
                <p className="text-xs text-slate-500 mt-1">Auto-généré si vide</p>
              </div>

              {/* Image */}
              <div>
                <Label className="mb-2">Image de couverture *</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {formData.cover_image ? (
                    <div className="relative">
                      <img
                        src={formData.cover_image}
                        alt="Couverture"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData(prev => ({ ...prev, cover_image: '' }))}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-6">
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600">Cliquez pour télécharger une image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Contenu */}
              <div>
                <Label className="mb-2">Contenu (Markdown) *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Écrivez votre article ici... Supports markdown"
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
              </div>

              {/* Extrait */}
              <div>
                <Label className="mb-2">Extrait (pour la liste des articles)</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Un court résumé..."
                  rows={2}
                />
              </div>

              {/* SEO Description */}
              <div>
                <Label className="mb-2">Description SEO (160 caractères)</Label>
                <Textarea
                  value={formData.seo_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value.substring(0, 160) }))}
                  placeholder="Description pour Google et les réseaux sociaux"
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-slate-500 mt-1">{formData.seo_description.length}/160</p>
              </div>

              {/* Produits liés */}
              <div>
                <Label className="mb-2">Produits liés</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {products.map(product => (
                    <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.related_products.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              related_products: [...prev.related_products, product.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              related_products: prev.related_products.filter(id => id !== product.id)
                            }));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date et Publication */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Date de publication</Label>
                  <Input
                    type="date"
                    value={formData.published_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, published_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="mb-2">Publié</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm text-slate-700">
                      {formData.is_published ? 'Article publié' : 'Brouillon'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-6 border-t">
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Articles List */}
        {!showForm && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
              </div>
            ) : articles.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Aucun article pour le moment
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Titre</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Statut</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr key={article.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{article.title}</div>
                          <div className="text-xs text-slate-500">/{article.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {article.is_published ? (
                              <>
                                <Eye size={16} className="text-green-600" />
                                <span className="text-sm text-green-700 font-medium">Publié</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={16} className="text-slate-400" />
                                <span className="text-sm text-slate-500">Brouillon</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {format(new Date(article.published_date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(article)}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Supprimer cet article ?')) {
                                deleteMutation.mutate(article.id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                          {article.is_published && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <a href={`/BlogArticle?slug=${article.slug}`} target="_blank">
                                <Eye size={16} />
                              </a>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}