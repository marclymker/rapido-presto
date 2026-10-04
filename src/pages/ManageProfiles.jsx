import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, User, Building2, Bike, Plus, Check, Clock, AlertCircle, Upload, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from 'framer-motion';
import { BUSINESS_PROFILES, BUSINESS_PROFILE_IDS, deactivateOtherOperationalProfiles } from '@/lib/businessProfiles';

const COMPANY_CATEGORIES = [
  "Fastfood", "Restaurant", "Nourriture",
  "Mode", 
  "Boutique Fleurs", 
  "Pharmacie", 
  "Mariage", 
  "Epicerie", 
  "Café", 
  "Pour Femme", 
  "Electronics", 
  "Pour homme", 
  "Maison", "Hotels/Piscine", "Tickets",
  "Bébé", 
  "Outils"
];

const VEHICLE_TYPES = ["Moto", "Voiture", "Bicyclette"];

export default function ManageProfiles() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activationDialog, setActivationDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const profileConfig = {
    client: {
      icon: User,
      label: 'Client',
      description: 'Commander et recevoir des livraisons',
      color: 'blue',
      requiresValidation: false
    },
    ...Object.fromEntries(BUSINESS_PROFILE_IDS.map((id) => {
      const profile = BUSINESS_PROFILES[id];
      return [id, {
        icon: profile.icon,
        label: profile.label,
        description: id === 'food'
          ? 'POS : commandes, préparation, retrait et livraison'
          : id === 'hospitality'
            ? 'Chambres, piscines, disponibilités et réservations'
            : id === 'tickets'
              ? 'Événements, billets, participants et scanner QR'
              : 'Vendre et gérer vos produits',
        color: 'orange',
        requiresValidation: false,
      }];
    })),
    livreur: {
      icon: Bike,
      label: 'Livreur',
      description: 'Effectuer des livraisons',
      color: 'green',
      requiresValidation: true
    },
    agent: {
      icon: Briefcase,
      label: 'Agent de Vente',
      description: 'Vendre pour Makarios Bridal',
      color: 'purple',
      requiresValidation: false
    }
  };

  const displayCurrentProfile = user?.current_profile === 'entreprise' || user?.current_profile === 'marketplace'
    ? 'client'
    : (user?.current_profile || 'client');

  const getProfileStatus = (profileType) => {
    const profiles = user?.profiles || {};
    const profile = profileType === 'marketplace'
      ? (profiles.marketplace || profiles.entreprise)
      : profiles[profileType];
    
    if (!profile || !profile.is_active) {
      return { status: 'inactive', label: 'Inactif', color: 'bg-slate-100 text-slate-600', icon: null };
    }
    
    if (profileType === 'livreur' && profile.status === 'pending') {
      return { status: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
    }
    
    if (profileType === 'livreur' && profile.status === 'rejected') {
      return { status: 'rejected', label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    }
    
    return { status: 'active', label: 'Actif', color: 'bg-green-100 text-green-700', icon: Check };
  };

  const handleActivateProfile = async (profileType) => {
    const storedProfile = profileType === 'marketplace' ? (user?.profiles?.marketplace || user?.profiles?.entreprise) : user?.profiles?.[profileType];
    const alreadyConfigured = profileType === 'client' || Boolean(
      profileType === 'livreur'
        ? storedProfile?.vehicle_type && storedProfile?.id_document_url && storedProfile?.status !== 'pending'
        : storedProfile?.company_name && storedProfile?.company_category
    );
    if (alreadyConfigured) {
      const profiles = deactivateOtherOperationalProfiles(user?.profiles || {}, profileType === 'marketplace' ? 'client' : profileType);
      profiles[profileType] = { ...(profiles[profileType] || {}), is_active: true, last_used: new Date().toISOString() };
      if (profileType === 'client') profiles.client = { ...(profiles.client || {}), is_active: true };
      await base44.auth.updateMe({ profiles, current_profile: profileType === 'marketplace' ? 'client' : profileType });
      setUser({ ...user, profiles, current_profile: profileType === 'marketplace' ? 'client' : profileType });
      toast.success(`Profil ${profileConfig[profileType]?.label || 'actif'} sélectionné`);
      navigate(createPageUrl(profileType === 'livreur' ? 'Dashboard' : profileType === 'client' ? 'Home' : 'Dashboard'));
      return;
    }
    setSelectedProfile(profileType);
    setFormData({});
    setActivationDialog(true);
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
      toast.success('Fichier téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleSubmitActivation = async () => {
    setSubmitting(true);
    
    try {
      let profiles = { ...(user.profiles || {}) };
      
      if (selectedProfile === 'marketplace' || selectedProfile === 'entreprise' || BUSINESS_PROFILE_IDS.includes(selectedProfile)) {
        if (!formData.company_name || !formData.company_category) {
          toast.error('Veuillez remplir tous les champs');
          setSubmitting(false);
          return;
        }
        
        const profileData = {
          is_active: true,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          company_name: formData.company_name,
          company_category: formData.company_category,
          company_logo_url: formData.company_logo_url || '',
          moncash_number: formData.moncash_number || '',
          natcash_number: formData.natcash_number || '',
          whatsapp_number: formData.whatsapp_number || '',
          rating: 5,
          delivery_time_minutes: 30
        };

        profiles = deactivateOtherOperationalProfiles(profiles, selectedProfile === 'entreprise' ? 'marketplace' : selectedProfile);
        if (selectedProfile === 'marketplace' || selectedProfile === 'entreprise') {
          profiles.marketplace = profileData;
          profiles.entreprise = profileData;
        } else {
          profiles[selectedProfile] = { ...profileData, business_profile: selectedProfile };
        }
        
        await base44.auth.updateMe({ profiles, current_profile: selectedProfile === 'entreprise' ? 'marketplace' : selectedProfile });
        toast.success('Profil entreprise activé! Les autres profils opérationnels sont désactivés.');
        window.location.reload();
        
      } else if (selectedProfile === 'agent') {
        profiles = deactivateOtherOperationalProfiles(profiles, 'agent');
        profiles.agent = {
          is_active: true,
          validation_status: 'approved',
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          phone: user.phone || '',
          address: user.address || ''
        };
        
        await base44.auth.updateMe({ profiles, current_profile: 'agent' });
        toast.success('Profil Agent de Vente activé! Les autres profils opérationnels sont désactivés.');
        window.location.reload();
        
      } else if (selectedProfile === 'livreur') {
        if (!formData.vehicle_type || !formData.id_document_url) {
          toast.error('Veuillez remplir tous les champs et télécharger votre document');
          setSubmitting(false);
          return;
        }
        
        // Create profile switch request for admin validation
        await base44.entities.ProfileSwitch.create({
          user_id: user.id,
          user_name: user.full_name,
          from_profile: user.current_profile,
          to_profile: 'livreur',
          status: 'pending',
          data: {
            vehicle_type: formData.vehicle_type,
            id_document_url: formData.id_document_url,
            phone: user.phone,
            commune: user.commune
          }
        });
        
        // Update user profile to pending
        profiles.livreur = {
          is_active: false,
          status: 'pending',
          created_at: new Date().toISOString(),
          vehicle_type: formData.vehicle_type,
          id_document_url: formData.id_document_url,
          is_available: false
        };
        
        await base44.auth.updateMe({ profiles });
        toast.success('Demande soumise! En attente de validation admin.');
        window.location.reload();
      }
      
      setActivationDialog(false);
      
    } catch (error) {
      toast.error('Erreur lors de l\'activation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Gérer mes profils</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Current Profile */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-500 mb-2">Profil actif</h2>
          <Card className="border-2 border-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {React.createElement(profileConfig[displayCurrentProfile].icon, {
                    className: 'w-8 h-8 text-orange-500'
                  })}
                  <div>
                    <p className="font-semibold">{profileConfig[displayCurrentProfile].label}</p>
                    <p className="text-sm text-slate-500">{profileConfig[displayCurrentProfile].description}</p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Profiles */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 mb-3">Tous mes profils</h2>
          <div className="space-y-3">
            {Object.entries(profileConfig).map(([key, config]) => {
              const Icon = config.icon;
              const status = getProfileStatus(key);
              const isCurrentProfile = key === user.current_profile;
              
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={isCurrentProfile ? 'border-orange-200 bg-orange-50/50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${config.color}-100`}>
                            <Icon className={`w-6 h-6 text-${config.color}-600`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{config.label}</h3>
                              <Badge variant="secondary" className={status.color}>
                                {status.icon && React.createElement(status.icon, { className: 'w-3 h-3 mr-1' })}
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">{config.description}</p>
                            
                            {/* Show details for active profiles */}
                            {status.status === 'active' && ['marketplace', 'food', 'hospitality', 'tickets'].includes(key) && (
                              <p className="text-xs text-slate-600 mt-1">
                                {(user.profiles?.[key] || user.profiles?.entreprise)?.company_name}
                              </p>
                            )}
                            
                            {status.status === 'active' && key === 'livreur' && (
                              <p className="text-xs text-slate-600 mt-1">
                                {user.profiles?.livreur?.vehicle_type}
                              </p>
                            )}
                            
                            {status.status === 'pending' && (
                              <p className="text-xs text-yellow-600 mt-1">
                                Validation en cours...
                              </p>
                            )}
                            
                            {status.status === 'rejected' && (
                              <p className="text-xs text-red-600 mt-1">
                                Demande rejetée. Contactez le support.
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {status.status === 'inactive' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => handleActivateProfile(key)}
                          >
                            <Plus className="w-4 h-4" />
                            Activer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Activation Dialog */}
      <Dialog open={activationDialog} onOpenChange={setActivationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Activer le profil {selectedProfile && profileConfig[selectedProfile].label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {['marketplace', 'entreprise', 'food', 'hospitality', 'tickets'].includes(selectedProfile) && (
              <>
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    value={formData.company_name || ''}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Ex: Restaurant Le Délice"
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select 
                    value={formData.company_category || ''} 
                    onValueChange={(val) => setFormData({ ...formData, company_category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Numéro Moncash</Label>
                  <Input
                    value={formData.moncash_number || ''}
                    onChange={(e) => setFormData({ ...formData, moncash_number: e.target.value })}
                    placeholder="Ex: 50912345678"
                  />
                </div>
                <div>
                  <Label>Numéro Natcash</Label>
                  <Input
                    value={formData.natcash_number || ''}
                    onChange={(e) => setFormData({ ...formData, natcash_number: e.target.value })}
                    placeholder="Ex: 50912345678"
                  />
                </div>
                <div>
                  <Label>Numéro WhatsApp (sans +)</Label>
                  <Input
                    value={formData.whatsapp_number || ''}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="Ex: 50912345678"
                  />
                </div>
                <div>
                  <Label>Logo (optionnel)</Label>
                  <div className="mt-2">
                    {formData.company_logo_url ? (
                      <img src={formData.company_logo_url} alt="" className="h-20 w-20 object-cover rounded-lg" />
                    ) : (
                      <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-orange-300">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'company_logo_url')}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {selectedProfile === 'agent' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">Agent de Vente Makarios Bridal</h3>
                </div>
                <p className="text-sm text-purple-800">
                  En activant ce profil, vous pourrez vendre les produits Makarios Bridal et gagner 10% de commission sur chaque vente.
                </p>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-purple-700 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Accès au catalogue complet
                  </p>
                  <p className="text-xs text-purple-700 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Gestion de vos clients
                  </p>
                  <p className="text-xs text-purple-700 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Suivi des commissions
                  </p>
                </div>
              </div>
            )}

            {selectedProfile === 'livreur' && (
              <>
                <div>
                  <Label>Type de véhicule</Label>
                  <Select 
                    value={formData.vehicle_type || ''} 
                    onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document d'identification (requis)</Label>
                  <div className="mt-2">
                    {formData.id_document_url ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 text-sm">Document téléchargé</span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-orange-300">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-sm text-slate-500 mt-1">Télécharger votre CIN ou Permis</span>
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'id_document_url')}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Votre demande sera soumise à validation par un administrateur. Vous recevrez une notification une fois approuvée.
                  </p>
                </div>
              </>
            )}
            
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={handleSubmitActivation}
              disabled={submitting}
            >
              {submitting ? 'Activation...' : 'Activer ce profil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
