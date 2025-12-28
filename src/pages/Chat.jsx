import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Image as ImageIcon, Package, Store, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Extraction propre de l'ID de conversation depuis l'URL
  const getConvIdFromUrl = () => new URLSearchParams(window.location.search).get('id');
  const convIdFromUrl = getConvIdFromUrl();

  // 1. Authentification
  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {
        toast.error("Veuillez vous connecter");
        base44.auth.redirectToLogin(window.location.pathname);
      });
  }, []);

  // 2. Récupération des conversations
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('chatService', { action: 'list' });
      return res.data || [];
    },
    enabled: !!user,
    refetchInterval: 5000 // Polling pour les nouveaux messages
  });

  // 3. Récupération des messages de la conversation sélectionnée
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        convId: selectedConv.id 
      });
      return res.data || [];
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000
  });

  // 4. Mutation : Envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type, metadata }) => {
      const res = await base44.functions.invoke('chatService', {
        action: 'send',
        conversation_id: selectedConv.id,
        sender_id: user.id,
        content,
        type: type || 'text',
        metadata: metadata || {}
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      queryClient.invalidateQueries(['conversations']);
      setMessageText('');
      setShowProductPicker(false);
    },
    onError: () => toast.error("Échec de l'envoi")
  });

  // 5. Mutation : Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('chatService', { 
      action: 'mark_read', 
      conversation_id: id 
    })
  });

  // Synchronisation entre l'URL et la conversation sélectionnée
  useEffect(() => {
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found && selectedConv?.id !== found.id) {
        setSelectedConv(found);
        markAsReadMutation.mutate(found.id);
      }
    }
  }, [convIdFromUrl, conversations]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({ content: messageText, type: 'text' });
  };

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  const isVendor = selectedConv && selectedConv.vendor_id === user.id;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* SIDEBAR : LISTE DES DISCUSSIONS */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b bg-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="text-orange-500" /> Messagerie
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoadingConvs ? (
            <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Aucune discussion.</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConv(conv);
                  window.history.pushState({}, '', `/chat?id=${conv.id}`);
                }}
                className={`w-full p-4 flex gap-3 border-b transition-colors ${selectedConv?.id === conv.id ? 'bg-orange-50' : 'bg-white hover:bg-slate-50'}`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  <img src={conv.shop_logo || conv.customer_avatar} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm truncate">{isVendor ? conv.customer_name : conv.shop_name}</p>
                    {conv.unread_count > 0 && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{conv.last_message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ZONE DE CHAT PRINCIPALE */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            {/* Header Chat */}
            <div className="p-4 border-b flex items-center gap-3 bg-white">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                <ArrowLeft />
              </Button>
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                <img src={isVendor ? selectedConv.customer_avatar : selectedConv.shop_logo} className="w-full h-full object-cover" />
              </div>
              <p className="font-bold">{isVendor ? selectedConv.customer_name : selectedConv.shop_name}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${isMine ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none'}`}>
                      {msg.type === 'product' ? (
                        <div className="bg-slate-50 p-2 rounded-lg text-slate-900 border mb-1">
                          <img src={msg.metadata?.product_image} className="w-20 h-20 object-cover rounded mb-2" />
                          <p className="text-xs font-bold">{msg.metadata?.product_name}</p>
                        </div>
                      ) : null}
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-[10px] opacity-60 mt-1 text-right">
                        {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input fixe en bas */}
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <Input 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrivez ici..."
                  className="rounded-full bg-slate-100 border-none"
                />
                <Button onClick={handleSendMessage} className="rounded-full bg-orange-500 hover:bg-orange-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageCircle size={64} />
            <p className="mt-2">Sélectionnez une discussion pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sous-composant pour l'icône manquante
function MessageSquare(props) {
  return <svg {...props} width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}