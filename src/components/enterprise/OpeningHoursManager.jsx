import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock } from 'lucide-react';
import { toast } from "sonner";

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' }
];

export default function OpeningHoursManager({ shop, onUpdateShop }) {
  const [hours, setHours] = useState(shop?.opening_hours || {});

  const handleDayChange = (day, field, value) => {
    setHours({
      ...hours,
      [day]: {
        ...hours[day],
        [field]: value
      }
    });
  };

  const handleSave = () => {
    onUpdateShop({ opening_hours: hours });
    toast.success('Horaires mis à jour');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Horaires d'ouverture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DAYS.map(day => {
            const dayHours = hours[day.key] || { open: '09:00', close: '18:00', closed: false };
            return (
              <div key={day.key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="w-24">
                  <p className="font-medium text-sm">{day.label}</p>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  {!dayHours.closed ? (
                    <>
                      <Input
                        type="time"
                        value={dayHours.open || '09:00'}
                        onChange={(e) => handleDayChange(day.key, 'open', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-slate-400">-</span>
                      <Input
                        type="time"
                        value={dayHours.close || '18:00'}
                        onChange={(e) => handleDayChange(day.key, 'close', e.target.value)}
                        className="w-32"
                      />
                    </>
                  ) : (
                    <span className="text-slate-500 text-sm">Fermé</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Fermé</Label>
                  <Switch
                    checked={dayHours.closed || false}
                    onCheckedChange={(checked) => handleDayChange(day.key, 'closed', checked)}
                  />
                </div>
              </div>
            );
          })}
          <Button onClick={handleSave} className="w-full bg-orange-500 hover:bg-orange-600">
            Enregistrer les horaires
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}