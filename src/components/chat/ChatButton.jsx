import React, { useState, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

export default function ChatButton({ product, shop }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    firebaseApi.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const createConvMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        firebaseApi.auth.redirectToLogin(window.location.pathname);
        return;
      }

      const response = await firebaseApi.functions.invoke('chatService', {
        action: 'init',
        vendor_id: shop.user_id,
        shop_id: shop.id,
        shop_name: shop.company_name,
        shop_logo: shop.company_logo_url,
        product_id: product?.id,
        initial_message: 'Bonjour, cet article est-il disponible ?'
      });
      return response.data?.conversation || { id: response.data?.id };
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
      className="w-full bg-[#0084FF] hover:bg-[#0077E6] text-white"
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
