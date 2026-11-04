import React, { useState } from 'react';
import { User, Bike, ChevronDown, Check, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BUSINESS_PROFILE_IDS, deactivateOtherOperationalProfiles, getBusinessProfile } from '@/lib/businessProfiles';
import { firebaseApi } from '@/api/firebaseClient';

const LEGACY_PROFILES = {
  client: { id: 'client', label: 'Client', icon: User, color: 'text-blue-600', bgColor: 'bg-blue-100', route: 'Home' },
  agent: { id: 'agent', label: 'Agent de Vente', icon: User, color: 'text-purple-600', bgColor: 'bg-purple-100', route: 'AgentDashboard' },
  livreur: { id: 'livreur', label: 'Livreur', icon: Bike, color: 'text-green-600', bgColor: 'bg-green-100', route: 'Dashboard' },
};

const getConfig = (id) => {
  if (LEGACY_PROFILES[id]) return LEGACY_PROFILES[id];
  const profile = getBusinessProfile(id);
  return { ...profile, color: 'text-orange-600', bgColor: 'bg-orange-100' };
};

const getStoredProfile = (profiles, id) => {
  if (id === 'marketplace') return profiles?.marketplace || profiles?.entreprise;
  return profiles?.[id];
};

export default function ProfileSwitcher({ user, onProfileChange }) {
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const profiles = user?.profiles || { client: { is_active: true } };
  const currentProfile = user?.current_profile === 'marketplace' || user?.current_profile === 'entreprise' ? 'client' : (user?.current_profile || 'client');
  const availableProfileIds = ['client', ...BUSINESS_PROFILE_IDS, 'agent', 'livreur'];
  const CurrentConfig = getConfig(currentProfile);
  const CurrentIcon = CurrentConfig.icon;

  const getProfileStatus = (profileId) => {
    if (profileId === 'client') return { status: 'active', label: 'Disponible', color: 'bg-blue-100 text-blue-700' };
    const profile = getStoredProfile(profiles, profileId);
    if (!profile) return { status: 'inactive', label: 'À activer', color: 'bg-slate-100 text-slate-600' };
    if (profile.status === 'pending') return { status: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-700' };
    if (profile.status === 'rejected') return { status: 'rejected', label: 'Rejeté', color: 'bg-red-100 text-red-700' };
    const configured = profileId === 'livreur'
      ? Boolean(profile.vehicle_type && profile.id_document_url)
      : Boolean(profile.company_name && profile.company_category);
    if (!profile.is_active && configured) return { status: 'ready', label: 'Disponible', color: 'bg-blue-100 text-blue-700' };
    if (!profile.is_active) return { status: 'inactive', label: 'À activer', color: 'bg-slate-100 text-slate-600' };
    return { status: 'active', label: 'Actif', color: 'bg-green-100 text-green-700' };
  };

  const handleSwitch = async (targetProfile) => {
    if (targetProfile === currentProfile) return;
    const status = getProfileStatus(targetProfile);
    if (targetProfile !== 'client' && !['active', 'ready'].includes(status.status)) {
      navigate(createPageUrl('ManageProfiles'));
      toast.info(`Activez d'abord le profil ${getConfig(targetProfile).label}`);
      return;
    }

    setSwitching(true);
    try {
      const nextProfiles = deactivateOtherOperationalProfiles(profiles, targetProfile);
      nextProfiles.client = { ...(nextProfiles.client || {}), is_active: targetProfile === 'client' };
      if (nextProfiles[targetProfile]) {
        nextProfiles[targetProfile] = { ...nextProfiles[targetProfile], is_active: true, last_used: new Date().toISOString() };
      }
      await firebaseApi.auth.updateMe({ current_profile: targetProfile, profiles: nextProfiles });
      onProfileChange?.(targetProfile, nextProfiles);
      toast.success(`Profil changé vers ${getConfig(targetProfile).label}`);
      const targetRoute = getConfig(targetProfile).route || 'Home';
      navigate(createPageUrl(targetRoute), { replace: true });
    } catch (error) {
      toast.error('Impossible de changer de profil pour le moment.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" disabled={switching}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${CurrentConfig.bgColor}`}>
            <CurrentIcon className={`h-4 w-4 ${CurrentConfig.color}`} />
          </div>
          <span className="font-medium">{CurrentConfig.label}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-xs font-medium text-slate-500">Changer d’espace métier</div>
        {availableProfileIds.map((profileId) => {
          const config = getConfig(profileId);
          const Icon = config.icon;
          const status = getProfileStatus(profileId);
          const isActive = profileId === currentProfile;
          return (
            <DropdownMenuItem
              key={profileId}
              onClick={() => handleSwitch(profileId)}
              className="flex cursor-pointer items-center justify-between"
              disabled={status.status === 'pending' || status.status === 'rejected'}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium">{config.label}</p>
                  <Badge variant="secondary" className={`mt-0.5 text-xs ${status.color}`}>
                    {status.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                    {status.status === 'rejected' && <AlertCircle className="mr-1 h-3 w-3" />}
                    {status.label}
                  </Badge>
                </div>
              </div>
              {isActive && <Check className="h-4 w-4 text-green-600" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(createPageUrl('ManageProfiles'))} className="cursor-pointer font-medium text-orange-600">
          Gérer mes profils et collaborateurs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
