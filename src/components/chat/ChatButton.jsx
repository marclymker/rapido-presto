import React, { useState, useEffect } from 'react';
import { firebase } from '@/api/firebaseClient';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

export default function ChatButton({ product, shop }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    firebase.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const createConvMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        firebase.auth.redirectToLogin(window.location.pathname);
        return;
      }

      // Vérifier si une conversation existe déjà
      const existing = await firebase.entities.Conversation.filter({
        customer_id: user.id,
        shop_id: shop.id
      });

      if (existing && existing.length > 0) {
        return existing[0];
      }

      // Créer nouvelle conversation
      return await firebase.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name,
        vendor_id: shop.user_id,
        shop_id: shop.id,
        shop_name: shop.company_name,
        shop_logo: shop.company_logo_url,
        last_message: 'Nouvelle conversation',
        last_message_date: new Date().toISOString(),
        product_context_id: product?.id
      });
    },
    onSuccess: (conv) => {
      window.location.href = `${createPageUrl('Chat')}?id=${conv.id}`;
    },
    onError: () => {
      toast.error('Erreur lors de l\'ouverture du chat');
    }
  });

  return (
    <Button
      onClick={() => createConvMutation.mutate()}
      disabled={createConvMutation.isPending}
      variant="outline"
      className="w-full"
    >
      {createConvMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4 mr-2" />
      )}
      Contacter le vendeur
    </Button>
  );
}