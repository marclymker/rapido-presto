import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import OrdersSection from '@/components/enterprise/OrdersSection';
import ProductsSection from '@/components/enterprise/ProductsSection';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import { createPageUrl } from '@/utils';
import {
  Activity, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  Bike, Hotel, Package, Plus, ScanLine, Store,
  Ticket, Truck, Utensils, Users, WalletCards
} from 'lucide-react';

const WORKSPACES = {
  marketplace: {
    label: 'Marketplace', eyebrow: 'Espace marchand', icon: Store,
    accent: '#f97316', description: 'Gérez votre boutique, vos articles et vos commandes depuis un seul espace.'
  },
  food: {
    label: 'Nourriture', eyebrow: 'Point de vente', icon: Utensils,
    accent: '#16a34a', description: 'Acceptez, préparez et clôturez vos commandes sans détour.'
  },
  hospitality: {
    label: 'Hôtel / Piscine', eyebrow: 'Opérations hébergement', icon: Hotel,
    accent: '#2563eb', description: 'Contrôlez les disponibilités, réservations et services de votre établissement.'
  },
  tickets: {
    label: 'Tickets', eyebrow: 'Billetterie événementielle', icon: Ticket,
    accent: '#7c3aed', description: 'Pilotez vos événements, ventes, participants et contrôles d’accès.'
  },
  livreur: {
    label: 'Livreur', eyebrow: 'Opérations livraison', icon: Bike,
    accent: '#16a34a', description: 'Acceptez les livraisons et suivez les courses qui vous sont attribuées.'
  }
};

function normalizeProfile(profile) {
  if (profile === 'marketplace' || profile === 'entreprise' || profile === 'client') return 'marketplace';
  return WORKSPACES[profile] ? profile : 'marketplace';
}

function Metric({ icon: Icon, label, value, tone = 'slate' }) {
  const toneClasses = { orange: 'bg-orange-50 text-orange-600', blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', indigo: 'bg-indigo-50 text-indigo-600', violet: 'bg-violet-50 text-violet-600', slate: 'bg-slate-50 text-slate-600' };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone] || toneClasses.slate}`}><Icon className="h-4 w-4" /></div>
    <p className="text-2xl font-black tracking-tight text-slate-950">{value}</p>
    <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
  </div>;
}

function OperationalCard({ icon: Icon, title, detail, action, accent, children }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accent }}><Icon className="h-5 w-5" /></div>
        <div><h2 className="font-black text-slate-950">{title}</h2><p className="text-xs text-slate-500">{detail}</p></div>
      </div>
      {action}
    </div>
    {children}
  </section>;
}

function MarketplaceWorkspace({ orders, products, shop }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Package} label="Commandes reçues" value={orders.length} tone="orange" /><Metric icon={Store} label="Articles publiés" value={products.length} tone="blue" /><Metric icon={WalletCards} label="Statut boutique" value={shop?.is_active === false ? 'Pause' : 'Active'} tone="emerald" /></div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <OperationalCard icon={Package} title="Commandes" detail="Les commandes qui nécessitent votre attention" accent="#f97316" action={<span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{orders.filter(o => o.status === 'pending').length} en attente</span>}><OrdersSection orders={orders} userType="merchant" /></OperationalCard>
      <OperationalCard icon={Store} title="Catalogue" detail="Ajoutez et gérez vos articles" accent="#2563eb"><ProductsSection shopId={shop?.id} /></OperationalCard>
    </div>
  </>;
}

function FoodWorkspace({ orders, shop }) {
  const pending = orders.filter(o => o.status === 'pending').length;
  return <>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Clock3} label="À traiter maintenant" value={pending} tone="amber" /><Metric icon={CheckCircle2} label="Commandes acceptées" value={orders.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status)).length} tone="emerald" /><Metric icon={Truck} label="Mode boutique" value={shop?.is_active === false ? 'Fermé' : 'Ouvert'} tone="blue" /></div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <OperationalCard icon={Utensils} title="Commandes entrantes" detail="Accepter, refuser et préparer" accent="#16a34a" action={<span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">POS actif</span>}><OrdersSection orders={orders} userType="merchant" /></OperationalCard>
      <OperationalCard icon={Store} title="Catalogue rapide" detail="Les articles proposés aujourd’hui" accent="#15803d"><ProductsSection shopId={shop?.id} /></OperationalCard>
    </div>
  </>;
}

function HospitalityWorkspace({ orders, products, shop }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Hotel} label="Unités au catalogue" value={products.length} tone="blue" /><Metric icon={CalendarDays} label="Réservations / commandes" value={orders.length} tone="indigo" /><Metric icon={CheckCircle2} label="Disponibilité générale" value={shop?.is_active === false ? 'Fermée' : 'Ouverte'} tone="emerald" /></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <OperationalCard icon={CalendarDays} title="Disponibilités" detail="Chambres, piscines et créneaux" accent="#2563eb"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Hébergement</p><p className="mt-2 text-sm font-semibold text-slate-900">Gérer les chambres disponibles</p><Button variant="outline" className="mt-4 rounded-xl border-blue-200">Ouvrir le calendrier<ChevronRight className="ml-2 h-4 w-4" /></Button></div><div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Piscine</p><p className="mt-2 text-sm font-semibold text-slate-900">Gérer les créneaux et capacités</p><Button variant="outline" className="mt-4 rounded-xl border-cyan-200">Gérer les créneaux<ChevronRight className="ml-2 h-4 w-4" /></Button></div></div></OperationalCard>
      <OperationalCard icon={Package} title="Demandes à confirmer" detail="Réservations et commandes de services" accent="#1d4ed8"><OrdersSection orders={orders} userType="merchant" /></OperationalCard>
    </div>
  </>;
}

