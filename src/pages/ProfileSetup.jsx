import React, { useState, useEffect } from 'react';
import { firebase } from '@/api/firebaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, Building2, Bike, MapPin, Phone, Upload, ChevronRight, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';

const REGIONS = [
  "Petion-ville", "Route de Freres", "Delmas", "Pelerin", "Thomassain", "Kenscoff",
  "Lalue", "Nazon", "Pernier", "Sarthe", "Tabarre", "Clercine", "Marrin",
  "Bon Repos", "Turgeau", "Canapevert", "Lavil", "Madeline", "Vaudreuil",
  "Morne Rouge", "Cap Haitien", "St Marc", "Gonaives", "Les Cayes"
];

const COMPANY_CATEGORIES = [
  "Fastfood", "Mode", "Boutique Fleurs", "Pharmacie", "Vêtements",
  "Epicerie", "Café", "Boulangerie", "Pour Femme", "Electronics", "Pour homme", "Maison"
];

const VEHICLE_TYPES = ["Moto", "Voiture", "Bicyclette"];

export default function ProfileSetup() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    user_type: 'client',
    region: '',
    phone: '',
    address: '',
    // Enterprise fields
    company_name: '',
    company_category: '',
    company_logo_url: '',
    // Driver fields
    vehicle_type: '',
    id_document_url: ''
  });

  useEffect(() => {
    firebase.auth.me().then(u => {
      setUser(u);
      // If user already has a profile, redirect to appropriate page
      if (u.current_profile) {
        redirectToUserDashboard(u.current_profile);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      navigate(createPageUrl('Home'));
    });
  }, []);

  const redirectToUserDashboard = (userType) => {
    switch (userType) {
      case 'entreprise':
        navigate(createPageUrl('EnterpriseDashboard'));
        break;
      case 'livreur':
        navigate(createPageUrl('DriverDashboard'));
        break;
      case 'agent':
        navigate(createPageUrl('AgentDashboard'));
        break;
      default:
        navigate(createPageUrl('Home'));
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await firebase.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
      toast.success('Fichier téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profiles = {
        client: { is_active: false, created_at: null },
        entreprise: { is_active: false, created_at: null },
        livreur: { is_active: false, status: 'pending', created_at: null },
        agent: { is_active: false, validation_status: 'pending', created_at: null }
      };

      // Activate selected profile
      if (formData.user_type === 'client') {
        profiles.client = {
          is_active: true,
          created_at: now,
          last_used: now
        };
      } else if (formData.user_type === 'agent') {
        profiles.agent = {
          is_active: true,
          validation_status: 'approved',
          created_at: now,
          last_used: now,
          phone: formData.phone,
          address: formData.address
        };
      } else if (formData.user_type === 'entreprise') {
        // Create Shop entity for enterprise
        const shopData = {
          user_id: user.id,
          company_name: formData.company_name,
          company_category: formData.company_category,
          company_logo_url: formData.company_logo_url || '',
          region: formData.region,
          phone: formData.phone,
          rating: 5,
          delivery_time_minutes: 30,
          is_active: true
        };
        const shop = await firebase.entities.Shop.create(shopData);

        profiles.entreprise = {
          is_active: true,
          created_at: now,
          last_used: now,
          company_name: formData.company_name,
          company_category: formData.company_category,
          company_logo_url: formData.company_logo_url || '',
          shop_id: shop.id,
          rating: 5,
          delivery_time_minutes: 30
        };

        // Keep client profile inactive
        profiles.client = {
          is_active: false,
          created_at: null
        };
      } else if (formData.user_type === 'livreur') {
        profiles.livreur = {
          is_active: true,
          status: 'approved',
          created_at: now,
          last_used: now,
          vehicle_type: formData.vehicle_type,
          id_document_url: formData.id_document_url,
          is_available: true
        };
      }

      await firebase.auth.updateMe({
        current_profile: formData.user_type,
        region: formData.region,
        phone: formData.phone,
        address: formData.address,
        profiles: profiles
      });

      toast.success('Profil créé avec succès!');
      redirectToUserDashboard(formData.user_type);
    } catch (error) {
      toast.error('Erreur lors de la création du profil');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!formData.user_type;
    if (step === 2) {
      if (!formData.region || !formData.phone) return false;
      if (formData.user_type === 'entreprise' && (!formData.company_name || !formData.company_category)) return false;
      if (formData.user_type === 'livreur' && (!formData.vehicle_type || !formData.id_document_url)) return false;
      return true;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500">Rapido Presto</h1>
          <p className="text-slate-600 mt-2">Bienvenue, {user?.full_name}!</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-orange-500' : 'bg-white'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: User Type Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <h2 className="text-xl font-semibold mb-6">Comment souhaitez-vous utiliser Rapido Presto?</h2>

              <RadioGroup
                value={formData.user_type}
                onValueChange={(val) => setFormData({ ...formData, user_type: val })}
                className="space-y-3"
              >
                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.user_type === 'client'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-200'
                  }`}
                >
                  <RadioGroupItem value="client" className="sr-only" />
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    formData.user_type === 'client' ? 'bg-orange-500' : 'bg-slate-100'
                  }`}>
                    <User className={`w-6 h-6 ${formData.user_type === 'client' ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Client</p>
                    <p className="text-sm text-slate-500">Commander et recevoir des livraisons</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.user_type === 'entreprise'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-200'
                  }`}
                >
                  <RadioGroupItem value="entreprise" className="sr-only" />
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    formData.user_type === 'entreprise' ? 'bg-orange-500' : 'bg-slate-100'
                  }`}>
                    <Building2 className={`w-6 h-6 ${formData.user_type === 'entreprise' ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Entreprise</p>
                    <p className="text-sm text-slate-500">Vendre et gérer mes produits</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.user_type === 'livreur'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-200'
                  }`}
                >
                  <RadioGroupItem value="livreur" className="sr-only" />
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    formData.user_type === 'livreur' ? 'bg-orange-500' : 'bg-slate-100'
                  }`}>
                    <Bike className={`w-6 h-6 ${formData.user_type === 'livreur' ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Livreur</p>
                    <p className="text-sm text-slate-500">Effectuer des livraisons</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.user_type === 'agent'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-200'
                  }`}
                >
                  <RadioGroupItem value="agent" className="sr-only" />
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    formData.user_type === 'agent' ? 'bg-orange-500' : 'bg-slate-100'
                  }`}>
                    <Briefcase className={`w-6 h-6 ${formData.user_type === 'agent' ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium">Agent de Vente</p>
                    <p className="text-sm text-slate-500">Vendre pour Makarios Bridal</p>
                  </div>
                </label>
              </RadioGroup>

              <Button
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 h-12"
                onClick={() => setStep(2)}
                disabled={!canProceed()}
              >
                Continuer
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <h2 className="text-xl font-semibold mb-6">Complétez votre profil</h2>

              <div className="space-y-4">
                {/* Common fields */}
                <div>
                  <Label>Région</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(val) => setFormData({ ...formData, region: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner votre région" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+509 1234 5678"
                      className="pl-10"
                    />
                  </div>
                </div>

                {formData.user_type === 'client' && (
                  <div>
                    <Label>Adresse de livraison</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Votre adresse"
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                {/* Enterprise fields */}
                {formData.user_type === 'entreprise' && (
                  <>
                    <div>
                      <Label>Nom de l'entreprise</Label>
                      <Input
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="Ex: Restaurant Le Délice"
                      />
                    </div>
                    <div>
                      <Label>Catégorie</Label>
                      <Select
                        value={formData.company_category}
                        onValueChange={(val) => setFormData({ ...formData, company_category: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Logo de l'entreprise (optionnel)</Label>
                      <div className="mt-2">
                        {formData.company_logo_url ? (
                          <img src={formData.company_logo_url} alt="" className="h-24 w-24 object-cover rounded-xl" />
                        ) : (
                          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer hover:border-orange-300">
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-sm text-slate-500 mt-1">Télécharger</span>
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

                {/* Driver fields */}
                {formData.user_type === 'livreur' && (
                  <>
                    <div>
                      <Label>Type de véhicule</Label>
                      <Select
                        value={formData.vehicle_type}
                        onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner votre véhicule" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Document d'identification (CIN ou Permis)</Label>
                      <div className="mt-2">
                        {formData.id_document_url ? (
                          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-green-700">Document téléchargé</span>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer hover:border-orange-300">
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-sm text-slate-500 mt-1">Télécharger votre document</span>
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
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Retour
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handleSubmit}
                  disabled={!canProceed() || saving}
                >
                  {saving ? 'Création...' : 'Créer mon compte'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}