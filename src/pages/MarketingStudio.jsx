import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Check, Copy, Facebook, Instagram, Lightbulb, MessageCircle, Search, Send, Sparkles, Video } from 'lucide-react';

const CHANNELS = [
  { id: 'seo', label: 'SEO local', icon: Search, tone: 'blue' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, tone: 'indigo' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, tone: 'pink' },
  { id: 'tiktok', label: 'TikTok', icon: Video, tone: 'slate' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, tone: 'green' },
];

const REGIONS = ['Delmas', 'Cap-Haïtien', 'Port-au-Prince', 'Pétion-Ville', 'Gonaïves', 'Haïti'];
const SITE_OWNER_UID = 'YG8mu1n9yEX0QxhCBLoSH6ao3Ol2';

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function generateDraft(product, shop, region) {
  const name = clean(product?.name || 'Produit Kairos');
  const description = clean(product?.description || 'Une solution choisie avec soin pour les clients en Haïti.');
  const category = clean(product?.category || product?.category_name || 'Marketplace');
  const price = Number(product?.promo_price || product?.price || 0);
  const priceText = price ? `Prix indicatif : ${price.toLocaleString('fr-FR')} HTG.` : 'Écrivez-nous pour recevoir le prix et la disponibilité.';
  const shopName = clean(shop?.company_name || 'votre boutique Kairos');
  const local = region || shop?.region || 'Haïti';
  const wa = `Bonjour, je suis intéressé(e) par ${name}. Est-il disponible à ${local} ?`;

  return {
    seo: {
      title: `${name} à ${local} | ${shopName} — Kairos`,
      description: `${name} disponible à ${local}. ${description.slice(0, 130)} Découvrez les détails, le prix et la disponibilité sur Kairos — powered by makariosbridal.shop.`,
      keywords: [name, category, local, `${category} Haïti`, `acheter ${name}`, `prix ${name}`, 'Kairos Haïti', 'makariosbridal.shop'].join(', '),
      call_to_action: 'Voir le produit et demander la disponibilité',
    },
    facebook: `Vous cherchez ${name.toLowerCase()} à ${local} ?\n\n${description}\n\n${priceText}\n\nDisponible sur ${shopName}. Envoyez-nous un message pour vérifier les tailles, options, livraison ou réservation.\n\nDécouvrez Kairos : Achetez. Réservez. Participez.\n#${local.replace(/[^a-zA-ZÀ-ÿ]/g, '')} #Haiti #Kairos #${category.replace(/[^a-zA-ZÀ-ÿ]/g, '')}`,
    instagram: `${name} — disponible à ${local}.\n\n${description}\n\n${priceText}\n\nEnregistrez ce post, envoyez-le à quelqu’un qui en a besoin et écrivez-nous pour vérifier la disponibilité.\n\n#Kairos #Haiti #${local.replace(/[^a-zA-ZÀ-ÿ]/g, '')} #${category.replace(/[^a-zA-ZÀ-ÿ]/g, '')} #ShoppingHaiti`,
    tiktok: `Hook : Tu cherches ${name.toLowerCase()} à ${local} ?\n\nPlan vidéo : montrer le produit en 3 plans, présenter le détail principal, afficher le prix ou l’appel à message.\n\nTexte à dire : « Voici ${name}, disponible chez ${shopName}. Écris-nous maintenant pour vérifier la disponibilité à ${local}. »\n\nCTA écran : Écris « DISPONIBLE » en message.`,
    whatsapp: `${name} est disponible à ${local} chez ${shopName}.\n\n${description}\n\n${priceText}\n\nRépondez à ce message avec votre taille, quantité ou date souhaitée.\n\nMessage rapide à envoyer :\n${wa}`,
  };
}

function ChannelCard({ channel, value, onCopy }) {
  const Icon = channel.icon;
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></div><h3 className="font-black text-slate-900">{channel.label}</h3></div>
      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => onCopy(value)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copier</Button>
    </div>
    <Textarea value={value || ''} onChange={() => {}} readOnly className="min-h-32 resize-y border-slate-200 bg-slate-50 text-sm leading-relaxed text-slate-700" />
  </article>;
}

