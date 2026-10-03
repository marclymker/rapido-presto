import React, { useState } from 'react';
import { firebase } from '@/api/firebaseClient';
import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Récupère l'URL d'origine pour rediriger l'utilisateur après sa connexion
  const getRedirectUrl = () => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('from_url') || '/Account';
    } catch (_) {
      return '/Account';
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const res = await firebase.auth.loginWithProvider('google');
      if (res?.user) {
        toast.success('Connexion réussie !');
        window.location.href = getRedirectUrl();
      }
    } catch (err) {
      console.error('Erreur Google:', err);
      toast.error('Erreur lors de la connexion Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await firebase.auth.loginViaEmailPassword(email, password);
        if (res?.user) {
          toast.success('Connexion réussie !');
          window.location.href = getRedirectUrl();
        }
      } else {
        const res = await firebase.auth.signupViaEmailPassword(email, password);
        if (res?.user) {
          toast.success('Compte créé avec succès !');
          window.location.href = getRedirectUrl();
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Identifiants incorrects ou compte inexistant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center space-y-6">

        {/* Logo Rapido Presto */}
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto shadow-inner border border-orange-100">
          <span className="font-extrabold text-orange-600 text-sm tracking-tighter">RAPIDO<span className="text-slate-800">PRESTO</span></span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Welcome to Rapido Presto | Marketplace & E-commerce Haïti.
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to continue
          </p>
        </div>

        {/* Bouton Continuer avec Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 transition text-slate-700 font-semibold text-sm shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        {/* Séparateur OR */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-[1px] bg-slate-200"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OR</span>
          <div className="flex-1 h-[1px] bg-slate-200"></div>
        </div>

        {/* Formulaire Email et Mot de passe */}
        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
          <div>
            <Label className="text-xs font-semibold text-slate-600 block mb-1">Email</Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 py-2.5 rounded-xl border-slate-300"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600 block mb-1">Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 py-2.5 rounded-xl border-slate-300"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111827] hover:bg-black text-white font-semibold py-3 rounded-xl shadow-md transition mt-2"
          >
            {loading ? 'Signing in...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        {/* Bascule Connexion / Inscription */}
        <button
          type="button"
          onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          className="text-xs text-orange-600 font-semibold hover:underline block mx-auto pt-2"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}