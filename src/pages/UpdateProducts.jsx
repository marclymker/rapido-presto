import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import GenerateAltTextsModal from '@/components/admin/GenerateAltTextsModal';
import MigrateFbCategoriesModal from '@/components/admin/MigrateFbCategoriesModal';

export default function UpdateProducts() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryResult, setInventoryResult] = useState(null);
  const [compressingImages, setCompressingImages] = useState(false);
  const [compressResult, setCompressResult] = useState(null);
  const [showAltTexts, setShowAltTexts] = useState(false);
  const [showFbMigration, setShowFbMigration] = useState(false);

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

  const handleCompressImages = async () => {
    setCompressingImages(true);
    setCompressResult(null);

    try {
      const response = await base44.functions.invoke('compressAllImages');
      setCompressResult(response.data);
    } catch (error) {
      setCompressResult({ error: error.message });
    } finally {
      setCompressingImages(false);
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Compression des images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Cette action va optimiser toutes les photos des produits en ajoutant des paramètres de compression (800px, qualité 80%).
            </p>

            <Button
              onClick={handleCompressImages}
              disabled={compressingImages}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {compressingImages && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Compresser toutes les images
            </Button>

            {compressResult && (
              <div className={`p-4 rounded-lg ${compressResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                {compressResult.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Erreur</p>
                      <p className="text-sm text-red-600">{compressResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Images compressées !</p>
                      <p className="text-sm text-green-600">
                        {compressResult.compressed} images compressées sur {compressResult.total} produits
                      </p>
                      {compressResult.failed > 0 && (
                        <p className="text-sm text-yellow-600 mt-1">
                          {compressResult.failed} erreurs
                        </p>
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
            <CardTitle>Générer les textes ALT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Génère automatiquement un texte ALT (SEO + accessibilité Google Images) pour chaque image de produit qui n'en possède pas encore.
            </p>
            <Button
              onClick={() => setShowAltTexts(true)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Générer les textes ALT manquants
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Migrer les catégories Facebook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Migre et assigne les catégories Facebook Marketplace officielles à tous les produits du catalogue.
            </p>
            <Button
              onClick={() => setShowFbMigration(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Migrer les catégories Facebook
            </Button>
          </CardContent>
        </Card>
      </div>

      <GenerateAltTextsModal
        open={showAltTexts}
        onClose={() => setShowAltTexts(false)}
      />
      <MigrateFbCategoriesModal
        open={showFbMigration}
        onClose={() => setShowFbMigration(false)}
      />
    </div>
  );
}
