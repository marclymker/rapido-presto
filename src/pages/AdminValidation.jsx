import React, { useState, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, ExternalLink, Clock, FileText, User, Phone, MapPin, Bike } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function AdminValidation() {
  const [user, setUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    firebaseApi.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => {});
  }, []);

  // Fetch pending requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['profile-switches-pending'],
    queryFn: () => firebaseApi.entities.ProfileSwitch.filter({ status: 'pending' }, '-created_date'),
    enabled: !!user,
    refetchInterval: 10000
  });

  // Fetch processed requests
  const { data: processedRequests = [] } = useQuery({
    queryKey: ['profile-switches-processed'],
    queryFn: async () => {
      const approved = await firebaseApi.entities.ProfileSwitch.filter({ status: 'approved' }, '-created_date', 20);
      const rejected = await firebaseApi.entities.ProfileSwitch.filter({ status: 'rejected' }, '-created_date', 20);
      return [...approved, ...rejected].sort((a, b) =>
        new Date(b.updated_date) - new Date(a.updated_date)
      );
    },
    enabled: !!user
  });

  const approveMutation = useMutation({
    mutationFn: async (request) => {
      // Update the switch request
      await firebaseApi.entities.ProfileSwitch.update(request.id, {
        status: 'approved',
        approved_by: user.id
      });

      // Fetch the user and update their profile
      const targetUser = await firebaseApi.entities.User.filter({ id: request.user_id });
      if (targetUser.length > 0) {
        const userData = targetUser[0];
        const profiles = userData.profiles || {};

        profiles.livreur = {
          ...profiles.livreur,
          is_active: true,
          status: 'approved',
          vehicle_type: request.data.vehicle_type,
          id_document_url: request.data.id_document_url,
          is_available: false
        };

        // Note: We can't directly update other users with auth.updateMe
        // In a real app, this would need a backend function with admin privileges
        // For now, we'll just update the switch status
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile-switches-pending']);
      queryClient.invalidateQueries(['profile-switches-processed']);
      toast.success('Demande approuvée');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (request) => {
      return firebaseApi.entities.ProfileSwitch.update(request.id, {
        status: 'rejected',
        approved_by: user.id,
        rejection_reason: rejectionReason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile-switches-pending']);
      queryClient.invalidateQueries(['profile-switches-processed']);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
      toast.success('Demande rejetée');
    }
  });

  const handleApprove = (request) => {
    if (confirm('Êtes-vous sûr de vouloir approuver cette demande?')) {
      approveMutation.mutate(request);
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const RequestCard = ({ request, isPending = true }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={isPending ? 'border-orange-200' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">{request.user_name}</h3>
                <p className="text-sm text-slate-500">
                  {format(new Date(request.created_date), "d MMM yyyy à HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            {!isPending && (
              <Badge
                variant="secondary"
                className={request.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
                }
              >
                {request.status === 'approved' ? 'Approuvé' : 'Rejeté'}
              </Badge>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Bike className="w-4 h-4" />
              <span>Véhicule: <strong>{request.data?.vehicle_type}</strong></span>
            </div>

            {request.data?.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4" />
                <span>{request.data.phone}</span>
              </div>
            )}

            {request.data?.commune && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4" />
                <span>{request.data.commune}</span>
              </div>
            )}

            {request.data?.id_document_url && (
              <a
                href={request.data.id_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <FileText className="w-4 h-4" />
                <span>Voir le document d'identité</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {isPending && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-200 text-red-600"
                onClick={() => handleReject(request)}
              >
                <X className="w-4 h-4 mr-1" />
                Refuser
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleApprove(request)}
                disabled={approveMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Approuver
              </Button>
            </div>
          )}

          {!isPending && request.status === 'rejected' && request.rejection_reason && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700">
                <strong>Raison du rejet:</strong> {request.rejection_reason}
              </p>
            </div>
          )}

          {!isPending && request.approved_by && (
            <div className="mt-4 text-xs text-slate-500">
              Traité par: Admin #{request.approved_by.slice(0, 8)}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-orange-500">Administration</h1>
              <p className="text-sm text-slate-500">Validation des livreurs</p>
            </div>
            {pendingRequests.length > 0 && (
              <Badge className="bg-red-500 text-white">
                {pendingRequests.length} en attente
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full bg-white mb-6">
            <TabsTrigger value="pending" className="flex-1 gap-2">
              <Clock className="w-4 h-4" />
              En attente ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex-1 gap-2">
              <Check className="w-4 h-4" />
              Traités ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucune demande en attente</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} isPending={true} />
              ))
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {processedRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucune demande traitée</p>
                </CardContent>
              </Card>
            ) : (
              processedRequests.map(request => (
                <RequestCard key={request.id} request={request} isPending={false} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Raison du refus</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez pourquoi vous refusez cette demande..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => rejectMutation.mutate(selectedRequest)}
                disabled={!rejectionReason || rejectMutation.isPending}
              >
                Confirmer le refus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
