import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, User, Mail, MapPin, Phone, CreditCard, Plus, Trash2, LogOut, Wallet, Lock, AlertCircle, Banknote } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const REGIONS = [
  "Petion-ville", "Route de Freres", "Delmas", "Pelerin", "Thomassain", "Kenscoff",
  "Lalue", "Nazon", "Pernier", "Sarthe", "Tabarre", "Clercine", "Marrin",
  "Bon Repos", "Turgeau", "Canapevert", "Lavil", "Madeline", "Vaudreuil",
  "Morne Rouge", "Cap Haitien", "St Marc", "Gonaives", "Les Cayes"
];

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ type: 'card', details: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFormData({
        phone: u.phone || '',
        address: u.address || '',
        region: u.region || ''
      });
      setLoading(false);
      
      // Redirect if wrong profile
      if (u.current_profile !== 'client') {
        window.location.href = createPageUrl(
          u.current_profile === 'entreprise' ? 'EnterpriseDashboard' : 'DriverDashboard'
        );
      }
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await base44.auth.updateMe(formData);
      setUser({ ...user, ...formData });
      setEditMode(false);
      toast.success('Informations mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleAddPayment = async () => {
    const payments = user.payment_methods || [];
    const newPaymentMethod = {
      type: newPayment.type,
      details: newPayment.details,
      last_digits: newPayment.details.slice(-4)
    };
    
    try {
      await base44.auth.updateMe({
        payment_methods: [...payments, newPaymentMethod]
      });
      setUser({ ...user, payment_methods: [...payments, newPaymentMethod] });
      setPaymentDialogOpen(false);
      setNewPayment({ type: 'card', details: '' });
      toast.success('Moyen de paiement ajouté');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleDeletePayment = async (index) => {
    const payments = [...(user.payment_methods || [])];
    payments.splice(index, 1);
    
    try {
      await base44.auth.updateMe({ payment_methods: payments });
      setUser({ ...user, payment_methods: payments });
      toast.success('Moyen de paiement supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Veuillez vous connecter</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mon Compte</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-slate-800">{user.full_name}</h2>
              <p className="text-sm text-slate-500 capitalize">{user.user_type || 'client'}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-5 h-5 text-slate-400" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Editable Info */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Informations</h3>
            {!editMode ? (
              <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  Annuler
                </Button>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleSave}>
                  Enregistrer
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-500 text-sm">Téléphone</Label>
              {editMode ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Votre numéro"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-700 mt-1">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user.phone || 'Non défini'}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-slate-500 text-sm">Adresse</Label>
              {editMode ? (
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Votre adresse"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-700 mt-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{user.address || 'Non définie'}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-slate-500 text-sm">Région</Label>
              {editMode ? (
                <Select 
                  value={formData.region} 
                  onValueChange={(val) => setFormData({ ...formData, region: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-slate-700 mt-1">{user.region || 'Non définie'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-600" />
            Sécurité
          </h3>
          
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Lock className="w-4 h-4 mr-2" />
                Changer le mot de passe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Changer le mot de passe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Mot de passe actuel</Label>
                  <Input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  />
                </div>
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    if (passwordData.new !== passwordData.confirm) {
                      toast.error('Les mots de passe ne correspondent pas');
                      return;
                    }
                    toast.success('Mot de passe mis à jour');
                    setPasswordDialogOpen(false);
                    setPasswordData({ current: '', new: '', confirm: '' });
                  }}
                >
                  Mettre à jour
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold mb-4">Moyens de paiement</h3>
          
          {/* Available Payment Methods */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-2 font-medium">Méthodes acceptées:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="text-xs">Cash</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-orange-600" />
                <span className="text-xs">MonCash</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span className="text-xs">Natcash</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Carte</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">Mes moyens enregistrés</p>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un moyen de paiement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={newPayment.type} 
                      onValueChange={(val) => setNewPayment({ ...newPayment, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Carte de débit/crédit</SelectItem>
                        <SelectItem value="moncash">Moncash</SelectItem>
                        <SelectItem value="natcash">Natcash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{newPayment.type === 'card' ? 'Numéro de carte' : 'Numéro de téléphone'}</Label>
                    <Input
                      value={newPayment.details}
                      onChange={(e) => setNewPayment({ ...newPayment, details: e.target.value })}
                      placeholder={newPayment.type === 'card' ? '1234 5678 9012 3456' : '+509 1234 5678'}
                    />
                  </div>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleAddPayment}>
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {(user.payment_methods || []).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Aucun moyen de paiement</p>
            ) : (
              (user.payment_methods || []).map((pm, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {pm.type === 'card' ? (
                      <CreditCard className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Wallet className="w-5 h-5 text-orange-500" />
                    )}
                    <div>
                      <p className="font-medium capitalize">{pm.type}</p>
                      <p className="text-sm text-slate-500">•••• {pm.last_digits}</p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-red-500"
                    onClick={() => handleDeletePayment(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        {/* Delete Account */}
        <div className="pt-2 pb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                <AlertCircle className="w-4 h-4 mr-2" />
                Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}