export default function MarketingStudio() {
  const [user, setUser] = useState(null);
  const [region, setRegion] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [draft, setDraft] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);

  const { data: shops = [] } = useQuery({ queryKey: ['marketing-shops', user?.id], queryFn: () => base44.entities.Shop.filter({ user_id: user.id }, '-created_date', 10), enabled: !!user?.id });
  const shop = shops[0];
  const { data: products = [], isLoading } = useQuery({ queryKey: ['marketing-products', shop?.id], queryFn: () => base44.entities.Product.filter({ shop_id: shop.id }, '-created_date', 100), enabled: !!shop?.id });
  const { data: savedDrafts = [] } = useQuery({ queryKey: ['marketing-drafts', user?.id], queryFn: () => base44.entities.MarketingDraft.filter({ user_id: user.id }, '-created_date', 20), enabled: !!user?.id });

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId), [products, selectedProductId]);
  const effectiveRegion = region || shop?.region || user?.region || 'Haïti';
  const isSiteOwner = user?.id === SITE_OWNER_UID;

  const saveMutation = useMutation({
    mutationFn: (payload) => base44.entities.MarketingDraft.create(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketing-drafts', user?.id] }); toast.success('Brouillon marketing sauvegardé.'); },
    onError: () => toast.error('Impossible de sauvegarder ce brouillon. Vérifiez les règles Firebase.'),
  });

  const generate = () => {
    if (!selectedProduct) return toast.error('Sélectionnez d’abord un produit.');
    setDraft(generateDraft(selectedProduct, shop, effectiveRegion));
    toast.success('Brouillon multicanal généré.');
  };

  const saveDraft = () => {
    if (!draft || !selectedProduct || !user?.id) return;
    saveMutation.mutate({ user_id: user.id, shop_id: shop?.id || null, product_id: selectedProduct.id, product_name: selectedProduct.name, region: effectiveRegion, status: 'draft', channels: draft });
  };

  const copy = async (value) => { try { await navigator.clipboard.writeText(value); toast.success('Contenu copié.'); } catch (_) { toast.error('Copie non disponible sur cet appareil.'); } };

  if (!user) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><Sparkles className="mx-auto mb-4 h-10 w-10 text-orange-500" /><h1 className="text-xl font-black text-slate-950">Kairos Marketing Studio</h1><p className="my-3 text-sm text-slate-500">Connectez-vous avec le compte propriétaire pour accéder à cette console.</p><Button onClick={() => base44.auth.redirectToLogin('/MarketingStudio')} className="rounded-xl bg-slate-950">Se connecter</Button></div></div>;
  if (!isSiteOwner) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><Sparkles className="mx-auto mb-4 h-10 w-10 text-slate-400" /><h1 className="text-xl font-black text-slate-950">Accès propriétaire uniquement</h1><p className="my-3 text-sm text-slate-500">Cette console marketing est réservée au propriétaire de Kairos.</p><Button onClick={() => { window.location.href = '/Dashboard'; }} variant="outline" className="rounded-xl">Retour au dashboard</Button></div></div>;

  return <main className="min-h-screen bg-[#f4f6f8] pb-20 text-slate-950">
    <Helmet><title>Marketing Studio | Kairos</title><meta name="description" content="Générez des contenus SEO, Facebook, Instagram, TikTok et WhatsApp pour votre activité sur Kairos." /></Helmet>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => { window.location.href = '/Dashboard'; }} aria-label="Retour au dashboard"><ArrowLeft className="h-5 w-5" /></Button><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-600">Kairos Growth Engine</p><h1 className="text-lg font-black">Marketing Studio</h1></div></div><div className="hidden items-center gap-2 text-xs font-bold text-emerald-700 sm:flex"><Check className="h-4 w-4" />Brouillon avant publication</div></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8"><div className="max-w-3xl"><div className="mb-3 flex items-center gap-2 text-orange-300"><Sparkles className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[.18em]">MVP local · sans publicité obligatoire</span></div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Transformez un produit en machine à prospects.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">Générez des contenus adaptés à Haïti, copiez-les, validez-les et publiez-les sur vos canaux. Le système ne publie rien automatiquement sans votre accord.</p></div></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Lightbulb className="h-5 w-5" /></div><div><h2 className="font-black">1. Choisir une matière première</h2><p className="text-xs text-slate-500">Le contenu est généré à partir des informations déjà présentes dans votre catalogue.</p></div></div><div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"><div><Label className="mb-2 block text-xs font-bold text-slate-600">Produit ou service</Label><Select value={selectedProductId} onValueChange={setSelectedProductId}><SelectTrigger className="h-11 rounded-xl border-slate-300"><SelectValue placeholder={isLoading ? 'Chargement...' : 'Sélectionner un produit'} /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div><div><Label className="mb-2 block text-xs font-bold text-slate-600">Zone ciblée</Label><Select value={region || effectiveRegion} onValueChange={setRegion}><SelectTrigger className="h-11 rounded-xl border-slate-300"><SelectValue /></SelectTrigger><SelectContent>{REGIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><Button onClick={generate} className="h-11 rounded-xl bg-orange-500 px-5 font-bold hover:bg-orange-600"><Sparkles className="mr-2 h-4 w-4" />Générer</Button></div>{selectedProduct && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><img src={selectedProduct.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0"><p className="truncate text-sm font-bold">{selectedProduct.name}</p><p className="text-xs text-slate-500">{shop?.company_name || 'Votre boutique'} · {effectiveRegion}</p></div></div>}</section>
      {draft && <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">2. Contenus prêts à valider</p><h2 className="mt-1 text-2xl font-black">Distribution organique multicanal</h2></div><Button onClick={saveDraft} disabled={saveMutation.isPending} className="rounded-xl bg-slate-950"><Send className="mr-2 h-4 w-4" />{saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}</Button></div><div className="grid gap-4 lg:grid-cols-2">{CHANNELS.map((channel) => <ChannelCard key={channel.id} channel={channel} value={draft[channel.id]} onCopy={copy} />)}</div></section>}
      {!!savedDrafts.length && <section><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Historique</p><h2 className="mt-1 text-xl font-black">Vos brouillons récents</h2></div><span className="text-xs font-semibold text-slate-500">{savedDrafts.length} sauvegardé(s)</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{savedDrafts.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => { setSelectedProductId(item.product_id); setRegion(item.region || ''); setDraft(item.channels); }} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-300"><p className="truncate font-bold text-slate-900">{item.product_name}</p><p className="mt-1 text-xs text-slate-500">{item.region || 'Haïti'} · Brouillon</p><p className="mt-3 text-xs font-bold text-orange-600">Ouvrir les contenus →</p></button>)}</div></section>}
    </div>
  </main>;
}
