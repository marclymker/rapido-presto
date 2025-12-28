import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft, AlertCircle } from 'lucide-react';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // 1. Authentification de l'utilisateur
  useEffect(() => {
    base44.auth.me()
      .then(u => u ? setUser(u) : window.location.href = '/login')
      .catch(() => window.location.href = '/login');
  }, []);

  // 2. Récupération de la liste des conversations (Sidebar)
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return r.data?.data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000
  });

  // 3. Récupération de l'historique des messages
  const { data: messages = [], isLoading: isLoadingMsgs } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      // On envoie explicitement l'ID de la conversation sélectionnée
      const r = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        conversation_id: selectedConv.id 
      });
      return r.data?.data || [];
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000 // Rafraîchissement rapide pour voir les nouveaux messages
  });

  // 4. Mutation pour envoyer un message
  const sendMessage = useMutation({
    mutationFn: async (text) => {
      return base44.functions.invoke('chatService', { 
        action: 'send', 
        conversation_id: selectedConv.id, // Utilise l'ID de la discussion en cours
        content: text 
      });
    },
    onSuccess: () => {
      // Invalider le cache pour forcer l'affichage du nouveau message
      queryClient.invalidateQueries(['messages', selectedConv.id]);
      setMessageText('');
    }
  });

  // Gestion du retour automatique en bas de page
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Synchronisation avec l'ID dans l'URL (si présent)
  useEffect(() => {
    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(urlId));
      if (found) setSelectedConv(found);
    }
  }, [conversations]);

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans antialiased text-slate-900">
      
      {/* SIDEBAR (Liste des discussions) */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex items-center gap-2 bg-white">
          <MessageSquare className="text-orange-500" size={20} />
          <span>Messages</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingConvs ? (
            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
          ) : conversations.map(c => (
            <div 
              key={c.id} 
              onClick={() => {
                setSelectedConv(c);
                window.history.pushState({}, '', `/chat?id=${c.id}`);
              }} 
              className={`p-4 border-b cursor-pointer transition-all ${selectedConv?.id === c.id ? 'bg-orange-50 border-r-4 border-r-orange-500' : 'bg-white hover:bg-slate-50'}`}
            >
              <p className="font-bold text-sm truncate">
                {user.id === c.vendor_id ? c.customer_name : c.shop_name}
              </p>
              <p className="text-xs text-slate-500 truncate mt-1">
                {c.last_message || "Aucun message"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ZONE DE DISCUSSION */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            {/* Header de la discussion */}
            <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                  <ArrowLeft size={20} />
                </Button>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">
                    {user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">ID: {selectedConv.id}</span>
                </div>
              </div>
            </div>
            
            {/* Flux de messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 flex flex-col">
              {messages.length === 0 && !isLoadingMsgs && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                  <AlertCircle size={40} className="mb-2" />
                  <p className="text-sm">Aucun message dans cette discussion.</p>
                </div>
              )}

              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm shadow-sm ${
                    m.sender_id === user.id 
                      ? 'bg-orange-500 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border rounded-bl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone d'envoi */}
            <div className="p-4 bg-white border-t flex gap-2 items-center">
              <Input 
                value={messageText} 
                onChange={e => setMessageText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && messageText.trim() && sendMessage.mutate(messageText)}
                placeholder="Écrivez votre message..." 
                className="flex-1"
              />
              <Button 
                onClick={() => messageText.trim() && sendMessage.mutate(messageText)} 
                disabled={sendMessage.isPending || !messageText.trim()} 
                className="bg-orange-500 hover:bg-orange-600 h-10 w-10 p-0 rounded-full flex items-center justify-center transition-transform active:scale-95"
              >
                {sendMessage.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <MessageSquare size={80} className="opacity-10 mb-4" />
            <p className="text-sm">Sélectionnez une discussion pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}