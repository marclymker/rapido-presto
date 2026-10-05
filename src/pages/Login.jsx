import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Apple, ArrowLeft, Facebook, Loader2, Mail, Phone } from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';

const providers = [
  { id: 'google', label: 'Continuer avec Google', className: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50', icon: <span className="text-lg font-black text-[#4285F4]">G</span> },
  { id: 'facebook', label: 'Continuer avec Facebook', className: 'bg-[#1877F2] text-white hover:bg-[#166fe5]', icon: <Facebook className="h-5 w-5 fill-current" /> },
  { id: 'apple', label: 'Continuer avec Apple', className: 'bg-black text-white hover:bg-slate-800', icon: <Apple className="h-5 w-5 fill-current" /> },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100';

function friendlyError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Email ou mot de passe incorrect.';
  if (code === 'auth/email-already-in-use') return 'Cette adresse email possède déjà un compte.';
  if (code === 'auth/invalid-phone-number') return 'Utilisez le format international, par exemple +509XXXXXXXX.';
  if (code === 'auth/invalid-verification-code') return 'Le code SMS est incorrect.';
  if (code === 'auth/too-many-requests') return 'Trop de tentatives. Réessayez plus tard.';
  if (code === 'auth/popup-closed-by-user') return 'La fenêtre de connexion a été fermée.';
  if (code === 'auth/operation-not-allowed') return 'Ce moyen de connexion n’est pas encore activé dans Firebase. Utilisez Google, Facebook, email ou téléphone.';
  if (code === 'auth/unauthorized-domain') return 'Ce domaine n’est pas autorisé dans Firebase Authentication. Ajoutez makariosbridal.shop dans les domaines autorisés.';
  if (code === 'auth/popup-blocked') return 'Le navigateur a bloqué la fenêtre de connexion. Autorisez les fenêtres pop-up pour Kairos puis réessayez.';
  if (code === 'auth/network-request-failed') return 'Connexion réseau impossible. Vérifiez votre connexion Internet puis réessayez.';
  if (code === 'auth/api-key-expired') return 'La clé Firebase a expiré. La configuration doit être renouvelée par le propriétaire.';
  if (code === 'auth/account-exists-with-different-credential') return 'Cette adresse est déjà liée à un autre mode de connexion.';
  return 'Connexion impossible pour le moment. Vérifiez la configuration Firebase puis réessayez.';
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next')?.startsWith('/') ? searchParams.get('next') : '/Dashboard';
  const [method, setMethod] = useState('social');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const finish = () => { window.location.href = next; };

  useEffect(() => {
    let active = true;
    firebaseApi.auth.completeRedirectLogin()
      .then((result) => {
        if (active && result) finish();
      })
      .catch((err) => {
        console.error('Erreur retour connexion sociale:', err);
        if (active) setError(friendlyError(err));
      });
    return () => { active = false; };
  }, [next]);

  const loginSocial = async (provider) => {
    setLoading(provider); setError('');
    try {
      sessionStorage.setItem('kairos_auth_next', next);
      await firebaseApi.auth.loginWithProvider(provider);
    }
    catch (err) { console.error(`Erreur connexion ${provider}:`, err); setError(friendlyError(err)); }
    finally { setLoading(''); }
  };

  const submitEmail = async (event) => {
    event.preventDefault(); setLoading('email'); setError('');
    try {
      if (isSignup) await firebaseApi.auth.signupViaEmailPassword(email.trim(), password);
      else await firebaseApi.auth.loginViaEmailPassword(email.trim(), password);
      finish();
    } catch (err) { console.error('Erreur connexion email:', err); setError(friendlyError(err)); }
    finally { setLoading(''); }
  };

  const requestPhoneCode = async (event) => {
    event.preventDefault(); setLoading('phone'); setError('');
    try {
      const result = await firebaseApi.auth.sendPhoneCode(phone.trim());
      setConfirmation(result);
      setError('');
    } catch (err) { console.error('Erreur code SMS:', err); setError(friendlyError(err)); }
    finally { setLoading(''); }
  };

  const confirmPhoneCode = async (event) => {
    event.preventDefault(); setLoading('phone-confirm'); setError('');
    try { await firebaseApi.auth.loginViaPhoneConfirmation(confirmation, code.trim()); finish(); }
    catch (err) { console.error('Erreur confirmation SMS:', err); setError(friendlyError(err)); }
    finally { setLoading(''); }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <Helmet>
        <title>Se connecter | Kairos</title>
        <meta name="description" content="Connectez-vous à Kairos avec Google, Facebook, Apple, email ou téléphone." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div id="kairos-phone-recaptcha" />
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <button type="button" onClick={() => window.history.back()} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"><ArrowLeft className="h-4 w-4" /> Retour</button>
          <div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Kairos</p><h1 className="mt-2 text-3xl font-black tracking-tight">Connectez-vous</h1><p className="mt-2 text-sm leading-6 text-slate-500">Achetez. Réservez. Participez. Choisissez votre méthode.</p></div>

          <div className="mb-6 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <button type="button" onClick={() => { setMethod('social'); setError(''); }} className={`rounded-xl px-2 py-2.5 ${method === 'social' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Réseaux</button>
            <button type="button" onClick={() => { setMethod('email'); setError(''); }} className={`rounded-xl px-2 py-2.5 ${method === 'email' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><Mail className="mr-1 inline h-3.5 w-3.5" /> Email</button>
            <button type="button" onClick={() => { setMethod('phone'); setError(''); }} className={`rounded-xl px-2 py-2.5 ${method === 'phone' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><Phone className="mr-1 inline h-3.5 w-3.5" /> Téléphone</button>
          </div>

          {method === 'social' && <div className="space-y-3">{providers.map((provider) => <button key={provider.id} type="button" disabled={!!loading} onClick={() => loginSocial(provider.id)} className={`flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${provider.className}`}>{loading === provider.id ? <Loader2 className="h-5 w-5 animate-spin" /> : provider.icon}{loading === provider.id ? 'Connexion...' : provider.label}</button>)}</div>}

          {method === 'email' && <form onSubmit={submitEmail} className="space-y-3"><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse email" className={inputClass} /><input required minLength={6} type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" className={inputClass} /><button disabled={!!loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">{loading === 'email' && <Loader2 className="h-5 w-5 animate-spin" />}{isSignup ? 'Créer mon compte' : 'Se connecter avec email'}</button><button type="button" onClick={() => setIsSignup(!isSignup)} className="w-full text-center text-sm font-semibold text-orange-600">{isSignup ? 'J’ai déjà un compte' : 'Créer un compte email'}</button></form>}

          {method === 'phone' && !confirmation && <form onSubmit={requestPhoneCode} className="space-y-3"><input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone, ex. +509XXXXXXXX" className={inputClass} /><p className="text-xs leading-5 text-slate-500">Un code de vérification sera envoyé par SMS. Utilisez le format international.</p><button disabled={!!loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading === 'phone' && <Loader2 className="h-5 w-5 animate-spin" />}Recevoir le code SMS</button></form>}

          {method === 'phone' && confirmation && <form onSubmit={confirmPhoneCode} className="space-y-3"><input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code reçu par SMS" className={inputClass} /><button disabled={!!loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading === 'phone-confirm' && <Loader2 className="h-5 w-5 animate-spin" />}Confirmer le code</button><button type="button" onClick={() => { setConfirmation(null); setCode(''); }} className="w-full text-center text-sm font-semibold text-orange-600">Modifier le numéro</button></form>}

          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700">{error}</p>}
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">En continuant, vous acceptez les conditions d’utilisation de Kairos.</p>
        </section>
      </div>
    </main>
  );
}