function TicketsWorkspace({ orders, products }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Ticket} label="Billets / offres" value={products.length} tone="violet" /><Metric icon={Users} label="Ventes enregistrées" value={orders.length} tone="blue" /><Metric icon={ScanLine} label="Contrôle d’accès" value="Prêt" tone="emerald" /></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <OperationalCard icon={CalendarDays} title="Événements" detail="Créez et pilotez vos événements" accent="#7c3aed" action={<Button size="sm" className="rounded-xl bg-violet-600"><Plus className="mr-1 h-4 w-4" />Nouvel événement</Button>}><div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-6 text-center"><CalendarDays className="mx-auto h-8 w-8 text-violet-500" /><p className="mt-3 font-bold text-slate-900">Aucun événement sélectionné</p><p className="mt-1 text-xs text-slate-500">Les événements et les ventes apparaîtront ici.</p></div></OperationalCard>
      <OperationalCard icon={ScanLine} title="Contrôle des billets" detail="Vérifiez les QR codes des clients" accent="#6d28d9"><div className="rounded-2xl bg-slate-950 p-6 text-center text-white"><ScanLine className="mx-auto h-10 w-10 text-violet-300" /><p className="mt-3 font-bold">Scanner un billet</p><p className="mt-1 text-xs text-slate-400">Le QR code est vérifié uniquement côté organisateur.</p><Button className="mt-5 rounded-xl bg-white text-slate-950 hover:bg-violet-100"><ScanLine className="mr-2 h-4 w-4" />Ouvrir le scanner</Button></div></OperationalCard>
    </div>
  </>;
}

function CourierWorkspace({ orders }) {
  const active = orders.filter(o => ['accepted', 'in_delivery'].includes(o.status));
  return <>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Truck} label="Livraisons à traiter" value={orders.filter(o => o.status === 'pending').length} tone="amber" /><Metric icon={Activity} label="Courses actives" value={active.length} tone="emerald" /><Metric icon={CheckCircle2} label="Disponibilité" value="En ligne" tone="blue" /></div>
    <OperationalCard icon={Truck} title="Mes livraisons" detail="Acceptez et suivez vos courses" accent="#16a34a"><OrdersSection orders={orders} userType="livreur" /></OperationalCard>
  </>;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);

  const isCourier = user?.current_profile === 'livreur';
  const { data: shop } = useQuery({ queryKey: ['workspace-shop', user?.id], queryFn: async () => { const shops = await base44.entities.Shop.filter({ user_id: user.id }); return shops[0] || base44.entities.Shop.create({ user_id: user.id, company_name: `Boutique ${user.full_name}`, company_category: 'Commerce', region: user.region || '', is_active: true }); }, enabled: !!user?.id && !isCourier });
  const { data: orders = [] } = useQuery({ queryKey: ['workspace-orders', user?.id, shop?.id, isCourier], queryFn: () => isCourier ? base44.entities.Order.filter({ driver_id: user.id }, '-created_date') : base44.entities.Order.filter({ shop_id: shop.id }, '-created_date'), enabled: !!user?.id && (isCourier || !!shop?.id) });
  const { data: products = [] } = useQuery({ queryKey: ['workspace-products', shop?.id], queryFn: () => base44.entities.Product.filter({ shop_id: shop.id }), enabled: !!shop?.id && !isCourier });

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Activity className="h-8 w-8 animate-pulse text-orange-400" /></div>;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-5"><div className="max-w-sm rounded-3xl bg-white p-8 text-center"><Store className="mx-auto mb-4 h-10 w-10 text-orange-500" /><h1 className="text-xl font-black">Workspace Rapido Presto</h1><p className="my-3 text-sm text-slate-500">Connectez-vous pour gérer votre activité.</p><Button onClick={() => base44.auth.redirectToLogin('/Dashboard')} className="w-full rounded-xl bg-slate-950">Se connecter</Button></div></div>;

  const profileId = normalizeProfile(user.current_profile === 'entreprise' ? 'marketplace' : user.current_profile);
  const workspace = WORKSPACES[profileId];
  const Icon = workspace.icon;
  const Workspace = profileId === 'food' ? FoodWorkspace : profileId === 'hospitality' ? HospitalityWorkspace : profileId === 'tickets' ? TicketsWorkspace : profileId === 'livreur' ? CourierWorkspace : MarketplaceWorkspace;

  return <div className="min-h-screen bg-[#f4f6f8] text-slate-950">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: workspace.accent }}><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{workspace.eyebrow}</p><h1 className="truncate text-lg font-black">{workspace.label}</h1></div></div>
        <div className="flex items-center gap-2"><ProfileSwitcher user={user} onProfileChange={(nextProfile, nextProfiles) => setUser((current) => ({ ...current, current_profile: nextProfile, profiles: nextProfiles || current.profiles }))} /><span className="hidden text-xs font-bold text-slate-500 sm:inline">{user.email || 'Compte actif'}</span></div>
      </div>
    </header>
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-slate-500">Bonjour {user.full_name?.split(' ')[0] || 'marchand'}</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Pilotez votre activité.</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">{workspace.description}</p></div><div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" />Espace opérationnel actif</div></div>
      <Workspace orders={orders} products={products} shop={shop} />
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Compte et accès</p><h2 className="mt-1 font-black text-slate-950">{user.full_name || 'Votre compte'}</h2><p className="mt-1 text-sm text-slate-500">Gérez vos profils métier et les accès collaborateurs depuis cet espace unique.</p></div>
        <Button onClick={() => window.location.href = createPageUrl('ManageProfiles')} variant="outline" className="rounded-xl border-slate-300">Gérer les profils<ChevronRight className="ml-2 h-4 w-4" /></Button>
      </section>
    </main>
  </div>;
}
