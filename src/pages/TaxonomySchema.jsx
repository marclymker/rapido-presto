import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FB_TAXONOMY, FLAT_TAXONOMY } from '@/lib/fbTaxonomy';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Loader2, Sparkles, ChevronRight, ChevronDown, CheckCircle2, Play, Eye, TreePine, RefreshCw } from 'lucide-react';

// ─── Nœud récursif du schéma ───────────────────────────────────────────────
const TreeNode = ({ node, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children?.length > 0;
  const isLeaf = !hasChildren;

  const depthColors = [
    'bg-indigo-600 text-white',
    'bg-blue-100 text-blue-800 border border-blue-200',
    'bg-slate-100 text-slate-700 border border-slate-200',
    'bg-green-50 text-green-700 border border-green-200',
  ];
  const color = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div className={depth > 0 ? 'ml-5 mt-1' : 'mb-3'}>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity w-fit max-w-full ${color}`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <span className="w-3.5 h-3.5 shrink-0 text-[10px] flex items-center justify-center">●</span>
        )}
        <span className={`font-${depth === 0 ? 'bold' : 'medium'} text-${depth === 0 ? 'sm' : 'xs'}`}>
          {depth === 0 && node.icon && <span className="mr-1">{node.icon}</span>}
          {node.name}
        </span>
        <span className={`text-[10px] opacity-60 font-mono shrink-0`}>#{node.id}</span>
        {isLeaf && (
          <span className="text-[9px] bg-white/30 px-1 rounded shrink-0">feuille</span>
        )}
      </div>
      {hasChildren && open && (
        <div className={`mt-1 ${depth === 0 ? 'border-l-2 border-indigo-200 ml-3 pl-2' : 'border-l border-slate-200 ml-3 pl-2'}`}>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Panel migration ───────────────────────────────────────────────────────
const MigrationPanel = () => {
  const [step, setStep] = useState('idle');
  const [stats, setStats] = useState(null);
  const [preview, setPreview] = useState([]);
  const [forceAll, setForceAll] = useState(true);

  const run = async (dryRun) => {
    setStep(dryRun ? 'previewing' : 'running');
    try {
      const { data } = await base44.functions.invoke('migrateAllCategories', {
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
        toast.success(`✅ ${data.updated} articles reclassifiés !`);
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message);
      setStep('idle');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-white" />
        <div>
          <h2 className="font-bold text-white text-base">Migration IA — Reclassifier tous les articles</h2>
          <p className="text-indigo-200 text-xs mt-0.5">GPT-4o analyse titre + photo + description pour chaque produit</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Option */}
        <label className="flex items-center gap-3 cursor-pointer bg-slate-50 rounded-xl p-4">
          <input
            type="checkbox"
            checked={forceAll}
            onChange={e => setForceAll(e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-600"
            disabled={step === 'running' || step === 'previewing'}
          />
          <div>
            <p className="text-sm font-semibold text-slate-700">Forcer la reclassification de TOUS les articles</p>
            <p className="text-xs text-slate-400">Même ceux qui ont déjà une catégorie Facebook assignée</p>
          </div>
        </label>

        {/* Loading */}
        {(step === 'previewing' || step === 'running') && (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="font-semibold text-slate-700">
              {step === 'previewing' ? 'Analyse en cours (dry-run)...' : '🤖 L\'IA reclassifie chaque article...'}
            </p>
            <p className="text-xs text-slate-400">GPT-4o-mini analyse titre + image par lots. Quelques minutes nécessaires.</p>
          </div>
        )}

        {/* Stats */}
        {stats && !['previewing', 'running'].includes(step) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total produits', value: stats.total, color: 'blue' },
              { label: 'À traiter', value: stats.to_process, color: 'amber' },
              { label: step === 'done' ? 'Mis à jour ✅' : 'Aperçu', value: step === 'done' ? stats.updated : stats.processed, color: step === 'done' ? 'green' : 'slate' },
              { label: 'Ignorés', value: stats.skipped, color: 'slate' },
            ].map(s => (
              <div key={s.label} className={`bg-${s.color}-50 rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-black text-${s.color}-700`}>{s.value ?? 0}</p>
                <p className={`text-xs text-${s.color}-500 mt-0.5`}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Done banner */}
        {step === 'done' && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800">Migration terminée avec succès !</p>
              <p className="text-sm text-green-600">{stats.updated} articles ont reçu leur catégorie Facebook précise.</p>
            </div>
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && step === 'preview_done' && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Aperçu des reclassifications :</p>
            <div className="border rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Produit</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Actuel</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">→ Nouvelle catégorie IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700 max-w-[140px] truncate">{item.name}</td>
                      <td className="px-3 py-2 text-slate-400 max-w-[100px] truncate">{item.old_category}</td>
                      <td className="px-3 py-2">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{item.new_fb_category}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Buttons */}
        {['idle', 'preview_done'].includes(step) && (
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => run(true)}
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Aperçu (sans modifier)
            </Button>
            <Button
              onClick={() => run(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {step === 'preview_done' ? 'Confirmer et lancer' : 'Lancer la migration IA'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <Button variant="outline" onClick={() => { setStep('idle'); setStats(null); setPreview([]); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Relancer
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── Page principale ────────────────────────────────────────────────────────
export default function TaxonomySchema() {
  const leafCount = FLAT_TAXONOMY.filter(n => {
    function hasChildren(nodes, id) {
      for (const n of nodes) {
        if (n.id === id) return !!(n.children?.length);
        if (n.children) { const r = hasChildren(n.children, id); if (r !== null) return r; }
      }
      return null;
    }
    return !hasChildren(FB_TAXONOMY, n.id);
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3 shadow-sm">
        <TreePine className="w-5 h-5 text-indigo-600" />
        <div>
          <h1 className="font-bold text-slate-800 text-base leading-tight">Taxonomie Facebook/Google</h1>
          <p className="text-xs text-slate-400">{FB_TAXONOMY.length} catégories racines · {FLAT_TAXONOMY.length} nœuds · {leafCount} feuilles</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats badges */}
        <div className="flex flex-wrap gap-2">
          {FB_TAXONOMY.map(cat => (
            <Badge key={cat.id} className="bg-white border border-slate-200 text-slate-600 font-normal gap-1.5 py-1 px-3">
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="text-slate-400">#{cat.id}</span>
            </Badge>
          ))}
        </div>

        {/* Schema Tree */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TreePine className="w-4 h-4 text-indigo-600" />
            Schéma de classification complet
          </h2>
          <div className="space-y-1">
            {FB_TAXONOMY.map(cat => (
              <TreeNode key={cat.id} node={cat} depth={0} />
            ))}
          </div>
        </div>

        {/* Migration panel */}
        <MigrationPanel />
      </div>
    </div>
  );
}