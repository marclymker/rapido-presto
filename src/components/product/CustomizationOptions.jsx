import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Ruler, Type, Flower } from 'lucide-react';

export default function CustomizationOptions({ product, onChange }) {
  const [customization, setCustomization] = useState({});
  const options = product.customization_options || {};

  const hasOptions = options.colors?.length > 0 ||
                     options.sizes?.length > 0 ||
                     options.text_customization?.enabled ||
                     options.arrangements?.length > 0;

  useEffect(() => {
    onChange(customization);
  }, [customization]);

  const calculateTotal = () => {
    let total = 0;
    if (customization.color) total += customization.color.additional_price || 0;
    if (customization.size) total += customization.size.additional_price || 0;
    if (customization.text) total += options.text_customization?.price || 0;
    if (customization.arrangement) total += customization.arrangement.additional_price || 0;
    return total;
  };

  if (!hasOptions) return null;

  return (
    <div className="space-y-6 py-4 border-t">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <Palette className="w-5 h-5 text-orange-500" />
        Options de personnalisation
      </h3>

      {/* Colors */}
      {options.colors && options.colors.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Couleur
          </Label>
          <div className="flex flex-wrap gap-3">
            {options.colors.map((color, idx) => (
              <button
                key={idx}
                onClick={() => setCustomization({ ...customization, color })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                  customization.color?.name === color.name
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full border border-slate-300"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="font-medium text-sm">{color.name}</span>
                {color.additional_price > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    +{color.additional_price} HTG
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sizes */}
      {options.sizes && options.sizes.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Taille
          </Label>
          <RadioGroup
            value={customization.size?.name}
            onValueChange={(value) => {
              const size = options.sizes.find(s => s.name === value);
              setCustomization({ ...customization, size });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {options.sizes.map((size, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    customization.size?.name === size.name
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <RadioGroupItem value={size.name} />
                  <div className="flex-1">
                    <p className="font-medium">{size.name}</p>
                    {size.additional_price > 0 && (
                      <p className="text-xs text-slate-500">
                        +{size.additional_price} HTG
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Text Customization */}
      {options.text_customization?.enabled && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Texte personnalisé
            {options.text_customization.price > 0 && (
              <Badge variant="secondary" className="ml-2">
                +{options.text_customization.price} HTG
              </Badge>
            )}
          </Label>
          <Textarea
            placeholder={options.text_customization.placeholder || "Entrez votre texte..."}
            maxLength={options.text_customization.max_characters}
            value={customization.text || ''}
            onChange={(e) => setCustomization({ ...customization, text: e.target.value })}
            className="resize-none"
            rows={3}
          />
          {options.text_customization.max_characters && (
            <p className="text-xs text-slate-500">
              {customization.text?.length || 0}/{options.text_customization.max_characters} caractères
            </p>
          )}
        </div>
      )}

      {/* Arrangements */}
      {options.arrangements && options.arrangements.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Flower className="w-4 h-4" />
            Arrangement
          </Label>
          <RadioGroup
            value={customization.arrangement?.name}
            onValueChange={(value) => {
              const arrangement = options.arrangements.find(a => a.name === value);
              setCustomization({ ...customization, arrangement });
            }}
          >
            <div className="space-y-3">
              {options.arrangements.map((arrangement, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    customization.arrangement?.name === arrangement.name
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <RadioGroupItem value={arrangement.name} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{arrangement.name}</p>
                    {arrangement.description && (
                      <p className="text-sm text-slate-600 mt-1">
                        {arrangement.description}
                      </p>
                    )}
                    {arrangement.additional_price > 0 && (
                      <p className="text-sm text-orange-600 mt-1 font-medium">
                        +{arrangement.additional_price} HTG
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Total Customization Price */}
      {calculateTotal() > 0 && (
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Coût de personnalisation:</span>
            <span className="font-bold text-orange-600">+{calculateTotal()} HTG</span>
          </div>
        </div>
      )}
    </div>
  );
}
