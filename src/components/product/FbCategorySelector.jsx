import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronRight } from 'lucide-react';
import { FB_TAXONOMY, findById, getChildren } from '@/lib/fbTaxonomy';

/**
 * Sélecteur de catégorie hiérarchique Facebook/Google Taxonomy
 * Affiche des dropdowns en cascade : Niveau 1 > Niveau 2 > Niveau 3+
 */
export default function FbCategorySelector({ value, onChange, className = '' }) {
  // value = fb_category_id (number)
  // Reconstruit le chemin depuis l'ID sélectionné
  function buildPathFromId(targetId) {
    if (!targetId) return [];
    const path = [];
    function search(nodes, id) {
      for (const node of nodes) {
        if (node.id === id) { path.push(node.id); return true; }
        if (node.children?.length) {
          path.push(node.id);
          if (search(node.children, id)) return true;
          path.pop();
        }
      }
      return false;
    }
    search(FB_TAXONOMY, targetId);
    return path;
  }

  const initialPath = buildPathFromId(value);
  const [selectedPath, setSelectedPath] = useState(initialPath); // [l1Id, l2Id, l3Id, ...]

  useEffect(() => {
    const path = buildPathFromId(value);
    setSelectedPath(path);
  }, [value]);

  // Construit les niveaux de dropdowns à afficher
  function getLevels() {
    const levels = [{ nodes: FB_TAXONOMY, selectedId: selectedPath[0] || null }];
    for (let i = 0; i < selectedPath.length; i++) {
      const children = getChildren(selectedPath[i]);
      if (children.length > 0) {
        levels.push({ nodes: children, selectedId: selectedPath[i + 1] || null });
      } else {
        break;
      }
    }
    return levels;
  }

  const levels = getLevels();

  const handleSelect = (levelIndex, nodeId) => {
    const newPath = [...selectedPath.slice(0, levelIndex), nodeId];
    setSelectedPath(newPath);
    // L'ID retourné est le dernier sélectionné (le plus précis)
    onChange?.(nodeId);
  };

  const levelLabels = ['Catégorie principale', 'Sous-catégorie', 'Niveau 3', 'Niveau 4'];

  return (
    <div className={`space-y-3 ${className}`}>
      {levels.map((level, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
          <div className="flex-1">
            {idx === 0 && <Label className="text-xs text-slate-500 mb-1 block">{levelLabels[idx]}</Label>}
            <Select
              value={level.selectedId ? String(level.selectedId) : ''}
              onValueChange={(v) => handleSelect(idx, Number(v))}
            >
              <SelectTrigger className={`h-10 ${idx === 0 ? 'font-medium' : 'text-sm border-blue-100 bg-blue-50/30'}`}>
                <SelectValue placeholder={idx === 0 ? 'Sélectionner une catégorie...' : `Préciser (optionnel)...`} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {level.nodes.map((node) => (
                  <SelectItem key={node.id} value={String(node.id)} className="text-sm">
                    {node.icon && idx === 0 ? `${node.icon} ${node.name}` : node.name}
                    {node.children?.length > 0 && (
                      <span className="ml-1 text-slate-400 text-xs">›</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}

      {/* Affichage du chemin complet */}
      {selectedPath.length > 0 && (
        <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          <span className="font-medium text-slate-600">ID {selectedPath[selectedPath.length - 1]}</span>
          {' · '}
          {selectedPath.map((id, i) => {
            const node = findById(id);
            return (
              <span key={id}>
                {i > 0 && <span className="mx-1 text-slate-300">›</span>}
                <span>{node?.name}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
