import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Building2, Mail, Phone, Wallet, Plus, Trash2, LogOut, Landmark } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function EnterpriseAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ phone: '' });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ type: 'bank', details: '' });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFormData({ phone: u.phone || '' });
      setLoading(false);
      
      // Redirect if wrong profile
      if (u.current_profile !== 'entreprise') {
        window.location.href = createPageUrl(
          u.current_profile === 'client' ? 'Home' : 'DriverDashboard'
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
      setNewPayment({ type: 'bank', details: '' });
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

  if (!user || user.current_profile !== 'entreprise') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Accès réservé aux entreprises</p>
      </div>
    );
  }

  const entrepriseData = user.profiles?.entreprise || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('EnterpriseDashboard')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mon Compte</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Company Info */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden">
              {entrepriseData.company_logo_url ? (
                <img src={entrepriseData.company_logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-orange-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg text-slate-800">{entrepriseData.company_name}</h2>
              <p className="text-sm text-slate-500">{entrepriseData.company_category}</p>
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
        </div>

        {/* Payment Methods (for receiving) */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Moyens de réception des paiements</h3>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un moyen de réception</DialogTitle>
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
                        <SelectItem value="bank">Compte bancaire (RIB)</SelectItem>
                        <SelectItem value="moncash">Moncash</SelectItem>
                        <SelectItem value="natcash">Natcash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>
                      {newPayment.type === 'bank' ? 'RIB / IBAN' : 'Numéro de téléphone'}
                    </Label>
                    <Input
                      value={newPayment.details}
                      onChange={(e) => setNewPayment({ ...newPayment, details: e.target.value })}
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
              <p className="text-slate-500 text-sm text-center py-4">Aucun moyen de paiement configuré</p>
            ) : (
              (user.payment_methods || []).map((pm, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {pm.type === 'bank' ? (
                      <Landmark className="w-5 h-5 text-blue-500" />
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
        <Button 
          variant="outline" 
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </main>
    </div>
  );
}