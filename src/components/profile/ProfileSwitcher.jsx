import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { User, Building2, Bike, ChevronDown, Check, AlertCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const profileConfig = {
  client: { 
    icon: User, 
    label: 'Client',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  entreprise: { 
    icon: Building2, 
    label: 'Entreprise',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  livreur: { 
    icon: Bike, 
    label: 'Livreur',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  agent: {
    icon: User,
    label: 'Agent de Vente',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
};

export default function ProfileSwitcher({ user, onProfileChange }) {
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  
  // Initialize profiles structure if not exists
  const profiles = user?.profiles || {
    client: { is_active: true, created_at: new Date().toISOString(), last_used: new Date().toISOString() },
    entreprise: { is_active: false },
    livreur: { is_active: false, status: 'pending' }
  };
  
  const currentProfile = user?.current_profile || 'client';
  
  const CurrentIcon = profileConfig[currentProfile]?.icon || User;

  const handleSwitch = async (targetProfile) => {
    if (targetProfile === currentProfile) return;
    
    setSwitching(true);
    
    try {
      // Check if profile is active
      const targetProfileData = profiles[targetProfile];
      
      if (!targetProfileData?.is_active) {
        // Redirect to profile activation
        navigate(createPageUrl('ManageProfiles'));
        toast.info(`Activez d'abord votre profil ${profileConfig[targetProfile].label}`);
        return;
      }
      
      // For livreur, check if approved
      if (targetProfile === 'livreur' && targetProfileData.status !== 'approved') {
        toast.error('Votre profil livreur n\'est pas encore approuvé');
        navigate(createPageUrl('ManageProfiles'));
        return;
      }
      
      // For agent and entreprise profiles, allow activation directly
      if (targetProfile === 'agent' && !targetProfileData.is_active) {
        // Auto-activate agent profile
        await base44.auth.updateMe({
          profiles: {
            ...user.profiles,
            agent: {
              is_active: true,
              validation_status: 'approved',
              created_at: new Date().toISOString(),
              last_used: new Date().toISOString(),
              phone: user.phone || '',
              address: user.address || ''
            }
          }
        });
        toast.success('Profil Agent de Vente activé');
      }
      
      // Check for active deliveries if switching from livreur
      if (currentProfile === 'livreur') {
        const activeDeliveries = await base44.entities.Order.filter({
          driver_id: user.id,
          status: { $in: ['driver_assigned', 'in_delivery'] }
        });
        
        if (activeDeliveries.length > 0) {
          toast.error('Vous avez des livraisons en cours. Veuillez les terminer avant de changer de profil.');
          return;
        }
      }
      
      // Update current profile
      await base44.auth.updateMe({
        current_profile: targetProfile,
        [`profiles.${targetProfile}.last_used`]: new Date().toISOString()
      });
      
      // Redirect to Home for all profiles
      toast.success(`Profil changé vers ${profileConfig[targetProfile].label}`);
      window.location.href = createPageUrl('Home');
      
    } catch (error) {
      toast.error('Erreur lors du changement de profil');
    } finally {
      setSwitching(false);
    }
  };

  const getProfileStatus = (profileType) => {
    const profile = profiles[profileType];
    
    if (!profile || !profile.is_active) {
      return { status: 'inactive', label: 'Inactif', color: 'bg-slate-100 text-slate-600' };
    }
    
    if (profileType === 'livreur' && profile.status === 'pending') {
      return { status: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-700' };
    }
    
    if (profileType === 'livreur' && profile.status === 'rejected') {
      return { status: 'rejected', label: 'Rejeté', color: 'bg-red-100 text-red-700' };
    }
    
    return { status: 'active', label: 'Actif', color: 'bg-green-100 text-green-700' };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={switching}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${profileConfig[currentProfile].bgColor}`}>
            <CurrentIcon className={`w-4 h-4 ${profileConfig[currentProfile].color}`} />
          </div>
          <span className="font-medium">{profileConfig[currentProfile].label}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-slate-500">
          Changer de profil
        </div>
        
        {['client', 'agent'].map(key => {
          const config = profileConfig[key];
          const Icon = config.icon;
          const status = getProfileStatus(key);
          const isActive = key === currentProfile;
          
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => handleSwitch(key)}
              className="flex items-center justify-between cursor-pointer"
              disabled={status.status === 'inactive' || status.status === 'pending' || status.status === 'rejected'}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium">{config.label}</p>
                  <Badge variant="secondary" className={`text-xs mt-0.5 ${status.color}`}>
                    {status.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {status.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {status.label}
                  </Badge>
                </div>
              </div>
              {isActive && <Check className="w-4 h-4 text-green-600" />}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => navigate(createPageUrl('ManageProfiles'))}
          className="text-orange-600 font-medium cursor-pointer"
        >
          Gérer mes profils
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}