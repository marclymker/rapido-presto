import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Building2, Bike, MapPin, Phone, Upload, ChevronRight } from 'lucide-react';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';

const REGIONS = [
  "Petion-ville", "Route de Freres", "Delmas", "Pelerin", "Thomassain", "Kenscoff",
  "Lalue", "Nazon", "Pernier", "Sarthe", "Tabarre", "Clercine", "Marrin",
  "Bon Repos", "Turgeau", "Canapevert", "Lavil", "Madeline", "Vaudreuil",
  "Morne Rouge", "Cap Haitien", "St Marc", "Gonaives", "Les Cayes"
];

const COMPANY_CATEGORIES = [
  "Fastfood", "Restaurants", "Boutique Fleurs", "Pharmacie",
  "Epicerie", "Café", "Pour Femme", "Electronics", "Pour homme", "Maison", "Bébé", "Outils"
];

const VEHICLE_TYPES = ["Moto", "Voiture", "Bicyclette"];

export default function ProfileCompletionModal({ user, open, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    user_type: 'client',
    region: '',
    phone: '',
    address: '',
    company_name: '',
    company_category: '',
    company_logo_url: '',
    vehicle_type: '',
    id_document_url: ''
  });

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

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profiles = {
        client: { is_active: false, created_at: null },
        entreprise: { is_active: false, created_at: null },
        livreur: { is_active: false, status: 'pending', created_at: null }
      };

      if (formData.user_type === 'client') {
        profiles.client = {
          is_active: true,
          created_at: now,
          last_used: now
        };
      } else if (formData.user_type === 'entreprise') {
        profiles.entreprise = {
          is_active: true,
          created_at: now,
          last_used: now,
          company_name: formData.company_name,
          company_category: formData.company_category,
          company_logo_url: formData.company_logo_url || '',
          rating: 5,
          delivery_time_minutes: 30
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

      await base44.auth.updateMe({
        current_profile: formData.user_type,
        region: formData.region,
        phone: formData.phone,
        address: formData.address,
        profiles: profiles
      });

      toast.success('Profil créé avec succès!');
      onComplete(formData.user_type);
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" hideClose>
        <div className="py-2">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-orange-500">Rapido Presto</h2>
            <p className="text-slate-600 mt-1">Bienvenue, {user?.full_name}!</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map(s => (
              <div 
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-orange-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-lg font-semibold mb-4">Comment souhaitez-vous utiliser Rapido Presto?</h3>

                <RadioGroup 
                  value={formData.user_type} 
                  onValueChange={(val) => setFormData({ ...formData, user_type: val })}
                  className="space-y-3"
                >
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.user_type === 'client' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-200'
                  }`}>
                    <RadioGroupItem value="client" className="sr-only" />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.user_type === 'client' ? 'bg-orange-500' : 'bg-slate-100'
                    }`}>
                      <User className={`w-5 h-5 ${formData.user_type === 'client' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Client</p>
                      <p className="text-xs text-slate-500">Commander et recevoir des livraisons</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.user_type === 'entreprise' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-200'
                  }`}>
                    <RadioGroupItem value="entreprise" className="sr-only" />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.user_type === 'entreprise' ? 'bg-orange-500' : 'bg-slate-100'
                    }`}>
                      <Building2 className={`w-5 h-5 ${formData.user_type === 'entreprise' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Entreprise</p>
                      <p className="text-xs text-slate-500">Vendre et gérer mes produits</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.user_type === 'livreur' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-200'
                  }`}>
                    <RadioGroupItem value="livreur" className="sr-only" />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.user_type === 'livreur' ? 'bg-orange-500' : 'bg-slate-100'
                    }`}>
                      <Bike className={`w-5 h-5 ${formData.user_type === 'livreur' ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Livreur</p>
                      <p className="text-xs text-slate-500">Effectuer des livraisons</p>
                    </div>
                  </label>
                </RadioGroup>

                <Button 
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600"
                  onClick={() => setStep(2)}
                  disabled={!canProceed()}
                >
                  Continuer
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-lg font-semibold mb-4">Complétez votre profil</h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Région</Label>
                    <Select 
                      value={formData.region} 
                      onValueChange={(val) => setFormData({ ...formData, region: val })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+509 1234 5678"
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>

                  {formData.user_type === 'client' && (
                    <div>
                      <Label className="text-sm">Adresse de livraison</Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Votre adresse"
                          className="pl-9 h-9"
                        />
                      </div>
                    </div>
                  )}

                  {formData.user_type === 'entreprise' && (
                    <>
                      <div>
                        <Label className="text-sm">Nom de l'entreprise</Label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Ex: Restaurant Le Délice"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Catégorie</Label>
                        <Select 
                          value={formData.company_category} 
                          onValueChange={(val) => setFormData({ ...formData, company_category: val })}
                        >
                          <SelectTrigger className="h-9">
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
                        <Label className="text-sm">Logo (optionnel)</Label>
                        {formData.company_logo_url ? (
                          <img src={formData.company_logo_url} alt="" className="h-16 w-16 object-cover rounded-lg mt-1" />
                        ) : (
                          <label className="flex flex-col items-center justify-center h-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-orange-300 mt-1">
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
                    </>
                  )}

                  {formData.user_type === 'livreur' && (
                    <>
                      <div>
                        <Label className="text-sm">Type de véhicule</Label>
                        <Select 
                          value={formData.vehicle_type} 
                          onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}
                        >
                          <SelectTrigger className="h-9">
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
                        <Label className="text-sm">Document d'identification</Label>
                        {formData.id_document_url ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mt-1">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm text-green-700">Document téléchargé</span>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-orange-300 mt-1">
                            <Upload className="w-5 h-5 text-slate-400" />
                            <span className="text-xs text-slate-500 mt-1">Télécharger</span>
                            <input 
                              type="file" 
                              accept="image/*,.pdf" 
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'id_document_url')}
                            />
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button 
                    variant="outline"
                    className="flex-1 h-9"
                    onClick={() => setStep(1)}
                  >
                    Retour
                  </Button>
                  <Button 
                    className="flex-1 bg-orange-500 hover:bg-orange-600 h-9"
                    onClick={handleSubmit}
                    disabled={!canProceed() || saving}
                  >
                    {saving ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}