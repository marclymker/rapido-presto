import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText, Package, User, Phone, Shield, Loader2, AlertCircle } from 'lucide-react';
import SEO from '@/components/SEO';

const TABLE_OPTIONS = [
  { value: 'Dossiers', label: 'Dossiers', icon: FileText },
  { value: 'Commandes', label: 'Commandes', icon: Package },
  { value: 'Inventaire', label: 'Inventaire', icon: Package },
  { value: 'Clients', label: 'Clients', icon: User },
  { value: 'Contacts', label: 'Contacts', icon: Phone },
];

export default function DossierLookup() {
  const [accessCode, setAccessCode] = useState('');
  const [tableName, setTableName] = useState('Dossiers');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const code = accessCode.trim();
    if (!code) {
      setError('Veuillez entrer un code d\'accès');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await base44.functions.invoke('appsheetQuery', {
        tableName,
        accessCode: code
      });

      if (response.data?.error) {
        setError(response.data.error);
      } else {
        setResult(response.data);
      }
    } catch (err) {
      setError('Impossible de contacter le serveur. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const renderDataFields = (data) => {
    if (!data) return null;
    return Object.entries(data).map(([key, value]) => {
      if (key === 'Row ID' || key === '_RowNumber' || key.startsWith('_')) return null;
      return (
        <div key={key} className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 last:border-0">
          <span className="text-xs font-semibold text-gray-500 uppercase w-full sm:w-48 shrink-0 mb-1 sm:mb-0">
            {key.replace(/_/g, ' ')}
          </span>
          <span className="text-sm text-gray-900 break-words">
            {value === null || value === undefined ? '—' : String(value)}
          </span>
        </div>
      );
    });
  };

  return (
    <>
      <SEO
        title="Consultation de dossier | Rapido Presto"
        description="Consultez votre dossier en toute sécurité avec votre code d'accès unique."
      />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Consultation de dossier</h1>
            <p className="text-gray-500 mt-2">
              Entrez votre code d'accès unique pour consulter votre dossier.
            </p>
          </div>

          {/* Formulaire */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Sélecteur de table */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                    Type de dossier
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {TABLE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setTableName(option.value);
                            setResult(null);
                            setError('');
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                            tableName === option.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Code d'accès */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                    Code d'accès
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value);
                        setError('');
                      }}
                      placeholder="Entrez votre code dossier..."
                      className="flex-1"
                      autoFocus
                      maxLength={50}
                      disabled={loading}
                    />
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Message d'erreur */}
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">
                    Résultat — {result.table}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {renderDataFields(result.data)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mentions sécurité */}
          <p className="text-center text-xs text-gray-400 mt-8">
            🔒 Connexion sécurisée • Vos données sont protégées
          </p>
        </div>
      </div>
    </>
  );
}