import React, { useState } from 'react';
import { firebase } from '@/api/firebaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function GenerateAltTextsModal({ open, onClose, shopId, shopName }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState(null);
  const [forceAll, setForceAll] = useState(false);

  const handleStart = async () => {
    setRunning(true);
    setDone(false);
    setStats(null);

    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalWithoutAlt = 0;
    let allErrors = [];

    try {
      while (true) {
        const response = await firebase.functions.invoke('generateAltTexts', {
          shopId: shopId || undefined,
          force_all: forceAll,
          offset,
          page_size: 20,
        });

        const data = response.data;

        if (!data?.success) {
          throw new Error(data?.error || 'Erreur lors de la génération');
        }

        totalWithoutAlt = data.total_without_alt;
        totalProcessed += data.processed;
        totalUpdated += data.updated;
        allErrors = [...allErrors, ...(data.errors || [])];

        setStats({
          total: totalWithoutAlt,
          processed: totalProcessed,
          updated: totalUpdated,
          errors: allErrors.length,
        });

        if (!data.has_more) break;
        offset = data.next_offset;
      }

      setDone(true);
      toast.success(`✅ ${totalUpdated} textes ALT générés avec succès !`);
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const progress = stats ? Math.round((stats.processed / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-full">
              <ImageIcon className="w-5 h-5 text-purple-600" />
            </div>
            Générer les textes ALT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            Cette action utilise l'IA pour générer automatiquement un texte ALT (SEO + accessibilité) pour chaque image de produit{shopName ? ` de <strong>${shopName}</strong>` : ' de toutes les boutiques'} qui n'en possède pas encore.
          </p>

          <div
            className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50"
            onClick={() => setForceAll(!forceAll)}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${forceAll ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
              {forceAll && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Régénérer tous (même ceux qui en ont déjà)</p>
              <p className="text-xs text-slate-400">Par défaut, seuls les articles sans ALT sont traités</p>
            </div>
          </div>

          {stats && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Progression</span>
                <span className="font-medium">{stats.processed} / {stats.total}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex gap-3 flex-wrap">
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {stats.updated} générés
                </Badge>
                {stats.errors > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {stats.errors} erreurs
                  </Badge>
                )}
              </div>
            </div>
          )}

          {done && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Terminé ! {stats?.updated} textes ALT générés.</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={running}>
            {done ? 'Fermer' : 'Annuler'}
          </Button>
          {!done && (
            <Button
              onClick={handleStart}
              disabled={running}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Lancer la génération</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}