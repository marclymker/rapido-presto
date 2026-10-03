import React, { useState, useCallback } from 'react';
import { firebase } from '@/api/firebaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Database,
  Download,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

export default function AdminAppSheet() {
  const [tableName, setTableName] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const fetchTable = useCallback(async (name) => {
    if (!name.trim()) return;
    setLoading(true);
    setStatus('loading');
    setError(null);

    try {
      const response = await firebase.functions.invoke('appsheetBridge', {
        tableName: name,
        action: 'Find',
        properties: { Locale: 'fr-FR' }
      });

      if (response.data?.success) {
        const rows = response.data.data?.Rows || response.data.data?.Rows || [];
        setData(rows);

        // Extraire les colonnes des données
        if (rows.length > 0) {
          const allKeys = new Set();
          rows.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
          setColumns([...allKeys]);
        } else {
          setColumns([]);
        }
        setStatus('success');
      } else {
        setError(response.data?.error || 'Erreur inconnue');
        setStatus('error');
      }
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTable(tableName);
  };

  const filteredData = data?.filter(row =>
    searchTerm === '' ||
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Rendu d'une cellule selon le type de valeur
  const renderCell = (value) => {
    if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
    if (typeof value === 'boolean') {
      return value
        ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Oui</Badge>
        : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Non</Badge>;
    }
    if (typeof value === 'object') return <span className="text-xs font-mono bg-gray-100 px-1 rounded">{JSON.stringify(value)}</span>;
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              Données AppSheet
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Consultation sécurisée des tables de votre application AppSheet
            </p>
          </div>

          {status === 'success' && (
            <Button variant="outline" size="sm" onClick={() => fetchTable(tableName)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualiser
            </Button>
          )}
        </div>

        {/* Formulaire de recherche de table */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                placeholder="Nom de la table AppSheet (ex: Commandes, Produits, Clients...)"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !tableName.trim()}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Chargement...</>
                ) : (
                  <><Search className="w-4 h-4 mr-1" />Rechercher</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* État d'erreur */}
        {status === 'error' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Erreur</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Résultats */}
        {status === 'success' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {tableName}
                  <Badge variant="secondary">{data?.length || 0} lignes</Badge>
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Filtrer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = [
                      columns.join(','),
                      ...filteredData.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${tableName}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune donnée dans cette table.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="whitespace-nowrap font-semibold text-xs uppercase">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData?.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-gray-50">
                          {columns.map((col) => (
                            <TableCell key={col} className="text-sm max-w-[200px] truncate">
                              {renderCell(row[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}