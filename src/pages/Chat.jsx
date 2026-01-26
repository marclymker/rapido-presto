import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft, Smile, Mic, Image as ImageIcon, Plus } from 'lucide-react';
import ProductContextCard from '@/components/chat/ProductContextCard';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // 1. Protection Auth au montage
  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (!u) window.location.href = '/login';
        else setUser(u);
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  // Extraction sécurisée de l'ID de l'URL
  const getUrlId = () => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('id');
  };
  const convIdFromUrl = getUrlId();

  // 2. Liste des conversations
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      // On s'assure que r.data est bien un tableau
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    retry: 1
  });

  // 3. Messages (triés par ordre chronologique)
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'messages', convId: selectedConv.id });
      const msgs = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      // Assurer le tri chronologique (plus ancien en haut)
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 5000
  });

  // 4. Mutation d'envoi
  const sendMessage = useMutation({
    mutationFn: (text) => base44.functions.invoke('chatService', { 
      action: 'send', 
      conversation_id: selectedConv.id, 
      content: text 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      setMessageText('');
    }
  });

  // 5. Synchronisation URL -> Sélection
  useEffect(() => {
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found && selectedConv?.id !== found.id) {
        setSelectedConv(found);
      }
    }
  }, [convIdFromUrl, conversations]);

  // 6. Scroll auto
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rendu de chargement (Évite la page blanche pendant l'auth)
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin text-orange-500 mb-2" />
        <p>Vérification de votre session...</p>
      </div>
    );
  }

  // Obtenir les initiales pour l'avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Formater l'heure
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar : Liste des discussions */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r bg-white`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-lg font-bold">Messages</h1>
          </div>
        </div>

        {/* Liste des conversations */}
        <div className="overflow-y-auto flex-1">
          {isLoadingConvs ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto text-orange-500 w-6 h-6" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">Aucune discussion</p>
            </div>
          ) : (
            conversations.map(c => {
              const contactName = user.id === c.vendor_id ? c.customer_name : c.shop_name;
              const isActive = selectedConv?.id === c.id;
              
              return (
                <div 
                  key={c.id} 
                  onClick={() => {
                     setSelectedConv(c);
                     window.history.pushState({}, '', `/chat?id=${c.id}`);
                  }} 
                  className={`p-4 border-b cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-orange-50 border-l-4 border-l-orange-500' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    {/* Avatar */}
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={c.shop_logo} />
                      <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold">
                        {getInitials(contactName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="font-bold text-sm text-black truncate">
                          {contactName}
                        </p>
                        <span className="text-xs text-orange-500 font-medium ml-2 shrink-0">
                          {formatTime(c.last_message_date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {c.last_message || "Démarrer la discussion"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white`}>
        {selectedConv ? (
          <>
            {/* Header Conversation */}
            <div className="p-4 border-b bg-white shadow-sm flex items-center gap-3 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden -ml-2 text-slate-600 hover:text-orange-500" 
                onClick={() => setSelectedConv(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedConv.shop_logo} />
                <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold">
                  {getInitials(user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-black truncate">
                  {user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}
                </p>
                <p className="text-xs text-slate-500">En ligne</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {/* Afficher le produit en contexte si disponible */}
              {selectedConv?.product_context_id && (
                <ProductContextCard productId={selectedConv.product_context_id} />
              )}
              
              {messages.map(m => {
                const isMe = m.sender_id === user.id;
                
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {/* Avatar pour messages reçus */}
                    {!isMe && (
                      <Avatar className="w-8 h-8 shrink-0 mt-1">
                        <AvatarImage src={selectedConv.shop_logo} />
                        <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                          {getInitials(m.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Bulle de message */}
                    <div 
                      className={`max-w-[75%] md:max-w-[60%] px-4 py-2.5 rounded-[18px] shadow-sm ${
                        isMe 
                          ? 'bg-[#FF8C00] text-white rounded-br-sm' 
                          : 'bg-[#F0F0F0] text-black rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Barre de saisie sticky */}
            <div className="sticky bottom-0 p-4 bg-white border-t shrink-0 safe-bottom">
              <div className="flex items-center gap-2">
                {/* Boutons d'action */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-[#FF8C00] hover:bg-orange-50 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-[#FF8C00] hover:bg-orange-50 shrink-0 hidden sm:flex"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>

                {/* Input message */}
                <div className="flex-1 relative">
                  <Input 
                    value={messageText} 
                    onChange={e => setMessageText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && messageText.trim() && sendMessage.mutate(messageText)}
                    placeholder="Écrivez votre message..."
                    className="pr-20 rounded-full border-slate-300 focus:border-[#FF8C00] focus:ring-[#FF8C00] text-sm"
                  />
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-[#FF8C00] hover:bg-orange-50 hidden sm:flex"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-[#FF8C00] hover:bg-orange-50 hidden sm:flex"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Bouton Envoyer */}
                <Button 
                  onClick={() => messageText.trim() && sendMessage.mutate(messageText)} 
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="bg-[#FF8C00] hover:bg-orange-600 text-white rounded-full w-12 h-12 p-0 shrink-0 shadow-lg"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
            <div className="bg-orange-50 rounded-full p-8 mb-4">
              <MessageSquare size={64} className="text-orange-200" />
            </div>
            <p className="text-slate-400 text-center font-medium">
              Sélectionnez une conversation pour commencer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}