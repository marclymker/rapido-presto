import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UpdateProducts() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryResult, setInventoryResult] = useState(null);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('updateProductsDescriptions');
      setResult(response.data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRenewInventory = async () => {
    setLoadingInventory(true);
    setInventoryResult(null);
    
    try {
      const response = await base44.functions.invoke('renewInventory');
      setInventoryResult(response.data);
    } catch (error) {
      setInventoryResult({ error: error.message });
    } finally {
      setLoadingInventory(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Mise à jour des produits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Cette action va générer automatiquement les descriptions et tags manquants pour tous les produits.
            </p>
            
            <Button 
              onClick={handleUpdate}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mettre à jour les produits
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50' : 'bg-green-50'}`}>
                {result.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Erreur</p>
                      <p className="text-sm text-red-600">{result.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Succès !</p>
                      <p className="text-sm text-green-600">
                        {result.products_updated} produits mis à jour sur {result.total_products}
                      </p>
                      {result.errors && result.errors.length > 0 && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-yellow-700">
                            {result.errors.length} erreurs
                          </summary>
                          <ul className="mt-1 space-y-1">
                            {result.errors.map((err, i) => (
                              <li key={i}>{err.name}: {err.error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Renouvellement de l'inventaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Cette action va mettre à jour le stock de tous les produits à 20 unités.
            </p>
            
            <Button 
              onClick={handleRenewInventory}
              disabled={loadingInventory}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loadingInventory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Renouveler l'inventaire (20 unités)
            </Button>

            {inventoryResult && (
              <div className={`p-4 rounded-lg ${inventoryResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                {inventoryResult.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Erreur</p>
                      <p className="text-sm text-red-600">{inventoryResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Inventaire renouvelé !</p>
                      <p className="text-sm text-green-600">
                        {inventoryResult.updated} produits mis à jour sur {inventoryResult.total}
                      </p>
                      {inventoryResult.errors && inventoryResult.errors.length > 0 && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-yellow-700">
                            {inventoryResult.errors.length} erreurs
                          </summary>
                          <ul className="mt-1 space-y-1">
                            {inventoryResult.errors.map((err, i) => (
                              <li key={i}>{err.name}: {err.error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}