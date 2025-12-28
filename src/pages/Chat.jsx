import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft } from 'lucide-react';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
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
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    retry: 1
  });

  // 3. Messages - MODIFIÉ : Utiliser un timestamp pour forcer le re-fetch
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv?.id, Date.now()], // Ajout timestamp
    queryFn: async () => {
      if (!selectedConv?.id) return [];
      const r = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        convId: selectedConv.id 
      });
      const messagesArray = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      
      // S'assurer que les messages sont triés du plus ancien au plus récent
      return messagesArray.sort((a, b) => {
        const dateA = a.created_at || a.timestamp || a.id;
        const dateB = b.created_at || b.timestamp || b.id;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000, // Réduit à 3s pour plus de réactivité
    staleTime: 1000
  });

  // 4. Mutation d'envoi - AMÉLIORÉE
  const sendMessage = useMutation({
    mutationFn: async (text) => {
      return await base44.functions.invoke('chatService', { 
        action: 'send', 
        conversation_id: selectedConv.id, 
        content: text 
      });
    },
    onSuccess: () => {
      // Invalider ET recharger immédiatement les messages
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      queryClient.refetchQueries(['messages', selectedConv?.id]);
      setMessageText('');
    },
    onError: (error) => {
      console.error('Erreur envoi message:', error);
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

  // 6. Scroll automatique vers le bas - CORRIGÉ
  useEffect(() => {
    // Utiliser setTimeout pour s'assurer que le DOM est mis à jour
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  }, [messages]);

  // Fonction pour formater l'heure du message
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin text-orange-500 mb-2" />
        <p>Vérification de votre session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex gap-2 items-center bg-white">
          <MessageSquare className="text-orange-500" /> Vos messages
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoadingConvs ? (
            <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Aucune discussion trouvée.</div>
          ) : (
            conversations.map(c => (
              <div 
                key={c.id} 
                onClick={() => {
                  setSelectedConv(c);
                  window.history.pushState({}, '', `/chat?id=${c.id}`);
                }} 
                className={`p-4 border-b cursor-pointer transition ${selectedConv?.id === c.id ? 'bg-orange-50 border-r-4 border-r-orange-500' : 'bg-white hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-bold text-sm truncate">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
                  <span className="text-xs text-slate-400">
                    {c.last_message_date ? new Date(c.last_message_date).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-1">{c.last_message || "Démarrer la discussion"}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white shadow-sm">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                <ArrowLeft />
              </Button>
              <div className="font-bold">
                {user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}
              </div>
            </div>

            {/* Zone des messages avec scroll automatique */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-2 opacity-30" />
                    <p>Envoyez le premier message !</p>
                  </div>
                </div>
              ) : (
                messages.map(m => (
                  <div 
                    key={m.id} 
                    className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col max-w-[85%]">
                      <div 
                        className={`p-3 rounded-2xl shadow-sm text-sm ${m.sender_id === user.id ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}
                      >
                        {m.content}
                      </div>
                      <span 
                        className={`text-xs mt-1 px-2 ${m.sender_id === user.id ? 'text-right text-slate-500' : 'text-left text-slate-400'}`}
                      >
                        {formatMessageTime(m.created_at || m.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {/* Element invisible pour le scroll automatique */}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-4 bg-white border-t flex gap-2">
              <Input 
                value={messageText} 
                onChange={e => setMessageText(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                    e.preventDefault();
                    sendMessage.mutate(messageText);
                  }
                }}
                placeholder="Écrivez votre message..."
                disabled={sendMessage.isPending}
              />
              <Button 
                onClick={() => {
                  if (messageText.trim()) {
                    sendMessage.mutate(messageText);
                  }
                }} 
                disabled={!messageText.trim() || sendMessage.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {sendMessage.isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare size={80} className="opacity-10 mb-4" />
            <p>Sélectionnez un contact pour discuter</p>
          </div>
        )}
      </div>
    </div>
  );
}