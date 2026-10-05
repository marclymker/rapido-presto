import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Apple, ArrowLeft, Facebook, Loader2 } from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';

const providers = [
  { id: 'google', label: 'Continuer avec Google', className: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50', icon: <span className="text-lg font-black text-[#4285F4]">G</span> },
  { id: 'apple', label: 'Continuer avec Apple', className: 'bg-black text-white hover:bg-slate-800', icon: <Apple className="h-5 w-5 fill-current" /> },
  { id: 'facebook', label: 'Continuer avec Facebook', className: 'bg-[#1877F2] text-white hover:bg-[#166fe5]', icon: <Facebook className="h-5 w-5 fill-current" /> },
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next')?.startsWith('/') ? searchParams.get('next') : '/Dashboard';
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const login = async (provider) => {
    setLoading(provider);
    setError('');
    try {
      await firebaseApi.auth.loginWithProvider(provider);
      window.location.href = next;
    } catch (err) {
      console.error(`Erreur connexion ${provider}:`, err);
      const message = err?.code === 'auth/account-exists-with-different-credential'
        ? 'Cette adresse est déjà liée à un autre mode de connexion. Utilisez le fournisseur initial.'
        : err?.code === 'auth/popup-closed-by-user'
          ? 'La fenêtre de connexion a été fermée.'
          : 'Connexion impossible pour le moment. Vérifiez que ce fournisseur est activé dans Firebase.';
      setError(message);
    } finally {
      setLoading('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <Helmet>
        <title>Se connecter | Kairos</title>
        <meta name="description" content="Connectez-vous à Kairos avec Google, Apple ou Facebook." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <button type="button" onClick={() => window.history.back()} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Kairos</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Connectez-vous</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Achetez. Réservez. Participez. Choisissez votre méthode de connexion.</p>
          </div>
          <div className="space-y-3">
            {providers.map((provider) => (
              <button key={provider.id} type="button" disabled={!!loading} onClick={() => login(provider.id)} className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${provider.className}`}>
                {loading === provider.id ? <Loader2 className="h-5 w-5 animate-spin" /> : provider.icon}
                {loading === provider.id ? 'Connexion...' : provider.label}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700">{error}</p>}
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">En continuant, vous acceptez les conditions d’utilisation de Kairos.</p>
        </section>
      </div>
    </main>
  );
}
