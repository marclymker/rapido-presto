import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Package, Loader2, AlertCircle, CheckCircle, Truck, MapPin, Clock } from 'lucide-react';
import SEO from '@/components/SEO';

export default function DossierLookup() {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const code = invoiceNumber.trim();
    if (!code) {
      setError('Veuillez entrer votre numéro de facture');
      return;
    }
    if (!/^\d+$/.test(code)) {
      setError('Le numéro de facture doit être numérique');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await base44.functions.invoke('appsheetQuery', {
        tableName: 'Commandes',
        accessCode: code
      });

      if (response.data?.error) {
        setError(response.data.error);
      } else if (response.data?.success) {
        setResult(response.data);
      } else {
        setError('Réponse inattendue du serveur');
      }
    } catch (err) {
      setError('Service temporairement indisponible. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = String(status).toLowerCase();
    let color = 'bg-gray-100 text-gray-700';
    let icon = Clock;

    if (s.includes('livré') || s.includes('delivered') || s.includes('complété')) {
      color = 'bg-green-100 text-green-700';
      icon = CheckCircle;
    } else if (s.includes('cours') || s.includes('progress') || s.includes('prépar')) {
      color = 'bg-blue-100 text-blue-700';
      icon = Package;
    } else if (s.includes('annul')) {
      color = 'bg-red-100 text-red-700';
      icon = AlertCircle;
    } else if (s.includes('livraison') || s.includes('delivery') || s.includes('route')) {
      color = 'bg-orange-100 text-orange-700';
      icon = Truck;
    }

    const Icon = icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  const renderDataFields = (data) => {
    if (!data) return null;
    const priorityKeys = [
      'Numéro de commande', 'Numero de commande', 'Order Number', 'Invoice Number',
      'Statut', 'Status', 'État',
      'Client', 'Customer', 'Nom',
      'Total', 'Montant', 'Prix',
      'Date', 'Date de commande',
      'Adresse', 'Address', 'Livraison'
    ];

    const entries = Object.entries(data)
      .filter(([key]) => key !== 'Row ID' && !key.startsWith('_'))
      .sort(([a], [b]) => {
        const aIdx = priorityKeys.findIndex(k => a.toLowerCase().includes(k.toLowerCase()));
        const bIdx = priorityKeys.findIndex(k => b.toLowerCase().includes(k.toLowerCase()));
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

    return entries.map(([key, value]) => (
      <div key={key} className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-0">
        <span className="text-xs font-semibold text-gray-500 uppercase w-full sm:w-44 shrink-0 mb-1 sm:mb-0">
          {key.replace(/_/g, ' ')}
        </span>
        <span className="text-sm text-gray-900 break-words">
          {key.toLowerCase().includes('statut') || key.toLowerCase().includes('status') || key.toLowerCase().includes('état')
            ? getStatusBadge(value)
            : value === null || value === undefined ? '—' : String(value)}
        </span>
      </div>
    ));
  };

  return (
    <>
      <SEO
        title="Suivre ma commande | Rapido Presto"
        description="Suivez l'évolution de votre commande en temps réel avec votre numéro de facture."
      />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
              <Truck className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Suivre ma commande</h1>
            <p className="text-gray-500 mt-2">
              Entrez votre numéro de facture pour suivre l'évolution de votre commande.
            </p>
          </div>

          {/* Formulaire */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                    Numéro de facture
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value);
                        setError('');
                      }}
                      placeholder="Ex: 10425"
                      className="flex-1 text-lg text-center tracking-widest"
                      autoFocus
                      maxLength={20}
                      disabled={loading}
                    />
                    <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Il s'agit du numéro unique figurant sur votre facture.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Résultat */}
          {result && result.data && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-lg">Détails de la commande</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {renderDataFields(result.data)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sécurité */}
          <p className="text-center text-xs text-gray-400 mt-8">
            🔒 Connexion sécurisée • Vos informations sont protégées
          </p>
        </div>
      </div>
    </>
  );
}