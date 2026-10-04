import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import { Loader2, X, Upload } from 'lucide-react';

export default function BlogArticleForm({ article, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
    cover_image_alt: '',
    seo_description: '',
    seo_keywords: [],
    related_products: [],
    is_published: false,
    published_date: new Date().toISOString().split('T')[0]
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 200)
  });

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        content: article.content || '',
        cover_image_url: article.cover_image_url || '',
        cover_image_alt: article.cover_image_alt || '',
        seo_description: article.seo_description || '',
        seo_keywords: article.seo_keywords || [],
        related_products: article.related_products || [],
        is_published: article.is_published || false,
        published_date: article.published_date?.split('T')[0] || new Date().toISOString().split('T')[0]
      });
    }
  }, [article]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (article) {
        return base44.entities.BlogArticle.update(article.id, data);
      } else {
        return base44.entities.BlogArticle.create(data);
      }
    },
    onSuccess: () => {
      toast.success(article ? 'Article mis à jour' : 'Article créé');
      onSuccess?.();
    },
    onError: (error) => toast.error('Erreur: ' + error.message)
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, cover_image_url: file_url }));
      toast.success('Image uploadée');
    } catch (error) {
      toast.error('Erreur upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.slug || !formData.content || !formData.cover_image_url) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    saveMutation.mutate({
      ...formData,
      published_date: formData.is_published
        ? new Date(formData.published_date).toISOString()
        : new Date().toISOString()
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {article ? 'Modifier l\'article' : 'Créer un nouvel article'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pb-6">
          {/* Titre */}
          <div>
            <Label>Titre *</Label>
            <Input
              value={formData.title}
              onChange={(e) => {
                const title = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  title,
                  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                }));
              }}
              placeholder="Ex: Les Meilleures Robes de Mariage 2026"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <Label>Slug (URL) *</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="les-meilleures-robes-mariage-2026"
              required
            />
          </div>

          {/* Image de couverture */}
          <div>
            <Label>Image de couverture *</Label>
            {formData.cover_image_url ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3">
                <img src={`${formData.cover_image_url}?w=400&h=300&fit=cover`} alt="Aperçu" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, cover_image_url: '' }))}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:bg-slate-50 flex flex-col items-center justify-center gap-2">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-sm text-slate-600">Cliquez pour uploader une image</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Alt text */}
          <div>
            <Label>Texte alternatif de l'image</Label>
            <Input
              value={formData.cover_image_alt}
              onChange={(e) => setFormData(prev => ({ ...prev, cover_image_alt: e.target.value }))}
              placeholder="Description pour l'accessibilité"
            />
          </div>

          {/* Extrait */}
          <div>
            <Label>Extrait (pour la liste) *</Label>
            <Textarea
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value } ))}
              placeholder="Résumé court de l'article (2-3 lignes)"
              rows={3}
              required
            />
            <p className="text-xs text-slate-500 mt-1">{formData.excerpt.length}/200</p>
          </div>

          {/* Contenu */}
          <div>
            <Label>Contenu (Markdown) *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Rédigez votre article en Markdown..."
              rows={12}
              required
            />
          </div>

          {/* SEO */}
          <div>
            <Label>Description SEO (Meta)</Label>
            <Textarea
              value={formData.seo_description}
              onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
              placeholder="160 caractères max pour Google"
              rows={2}
            />
            <p className="text-xs text-slate-500 mt-1">{formData.seo_description.length}/160</p>
          </div>

          {/* Mots-clés */}
          <div>
            <Label>Mots-clés SEO</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newKeyword.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        seo_keywords: [...prev.seo_keywords, newKeyword.trim()]
                      }));
                      setNewKeyword('');
                    }
                  }
                }}
                placeholder="Ajouter un mot-clé..."
                size="sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (newKeyword.trim()) {
                    setFormData(prev => ({
                      ...prev,
                      seo_keywords: [...prev.seo_keywords, newKeyword.trim()]
                    }));
                    setNewKeyword('');
                  }
                }}
              >
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.seo_keywords.map((kw, i) => (
                <span key={i} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  {kw}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      seo_keywords: prev.seo_keywords.filter((_, idx) => idx !== i)
                    }))}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Produits liés */}
          <div>
            <Label>Produits liés ({formData.related_products.length} sélectionnés)</Label>
            <Input
              placeholder="Rechercher un produit..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="mb-3"
            />
            <div className="max-h-48 overflow-y-auto border rounded p-3 space-y-2">
              {products
                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(product => (
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
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
                    />
                    <span className="text-sm text-slate-700">{product.name}</span>
                  </label>
                ))}
              {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Aucun produit trouvé</p>
              )}
            </div>
          </div>

          {/* Statut */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
              />
              <span className="text-sm font-medium">Publier l'article</span>
            </label>

            {formData.is_published && (
              <Input
                type="date"
                value={formData.published_date}
                onChange={(e) => setFormData(prev => ({ ...prev, published_date: e.target.value }))}
                className="max-w-xs"
              />
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {article ? 'Mettre à jour' : 'Créer l\'article'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
