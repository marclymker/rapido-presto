import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, DollarSign, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentCommissions() {
  const [user, setUser] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['agent-clients', user?.id],
    queryFn: () => base44.entities.AgentClient.filter({ agent_id: user?.id }),
    enabled: !!user?.id
  });

  const claimMutation = useMutation({
    mutationFn: async (clientId) => {
      return base44.entities.AgentClient.update(clientId, {
        commission_claimed: true,
        claim_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-clients']);
      toast.success('Commission réclamée avec succès');
    }
  });

  const totalEarned = clients
    .filter(c => c.status === 'Terminée' && c.commission_claimed)
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const pendingCommission = clients
    .filter(c => c.status === 'Terminée' && !c.commission_claimed)
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const inProgressTotal = clients
    .filter(c => c.status === 'En cours')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-slate-900">Mes Commissions</h1>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-600 text-white p-4 rounded-xl shadow-lg">
            <p className="text-xs opacity-90 mb-1">Gains totaux</p>
            <p className="text-2xl font-black">{totalEarned.toLocaleString()} HTG</p>
          </div>
          <div className="bg-orange-500 text-white p-4 rounded-xl shadow-lg">
            <p className="text-xs opacity-90 mb-1">À réclamer</p>
            <p className="text-2xl font-black">{pendingCommission.toLocaleString()} HTG</p>
          </div>
          <div className="bg-blue-500 text-white p-4 rounded-xl shadow-lg">
            <p className="text-xs opacity-90 mb-1">En cours</p>
            <p className="text-2xl font-black">{inProgressTotal.toLocaleString()} HTG</p>
          </div>
        </div>

        {/* Liste */}
        <div className="space-y-4">
          {clients.map(client => {
            const canClaim = client.status === 'Terminée' && !client.commission_claimed;
            const isClaimed = client.commission_claimed;

            return (
              <div
                key={client.id}
                className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${
                  canClaim ? 'border-green-200 hover:border-green-400' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{client.full_name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {client.event_type} • {client.event_date && new Date(client.event_date).toLocaleDateString()}
                    </p>

                    <div className="flex gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-500">Total Commande</p>
                        <p className="font-black text-slate-900">{client.order_total?.toLocaleString()} HTG</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Commission (10%)</p>
                        <p className="font-black text-green-600">{client.commission_amount?.toLocaleString()} HTG</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {client.status === 'En cours' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        En cours
                      </span>
                    )}
                    {client.status === 'Terminée' && (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Terminée
                      </span>
                    )}
                    {client.status === 'Annulée' && (
                      <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Annulée
                      </span>
                    )}

                    {isClaimed && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                        ✓ Réclamée
                      </span>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </Button>

                      {canClaim && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => claimMutation.mutate(client.id)}
                          disabled={claimMutation.isPending}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Réclamer
                        </Button>
                      )}

                      {client.status !== 'Terminée' && !isClaimed && (
                        <Button
                          size="sm"
                          disabled
                          variant="secondary"
                          className="opacity-50 cursor-not-allowed"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Réclamer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Détails */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la commande</DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg">{selectedClient.full_name}</h3>
                <p className="text-sm text-slate-600">{selectedClient.phone}</p>
                {selectedClient.email && <p className="text-sm text-slate-600">{selectedClient.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Événement</p>
                  <p className="font-bold">{selectedClient.event_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-bold">
                    {selectedClient.event_date && new Date(selectedClient.event_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Montant</p>
                  <p className="font-bold text-slate-900">{selectedClient.order_total?.toLocaleString()} HTG</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Commission</p>
                  <p className="font-bold text-green-600">{selectedClient.commission_amount?.toLocaleString()} HTG</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-2">Articles ({selectedClient.order_items?.length})</h4>
                <div className="space-y-2">
                  {selectedClient.order_items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                      <img src={item.product_image} className="w-16 h-16 object-cover rounded" alt="" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-slate-600">
                          {item.quantity} x {item.unit_price.toLocaleString()} HTG
                        </p>
                      </div>
                      <p className="font-bold">{item.total.toLocaleString()} HTG</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  selectedClient.status === 'En cours' ? 'bg-blue-100 text-blue-700' :
                  selectedClient.status === 'Terminée' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Statut: {selectedClient.status}
                </span>

                {selectedClient.commission_claimed && (
                  <span className="text-sm text-purple-600 font-medium">
                    Commission réclamée le {new Date(selectedClient.claim_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
