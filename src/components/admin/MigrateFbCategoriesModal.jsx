import React, { useState } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Eye, Play } from 'lucide-react';

export default function MigrateFbCategoriesModal({ open, onClose }) {
  const [step, setStep] = useState('idle'); // idle | previewing | running | done
  const [preview, setPreview] = useState([]);
  const [stats, setStats] = useState(null);
  const [forceAll, setForceAll] = useState(false);

  const runMigration = async (dryRun) => {
    setStep(dryRun ? 'previewing' : 'running');
    try {
      const { data } = await firebaseApi.functions.invoke('migrateToFbCategories', {
        dry_run: dryRun,
        force_all: forceAll,
      });

      if (!data.success) throw new Error(data.error || 'Erreur inconnue');

      setStats(data);
      if (dryRun) {
        setPreview(data.preview || []);
        setStep('preview_done');
      } else {
        setStep('done');
        toast.success(`✅ ${data.updated} articles mis à jour !`);
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message);
      setStep('idle');
    }
  };

  const reset = () => {
    setStep('idle');
    setPreview([]);
    setStats(null);
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Migration vers catégories Facebook
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Utilise l'IA (GPT-4) pour analyser le titre et la description de chaque produit et lui assigner la catégorie Facebook Shopping la plus précise.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Options */}
          {(step === 'idle' || step === 'preview_done') && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceAll}
                  onChange={e => setForceAll(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Reclassifier tous les produits</p>
                  <p className="text-xs text-slate-400">Par défaut, seuls les produits sans catégorie Facebook sont traités</p>
                </div>
              </label>
            </div>
          )}

          {/* Loading */}
          {(step === 'previewing' || step === 'running') && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <div>
                <p className="font-semibold text-slate-700">
                  {step === 'previewing' ? 'Analyse en cours...' : 'Migration en cours...'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  L'IA analyse chaque produit par lots de 20. Cela peut prendre quelques minutes.
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && step !== 'previewing' && step !== 'running' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                <p className="text-xs text-blue-500">Total produits</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{stats.to_process}</p>
                <p className="text-xs text-amber-500">À traiter</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${step === 'done' ? 'bg-green-50' : 'bg-slate-50'}`}>
                <p className={`text-2xl font-bold ${step === 'done' ? 'text-green-700' : 'text-slate-700'}`}>
                  {step === 'done' ? stats.updated : stats.processed}
                </p>
                <p className={`text-xs ${step === 'done' ? 'text-green-500' : 'text-slate-400'}`}>
                  {step === 'done' ? 'Mis à jour' : 'Traités (aperçu)'}
                </p>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Migration terminée avec succès !</p>
                <p className="text-sm text-green-600">{stats.updated} articles ont reçu leur catégorie Facebook.</p>
              </div>
            </div>
          )}

          {/* Errors */}
          {stats?.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">{stats.errors.length} erreur(s) — fallback mapping utilisé</span>
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && step === 'preview_done' && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Aperçu des reclassifications (premiers {preview.length} résultats) :
              </p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Produit</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Actuelle</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">→ Facebook</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700 max-w-[150px] truncate">{item.name}</td>
                        <td className="px-3 py-2 text-slate-500">{item.old_category}</td>
                        <td className="px-3 py-2">
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {item.new_fb_category}
                          </span>
                          {item.fallback && <span className="ml-1 text-amber-500 text-[9px]">(fallback)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between shrink-0 bg-white">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            {step === 'done' ? 'Fermer' : 'Annuler'}
          </Button>

          <div className="flex gap-3">
            {(step === 'idle' || step === 'preview_done') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => runMigration(true)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Aperçu (sans modifier)
                </Button>
                <Button
                  onClick={() => runMigration(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Lancer la migration
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
