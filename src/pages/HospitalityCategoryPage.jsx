import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Clock3, Heart, MapPin, Search, SlidersHorizontal,
  Users, Waves, Hotel, Star, ChevronRight, X, CheckCircle2
} from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';
import { getMarketplaceSpace } from '@/lib/marketplaceSpaces';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const RED = '#b51f2a';
const DARK = '#171717';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('fr-FR')} HTG`;

function getHotelPrice(product, mode, hours) {
  if (mode === 'pool') return product.hourly_price || product.pool_price || product.price || 0;
  if (hours && Number(hours) < 12) return product.hourly_price || product.price || 0;
  return product.nightly_price || product.price || 0;
}

function BookingSheet({ product, shop, search, onClose }) {
  const { user } = useAuth();
  const [mode, setMode] = useState(search.mode);
  const [date, setDate] = useState(search.date);
  const [time, setTime] = useState(search.time || '12:00');
  const [guests, setGuests] = useState(search.guests);
  const [hours, setHours] = useState(search.hours || '4');
  const [isSaving, setIsSaving] = useState(false);
  const price = getHotelPrice(product, mode, hours);

  const submit = async (event) => {
    event.preventDefault();
    if (!user) {
      await firebaseApi.auth.redirectToLogin('/hotel-piscine');
      return;
    }
    if (!date) {
      toast.error('Choisissez une date avant de continuer.');
      return;
    }
    setIsSaving(true);
    try {
      await firebaseApi.entities.Reservation.create({
        client_id: user.id,
        client_name: user.full_name || user.email || 'Client Kairos',
        client_email: user.email || '',
        product_id: product.id,
        product_name: product.name,
        shop_id: shop?.id || product.shop_id || null,
        shop_owner_id: shop?.user_id || product.vendor_id || product.owner_id || null,
        shop_name: shop?.company_name || product.shop_name || 'Établissement Kairos',
        booking_type: mode,
        booking_date: date,
        booking_time: mode === 'pool' ? time : null,
        duration_hours: mode === 'pool' || Number(hours) < 12 ? Number(hours) : null,
        guests: Number(guests),
        amount: Number(price || 0),
        currency: 'HTG',
        status: 'pending',
      });
      toast.success('Demande envoyée à l’établissement.');
      onClose();
    } catch (error) {
      console.error('Reservation create:', error);
      toast.error('La réservation n’a pas pu être envoyée.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-red-100 bg-white px-5 py-4">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Réserver sur Kairos</p><h2 className="mt-1 text-xl font-black text-neutral-950">{product.name}</h2></div>
          <button onClick={onClose} className="rounded-full p-2 text-neutral-700 hover:bg-red-50" aria-label="Fermer"><X size={22} /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-red-50 p-1">
            <button type="button" onClick={() => setMode('hotel')} className={`rounded-xl px-3 py-3 text-sm font-bold ${mode === 'hotel' ? 'bg-red-700 text-white' : 'text-red-900'}`}><Hotel className="mx-auto mb-1 h-5 w-5" />Hôtel</button>
            <button type="button" onClick={() => setMode('pool')} className={`rounded-xl px-3 py-3 text-sm font-bold ${mode === 'pool' ? 'bg-red-700 text-white' : 'text-red-900'}`}><Waves className="mx-auto mb-1 h-5 w-5" />Piscine</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-neutral-900">Date<input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 font-medium text-neutral-950" required /></label>
            <label className="text-sm font-bold text-neutral-900">{mode === 'pool' ? 'Heure d’arrivée' : 'Heure souhaitée'}<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 font-medium text-neutral-950" /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-neutral-900">Personnes<select value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 font-medium text-neutral-950">{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} personne{n > 1 ? 's' : ''}</option>)}</select></label>
            <label className="text-sm font-bold text-neutral-900">Durée<select value={hours} onChange={(e) => setHours(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 font-medium text-neutral-950"><option value="4">4 heures</option><option value="8">8 heures</option><option value="12">12 heures</option><option value="24">24 heures / nuit</option></select></label>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-neutral-700">Tarif indicatif</span><strong className="text-xl text-red-800">{formatMoney(price)}</strong></div><p className="mt-2 text-xs leading-relaxed text-neutral-600">La demande sera confirmée par l’établissement avant paiement définitif.</p></div>
          <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-700 py-4 font-black text-white shadow-lg shadow-red-700/20 transition hover:bg-red-800 disabled:opacity-60">{isSaving ? 'Envoi en cours…' : 'Demander cette réservation'}<ChevronRight size={19} /></button>
        </form>
      </div>
    </div>
  );
}

export default function HospitalityCategoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('hotel');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('12:00');
  const [guests, setGuests] = useState('2');
  const [hours, setHours] = useState('24');
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('recommended');
  const { data: products = [], isLoading } = useQuery({ queryKey: ['hospitality-products'], queryFn: () => firebaseApi.entities.Product.filter({ is_available: true }, '-created_date', 200) });
  const { data: shops = [] } = useQuery({ queryKey: ['hospitality-shops'], queryFn: () => firebaseApi.entities.Shop.filter({ is_active: true }) });

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const belongs = getMarketplaceSpace(product) === 'Hotels/Piscine' || product.category === 'Hotels/Piscine';
      const text = [product.name, product.description, product.city, product.location, product.address, product.shop_name].filter(Boolean).join(' ').toLowerCase();
      return belongs && (!normalized || text.includes(normalized));
    });
    return [...filtered].sort((a, b) => sort === 'price' ? Number(a.price || 0) - Number(b.price || 0) : 0);
  }, [products, query, sort]);

  const searchState = { mode, date, time, guests, hours };

  return (
    <div className="min-h-screen bg-[#fffafa] text-neutral-950">
      <Helmet><title>Hôtels et piscines en Haïti | Kairos</title><meta name="description" content="Réservez un hôtel, une chambre ou une piscine en Haïti avec Kairos. Choisissez votre date, votre heure et le nombre de personnes." /><link rel="canonical" href="https://makariosbridal.shop/hotel-piscine" /></Helmet>
      <header className="sticky top-0 z-40 border-b border-red-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3"><button onClick={() => navigate('/')} className="rounded-full p-2 hover:bg-red-50" aria-label="Retour"><ArrowLeft size={21} /></button><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[.25em] text-red-700">Kairos Hospitality</p><h1 className="text-lg font-black tracking-tight">Hôtels & Piscines</h1></div><button className="rounded-full border border-red-100 p-2 text-red-800"><Heart size={19} /></button></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-[#b51f2a] p-5 text-white shadow-xl shadow-red-900/10 sm:p-8"><div className="max-w-2xl"><p className="mb-2 text-xs font-black uppercase tracking-[.24em] text-red-100">Séjours & expériences en Haïti</p><h2 className="text-3xl font-black leading-tight sm:text-4xl">Trouvez l’endroit idéal pour dormir, nager ou vous détendre.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-red-50">Réservez à la journée, à l’heure ou pour une nuit. Les établissements confirment votre demande avant le paiement.</p></div>
          <div className="mt-6 rounded-2xl bg-white p-3 text-neutral-950 shadow-2xl"><label className="flex items-center gap-2 border-b border-neutral-200 px-2 pb-3"><Search size={19} className="text-red-700" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ville, hôtel, piscine ou établissement" className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-neutral-500" /></label><div className="grid gap-2 pt-3 sm:grid-cols-4"><label className="flex items-center gap-2 rounded-xl border border-neutral-200 p-2"><CalendarDays size={17} className="text-red-700" /><span className="w-full text-[10px] font-bold uppercase text-neutral-500">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full bg-transparent text-sm font-bold text-neutral-950 outline-none" /></span></label><label className="flex items-center gap-2 rounded-xl border border-neutral-200 p-2"><Clock3 size={17} className="text-red-700" /><span className="w-full text-[10px] font-bold uppercase text-neutral-500">Heure<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="block w-full bg-transparent text-sm font-bold text-neutral-950 outline-none" /></span></label><label className="flex items-center gap-2 rounded-xl border border-neutral-200 p-2"><Users size={17} className="text-red-700" /><span className="w-full text-[10px] font-bold uppercase text-neutral-500">Voyageurs<select value={guests} onChange={(e) => setGuests(e.target.value)} className="block w-full bg-transparent text-sm font-bold text-neutral-950 outline-none"><option value="1">1 personne</option><option value="2">2 personnes</option><option value="4">4 personnes</option><option value="6">6 personnes</option></select></span></label><button onClick={() => setShowFilters((v) => !v)} className="flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-black text-white"><SlidersHorizontal size={17} /> Filtres</button></div>{showFilters && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-3"><button onClick={() => setMode('hotel')} className={`rounded-xl border px-3 py-3 text-sm font-bold ${mode === 'hotel' ? 'border-red-700 bg-red-50 text-red-800' : 'border-neutral-200 text-neutral-700'}`}><Hotel className="mx-auto mb-1 h-5 w-5" />Hôtel / Chambre</button><button onClick={() => setMode('pool')} className={`rounded-xl border px-3 py-3 text-sm font-bold ${mode === 'pool' ? 'border-red-700 bg-red-50 text-red-800' : 'border-neutral-200 text-neutral-700'}`}><Waves className="mx-auto mb-1 h-5 w-5" />Piscine / Journée</button><select value={hours} onChange={(e) => setHours(e.target.value)} className="rounded-xl border border-neutral-200 px-3 py-3 text-sm font-bold text-neutral-950"><option value="4">4 heures</option><option value="8">8 heures</option><option value="12">12 heures</option><option value="24">24 heures</option></select></div>}</div>
        </section>
        <div className="mt-7 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-red-700">Résultats</p><h2 className="mt-1 text-2xl font-black">{results.length} établissements disponibles</h2></div><select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-bold text-neutral-900"><option value="recommended">Recommandés</option><option value="price">Prix croissant</option></select></div>
        {isLoading ? <div className="flex justify-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-red-700" /></div> : <section className="mt-4 grid gap-4 md:grid-cols-2">{results.map((product) => { const shop = shops.find((item) => item.id === product.shop_id); const image = product.image_url || product.additional_images?.[0]; const price = getHotelPrice(product, mode, hours); return <article key={product.id} className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="grid grid-cols-[38%_1fr] gap-4 p-3 sm:grid-cols-[42%_1fr]"><button onClick={() => navigate(`/product/${product.id}`)} className="relative min-h-[180px] overflow-hidden rounded-xl bg-red-50"><img src={image ? `${image}${image.includes('?') ? '&' : '?'}w=600&q=82` : '/assets/product-placeholder.svg'} alt={product.name} className="h-full w-full object-cover" loading="lazy" /><span className="absolute left-2 top-2 rounded-md bg-white px-2 py-1 text-[10px] font-black text-red-800">KAIROS</span></button><div className="flex min-w-0 flex-col py-1"><div className="flex items-start justify-between gap-2"><div><p className="line-clamp-1 text-xs font-bold uppercase tracking-wide text-red-700">{shop?.company_name || product.shop_name || 'Établissement Kairos'}</p><h3 className="mt-1 line-clamp-2 text-lg font-black leading-tight text-neutral-950">{product.name}</h3></div><button className="rounded-full p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Heart size={18} /></button></div><div className="mt-2 flex items-center gap-1 text-xs font-bold text-neutral-700"><Star size={14} fill="#d8a400" className="text-[#d8a400]" /> 4,8 · Très apprécié</div><p className="mt-2 line-clamp-2 text-xs text-neutral-600"><MapPin size={13} className="mr-1 inline text-red-700" />{product.location || product.city || 'Haïti'} · {mode === 'pool' ? 'Piscine à la journée' : 'Chambre et séjour'}</p><div className="mt-auto pt-3"><p className="text-xs text-neutral-500">À partir de</p><p className="text-lg font-black text-red-800">{formatMoney(price)} <span className="text-xs font-semibold text-neutral-500">{mode === 'pool' ? '/ créneau' : '/ nuit'}</span></p><button onClick={() => setSelected({ product, shop })} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-red-700 py-2.5 text-sm font-black text-white hover:bg-red-800">Réserver <ChevronRight size={16} /></button></div></div></div></article>; })}</section>}
        {!isLoading && !results.length && <div className="mt-5 rounded-2xl border border-dashed border-red-200 bg-white p-10 text-center"><p className="font-bold text-neutral-900">Aucun établissement trouvé</p><p className="mt-1 text-sm text-neutral-600">Essayez une autre ville ou un autre mot-clé.</p></div>}
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-950"><CheckCircle2 className="h-5 w-5 shrink-0 text-red-700" /><p>Chaque réservation reste en attente de confirmation par l’hôtel ou la piscine. Vous recevrez le statut dans votre compte Kairos.</p></div>
      </main>
      {selected && <BookingSheet product={selected.product} shop={selected.shop} search={searchState} onClose={() => setSelected(null)} />}
    </div>
  );
}
