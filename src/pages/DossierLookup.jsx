import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2, AlertCircle, User, Calendar, FileText, ClipboardList, Image } from 'lucide-react';
const FIELD_LABELS = {
  'INVOICE NUMBER': 'N° Facture',
  'ID': 'Référence',
  'Date Mariage': 'Date du mariage',
  'Nom Client': 'Client',
  'Description': 'Description',
  'Status': 'Progression',
  'Details important': 'Détails importants',
  'Assigne a': 'Assigné à',
  'Deja Realisee': 'Déjà Réalisée',
};

const HIDDEN_FIELDS = ['_RowNumber', 'Row ID'];

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

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await base44.functions.invoke('appsheetQuery', {
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

  const renderField = (key, value) => {
    const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');

    // Déjà Réalisée — description des travaux complétés
    if (key === 'Deja Realisee' && value) {
      return (
        <div key={key} className="py-3">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">{label}</span>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{value}</p>
        </div>
      );
    }

    // Barre de progression pour le statut
    if (key === 'Status') {
      const pct = parseInt(String(value).replace('%', ''), 10) || 0;
      return (
        <div key={key} className="py-3">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">{label}</span>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">{pct}%</span>
          </div>
        </div>
      );
    }

    // Photos
    if (key.startsWith('PHOTO') && value) {
      const isImageUrl = value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:'));
      if (!isImageUrl) return null;
      return (
        <div key={key} className="py-3">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">{label}</span>
          <img
            src={value}
            alt={label}
            className="w-full max-w-xs rounded-lg border border-gray-200 object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // Description et détails — texte long
    if ((key === 'Description' || key === 'Details important') && value) {
      return (
        <div key={key} className="py-3">
          <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">{label}</span>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{value}</p>
        </div>
      );
    }

    // Champ standard
    const displayValue = value === null || value === undefined || value === '' ? '—' : String(value);
    return (
      <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
        <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
        <span className="text-sm text-gray-900 font-medium text-right ml-4">{displayValue}</span>
      </div>
    );
  };

  const renderDataFields = (data) => {
    if (!data) return null;

    const priorityOrder = [
      'INVOICE NUMBER', 'ID', 'Nom Client', 'Date Mariage',
      'Status', 'Deja Realisee', 'Assigne a', 'Details important', 'Description'
    ];

    const fields = Object.entries(data)
      .filter(([key]) => !HIDDEN_FIELDS.includes(key) && !key.startsWith('PHOTO'))
      .sort(([a], [b]) => {
        const aIdx = priorityOrder.indexOf(a);
        const bIdx = priorityOrder.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

    const isImageUrl = (v) => v && (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:'));
    const photoFields = Object.entries(data)
      .filter(([key]) => key.startsWith('PHOTO') && isImageUrl(data[key]));

    return (
      <>
        {fields.map(([key, value]) => renderField(key, value))}
        {photoFields.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              {photoFields.map(([key, value]) => renderField(key, value))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
              <ClipboardList className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Suivre ma commande</h1>
            <p className="text-gray-500 mt-2">
              Entrez votre numéro de facture pour suivre votre dossier.
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
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value);
                        setError('');
                      }}
                      placeholder="Ex: 1122334455"
                      className="flex-1 text-lg text-center tracking-widest"
                      autoFocus
                      maxLength={50}
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
                    Numéro unique figurant sur votre facture.
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
                  <FileText className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-lg">Détails du dossier</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {renderDataFields(result.data)}
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