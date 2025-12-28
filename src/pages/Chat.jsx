import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // 1. Authentification
  useEffect(() => {
    base44.auth.me().then(u => u ? setUser(u) : window.location.href = '/login').catch(() => window.location.href = '/login');
  }, []);

  // 2. Liste des conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'list' }).then(r => r.data?.data || []),
    enabled: !!user?.id,
    refetchInterval: 10000
  });

  // 3. Flux des messages (C'est ici que l'on force la détection)
  const { data: messages = [], isLoading: loadingMsgs, error: msgError } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      // LOG POUR DEBUGGER : Regarde ta console (F12)
      console.log("Demande de messages pour l'ID :", selectedConv.id);
      
      const response = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        conversation_id: selectedConv.id 
      });

      // On vérifie tous les formats possibles de retour
      const finalData = response.data?.data || response.data || [];
      return Array.isArray(finalData) ? finalData : [];
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000
  });

  // 4. Envoi de message
  const sendMessage = useMutation({
    mutationFn: (text) => base44.functions.invoke('chatService', { 
      action: 'send', 
      conversation_id: selectedConv.id, 
      content: text 
    }),
    onSuccess: () => {
      // On force le rafraîchissement immédiat
      queryClient.invalidateQueries(['messages', selectedConv.id]);
      setMessageText('');
    }
  });

  // Synchronisation URL
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(id));
      if (found) setSelectedConv(found);
    }
  }, [conversations]);

  // Scroll auto vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      {/* SIDEBAR */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex items-center gap-2 bg-white">
          <MessageSquare className="text-orange-500" /> Discussions
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div key={c.id} onClick={() => { setSelectedConv(c); window.history.pushState({}, '', `/chat?id=${c.id}`); }} 
                 className={`p-4 border-b cursor-pointer transition ${selectedConv?.id === c.id ? 'bg-orange-50 border-r-4 border-r-orange-500' : 'bg-white hover:bg-slate-50'}`}>
              <p className="font-bold text-sm truncate">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
              <p className="text-xs text-slate-500 truncate">{c.last_message || "Nouveau message"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ZONE DE CHAT */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}><ArrowLeft /></Button>
                <p className="font-bold">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">ID: {selectedConv.id}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 flex flex-col">
              {/* DIAGNOSTIC : Si aucun message n'apparaît */}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-10 text-slate-400 bg-white border border-dashed rounded-xl">
                   <AlertTriangle className="mb-2 text-orange-300" />
                   <p className="text-sm">Aucun message trouvé pour cette conversation.</p>
                   <p className="text-[10px]">Vérifiez que vos messages en base ont bien l'ID : {selectedConv.id}</p>
                </div>
              )}

              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm text-sm ${m.sender_id === user.id ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white flex gap-2">
              <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === 'Enter' && messageText.trim() && sendMessage.mutate(messageText)} placeholder="Votre message..." />
              <Button onClick={() => messageText.trim() && sendMessage.mutate(messageText)} disabled={sendMessage.isPending || !messageText.trim()} className="bg-orange-500">
                {sendMessage.isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare size={64} className="opacity-10 mb-2" />
            <p>Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}