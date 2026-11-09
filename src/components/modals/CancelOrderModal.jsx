import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Info, PhoneCall } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

const CANCELLATION_REASONS = {
  CLIENT: [
    { id: "delay", label: "Délai de livraison trop long" },
    { id: "error", label: "Erreur dans la commande" },
    { id: "change_mind", label: "Changement d'avis" },
    { id: "payment", label: "Problème de paiement" },
    { id: "address", label: "Erreur d'adresse de livraison" },
    { id: "other", label: "Autre raison" }
  ]
};

const calculateRefund = (orderStatus, totalAmount) => {
  switch (orderStatus) {
    case 'pending':
    case 'accepted':
      return { fee: 0, refund: totalAmount, percent: 0 };
    case 'preparing':
    case 'ready':
      return { fee: totalAmount * 0.2, refund: totalAmount * 0.8, percent: 20 };
    case 'searching_driver':
    case 'driver_assigned':
    case 'in_delivery':
      return { fee: totalAmount * 0.8, refund: totalAmount * 0.2, percent: 80 };
    default:
      return { fee: 0, refund: totalAmount, percent: 0 };
  }
};

const getStatusMessage = (status) => {
  const messages = {
    pending: "Votre commande est en attente de confirmation.",
    accepted: "Votre commande a été acceptée par le marchand.",
    preparing: "Votre commande est actuellement en cours de préparation par le marchand. Elle sera prête sous peu ! 🚀",
    ready: "Votre commande est prête et attend d'être livrée.",
    searching_driver: "Nous recherchons un livreur pour votre commande.",
    driver_assigned: "Un livreur a été assigné à votre commande.",
    in_delivery: "Votre commande est en cours de livraison ! Le livreur est en route."
  };
  return messages[status] || "Votre commande est en cours de traitement.";
};

export default function CancelOrderModal({ order, open, onClose, onConfirm, loading }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!order) return null;

  const refundInfo = calculateRefund(order.status, order.total);
  const hasFee = refundInfo.percent > 0;

  const handleSubmit = () => {
    if (!selectedReason) return;
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    const reason = CANCELLATION_REASONS.CLIENT.find(r => r.id === selectedReason);
    onConfirm({
      reason_id: selectedReason,
      reason_label: reason?.label,
      reason_details: reasonDetails,
      ...refundInfo
    });
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setSelectedReason('');
    setReasonDetails('');
    onClose();
  };

  if (showConfirmation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmer l'annulation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Êtes-vous sûr de vouloir annuler cette commande ?
                {hasFee && (
                  <>
                    <br /><br />
                    <strong>Des frais de {refundInfo.percent}% seront retenus ({refundInfo.fee.toFixed(0)} HTG).</strong>
                    <br />
                    Vous serez remboursé de {refundInfo.refund.toFixed(0)} HTG.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
                disabled={loading}
              >
                Retour
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600"
                disabled={loading}
              >
                {loading ? "Annulation..." : "Oui, annuler"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Annuler la commande</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Message */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              {getStatusMessage(order.status)}
            </AlertDescription>
          </Alert>

          {/* Fee Warning */}
          {hasFee ? (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Attention :</strong> En annulant maintenant, des frais de {refundInfo.percent}% seront retenus conformément à nos conditions.
                <br /><br />
                💰 Frais d'annulation : <strong>{refundInfo.fee.toFixed(0)} HTG</strong>
                <br />
                💵 Montant remboursé : <strong>{refundInfo.refund.toFixed(0)} HTG</strong>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Aucun frais ne sera appliqué. Vous serez remboursé intégralement.
              </AlertDescription>
            </Alert>
          )}

          {/* Support Option */}
          <Alert>
            <PhoneCall className="w-4 h-4" />
            <AlertDescription>
              Besoin d'aide ? <a href="tel:+50948690366" className="font-semibold text-orange-600 underline">Contactez notre support</a> avant d'annuler.
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div>
            <Label className="mb-3 block">Pourquoi souhaitez-vous annuler ?</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {CANCELLATION_REASONS.CLIENT.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <Label htmlFor={reason.id} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          {selectedReason && (
            <div>
              <Label htmlFor="details" className="mb-2 block">
                Détails supplémentaires (optionnel)
              </Label>
              <Textarea
                id="details"
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Expliquez-nous ce qui s'est passé..."
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Garder ma commande
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Continuer l'annulation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
