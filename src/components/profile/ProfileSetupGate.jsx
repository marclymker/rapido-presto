import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Utensils, Hotel, Ticket, Bike, ArrowRight } from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

const OPTIONS = [
  { id: 'client', label: 'Client', description: 'Acheter, réserver et participer', icon: User },
  { id: 'food', label: 'Nourriture', description: 'Restaurant, fast-food ou service traiteur', icon: Utensils },
  { id: 'hospitality', label: 'Hôtel / Piscine', description: 'Chambres, espaces et créneaux piscine', icon: Hotel },
  { id: 'tickets', label: 'Tickets', description: 'Événements, billets et contrôle QR', icon: Ticket },
  { id: 'livreur', label: 'Livreur', description: 'Livraisons et courses attribuées', icon: Bike },
];

function hasConfiguredProfile(user) {
  if (!user || user.profile_setup_completed === true) return true;
  const profiles = user.profiles || {};
  return Boolean(user.current_profile && Object.values(profiles).some((profile) => profile?.is_active));
}

export default function ProfileSetupGate() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setOpen(false);
      return;
    }
    firebaseApi.auth.me().then((currentUser) => {
      setUser(currentUser);
      setOpen(!hasConfiguredProfile(currentUser));
    }).catch(() => setOpen(false));
  }, [isAuthenticated]);

  const chooseClient = async () => {
    setSaving(true);
    try {
      const profiles = { ...(user?.profiles || {}), client: { ...(user?.profiles?.client || {}), is_active: true, last_used: new Date().toISOString() } };
      await firebaseApi.auth.updateMe({ profiles, current_profile: 'client', profile_setup_completed: true });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const chooseBusiness = (profileId) => {
    setOpen(false);
    navigate(`/ManageProfiles?activate=${encodeURIComponent(profileId)}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="profile-setup-title" className="w-full max-w-xl rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Kairos</p>
        <h2 id="profile-setup-title" className="mt-2 text-2xl font-black text-slate-950">Comment souhaitez-vous utiliser Kairos ?</h2>
        <p className="mt-2 text-sm text-slate-600">Choisissez un espace. Vous pourrez compléter ou modifier les informations de l’établissement depuis Paramètres du compte.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map(({ id, label, description, icon: Icon }) => (
            <button key={id} type="button" disabled={saving} onClick={() => id === 'client' ? chooseClient() : chooseBusiness(id)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-bold text-slate-950">{label}</span><span className="mt-1 block text-xs text-slate-600">{description}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
        <Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)} className="mt-4 w-full text-slate-600">Plus tard</Button>
      </div>
    </div>
  );
}
