import React, { useState } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { scanLegacyFirestore, executeLegacyFirestoreMigration } from '@/lib/legacyMigration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Database, Play, RefreshCw } from 'lucide-react';

export default function LegacyMigration() {
  const [user, setUser] = useState(null);
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => { firebaseApi.auth.me().then(setUser).catch(() => setUser(null)); }, []);

  const runScan = async () => {
    setLoading(true); setError(''); setResult(null);
    try { setReport(await scanLegacyFirestore()); } catch (err) { setError(err.message || 'Lecture Firestore impossible.'); }
    finally { setLoading(false); }
  };

  const runMigration = async () => {
    if (!report || report.ambiguousUsers.length) return;
    setLoading(true); setError('');
    try { setResult(await executeLegacyFirestoreMigration(report)); } catch (err) { setError(err.message || 'Migration interrompue.'); }
    finally { setLoading(false); }
  };

  if (!user || !['admin', 'owner'].includes(user.role)) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Accès réservé aux administrateurs.</p></div>;

  const counts = report ? { users: report.links.users.length, shops: report.links.shops.length, products: report.links.products.length } : null;
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-4xl space-y-6">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-orange-500" />Liaison des données historiques</CardTitle><p className="text-sm text-slate-500">Base44 exporté → comptes Firebase existants. Le scan est sans écriture.</p></CardHeader><CardContent className="flex flex-wrap gap-3"><Button onClick={runScan} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />{loading ? 'Analyse...' : 'Analyser Firestore'}</Button>{report && <Button onClick={runMigration} disabled={loading || report.ambiguousUsers.length > 0} className="bg-orange-500 hover:bg-orange-600"><Play className="mr-2 h-4 w-4" />Exécuter les liaisons sûres</Button>}</CardContent></Card>
    {error && <Card className="border-red-200"><CardContent className="pt-6 text-sm text-red-700">{error}</CardContent></Card>}
    {report && <><div className="grid gap-4 sm:grid-cols-3">{[['Utilisateurs', counts.users], ['Boutiques', counts.shops], ['Produits', counts.products]].map(([label, value]) => <Card key={label}><CardContent className="pt-6"><p className="text-sm text-slate-500">{label} à lier</p><p className="text-3xl font-black">{value}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle className="text-base">Contrôle avant écriture</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{report.ambiguousUsers.length ? <div className="flex gap-2 text-amber-700"><AlertTriangle className="h-5 w-5 shrink-0" /><p>{report.ambiguousUsers.length} ancien(s) utilisateur(s) sont ambigus. Aucun d’eux ne sera modifié automatiquement.</p></div> : <div className="flex gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" /><p>Aucun rapprochement ambigu détecté.</p></div>}<p className="text-slate-500">Les documents existants sont mis à jour par fusion. Aucun produit n’est recréé et aucun document n’est supprimé.</p>{result && <Badge className="bg-green-600">{result.writes} écritures effectuées</Badge>}</CardContent></Card></>}
  </div></main>;
}
