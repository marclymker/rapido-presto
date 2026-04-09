import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Phone, Video, Info, MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { applyClientMargin } from '@/components/utils/priceCalculation';

import ConversationList from '@/components/chat/ConversationList';
import MessageFeed from '@/components/chat/MessageFeed';
import ChatInput from '@/components/chat/ChatInput';
import ProductPicker from '@/components/chat/ProductPicker';

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
const MESSAGES_LIMIT = 40;

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [sendingProduct, setSendingProduct] = useState(false);
  // Optimistic messages stockés localement
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const queryClient = useQueryClient();

  const convIdFromUrl = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id')
    : null;

  useEffect(() => {
    base44.auth.me()
      .then(u => { if (!u) base44.auth.redirectToLogin('/Chat'); else setUser(u); })
      .catch(() => base44.auth.redirectToLogin('/Chat'));
  }, []);

  // Conversations — polling léger 15s
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    enabled: !!user?.id,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // Fetch direct si pas encore dans la liste
  const { data: directConv } = useQuery({
    queryKey: ['conversation-direct', convIdFromUrl],
    queryFn: () => base44.entities.Conversation.get(convIdFromUrl),
    enabled: !!convIdFromUrl && !!user?.id,
    staleTime: 0,
  });

  useEffect(() => {
    if (!convIdFromUrl || selectedConv?.id === convIdFromUrl) return;
    const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
    if (found) setSelectedConv(found);
    else if (directConv) setSelectedConv(directConv);
  }, [convIdFromUrl, conversations, directConv]);

  // Messages — last MESSAGES_LIMIT, cache persistant, polling 5s seulement si conv active
  const { data: serverMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'messages', convId: selectedConv.id });
      const msgs = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      return msgs
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        .slice(-MESSAGES_LIMIT);
    },
    enabled: !!selectedConv?.id,
    staleTime: 3000,
    refetchInterval: selectedConv ? 5000 : false,
    gcTime: 30 * 60 * 1000, // Cache 30 min (lecture offline)
  });

  // Fusionner messages serveur + optimistic (dédupliquer par content + date approx)
  const messages = (() => {
    const serverIds = new Set(serverMessages.map(m => m.id));
    // Retirer les optimistic qui ont été confirmés (même contenu dans serverMessages)
    const pendingOptimistic = optimisticMessages.filter(o =>
      !serverMessages.some(s => s.content === o.content && s.sender_id === o.sender_id &&
        Math.abs(new Date(s.created_date) - new Date(o.created_date)) < 10000)
    );
    return [...serverMessages, ...pendingOptimistic]
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  })();

  // Quand les messages serveur arrivent, nettoyer les optimistic confirmés
  useEffect(() => {
    if (serverMessages.length > 0) {
      setOptimisticMessages(prev => prev.filter(o =>
        !serverMessages.some(s => s.content === o.content && s.sender_id === o.sender_id &&
          Math.abs(new Date(s.created_date) - new Date(o.created_date)) < 10000)
      ));
    }
  }, [serverMessages]);

  const handleSelectConv = useCallback((c) => {
    setSelectedConv(c);
    setOptimisticMessages([]);
    window.history.pushState({}, '', `/Chat?id=${c.id}`);
  }, []);

  // Callback du ChatInput — ajoute optimistic ou force refetch
  const handleMessageSent = useCallback((optimisticMsg) => {
    if (optimisticMsg) {
      setOptimisticMessages(prev => [...prev, optimisticMsg]);
    }
    // Refetch après un court délai pour récupérer la réponse IA
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    }, 1500);
  }, [selectedConv?.id, user?.id, queryClient]);

  // Envoi carte produit (vendeur)
  const handleSendProduct = useCallback(async (product) => {
    setSendingProduct(true);
    try {
      await base44.functions.invoke('chatService', {
        action: 'send',
        conversation_id: selectedConv.id,
        content: `🛍️ ${product.name} — ${applyClientMargin(product.promo_price || product.price).toLocaleString()} HTG`,
        type: 'product',
        metadata: {
          productId: product.id,
          productName: product.name,
          productImage: product.image_url,
          productPrice: applyClientMargin(product.promo_price || product.price),
          productSlug: product.slug
        }
      });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      setShowProductPicker(false);
      toast.success('Carte produit envoyée');
    } catch {
      toast.error("Erreur d'envoi");
    } finally {
      setSendingProduct(false);
    }
  }, [selectedConv, queryClient]);

  const handleOpenProductPicker = useCallback(async () => {
    setShowProductPicker(true);
    if (vendorProducts.length === 0) {
      const r = await base44.functions.invoke('chatService', { action: 'vendor_products', convId: selectedConv.id });
      setVendorProducts(Array.isArray(r.data) ? r.data : (r.data?.data || []));
    }
  }, [vendorProducts.length, selectedConv]);

  const isVendor = !!(user && selectedConv && user.id === selectedConv.vendor_id);

  if (!user) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-[#0084FF] w-8 h-8" />
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-white overflow-hidden">

      {/* LISTE */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] lg:w-[380px] flex-col h-full border-r border-gray-200 shrink-0`}>
        <ConversationList
          conversations={conversations}
          isLoading={isLoadingConvs}
          selectedConvId={selectedConv?.id}
          userId={user.id}
          onSelect={handleSelectConv}
        />
      </div>

      {/* ZONE CHAT */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-white relative overflow-hidden`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-[#0084FF] h-10 w-10"
                  onClick={() => { setSelectedConv(null); window.history.pushState({}, '', '/Chat'); }}>
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={selectedConv.shop_logo} />
                  <AvatarFallback className="bg-[#E4E6EB] text-black text-sm">
                    {getInitials(isVendor ? selectedConv.customer_name : selectedConv.shop_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-[14px] leading-tight">
                    {isVendor ? selectedConv.customer_name : selectedConv.shop_name}
                  </p>
                  <p className="text-[11px] text-[#31A24C]">● En ligne</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#0084FF]">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Phone className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Video className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Info className="w-5 h-5" /></Button>
              </div>
            </div>

            {/* Messages */}
            <MessageFeed
              messages={messages}
              selectedConv={selectedConv}
              user={user}
              isLoading={isLoadingMessages && serverMessages.length === 0}
            />

            {/* Picker produit */}
            {showProductPicker && (
              <ProductPicker
                products={vendorProducts}
                onSelect={handleSendProduct}
                onClose={() => setShowProductPicker(false)}
                isSending={sendingProduct}
              />
            )}

            {/* Input */}
            <ChatInput
              conversationId={selectedConv.id}
              isVendor={isVendor}
              user={user}
              onMessageSent={handleMessageSent}
              onOpenProductPicker={handleOpenProductPicker}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageCircle className="w-16 h-16 text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-black mb-2">Vos messages</h2>
            <p className="text-gray-500 text-[15px]">Envoyez des photos et des messages privés.</p>
          </div>
        )}
      </div>
    </div>
  );
}