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
  const queryClient = useQueryClient();

  // 1. Connexion utilisateur
  useEffect(() => {
    base44.auth.me().then(u => u ? setUser(u) : window.location.href = '/login');
  }, []);

  // 2. Liste des conversations (ton menu avec "hola", "Hi")
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return r.data?.data || [];
    },
    enabled: !!user?.id
  });

  // 3. Historique des messages (C'est ici qu'on corrige le filtrage)
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      // On logue l'ID pour vérifier ce qu'on envoie au serveur
      console.log("Chargement messages pour :", selectedConv.id);
      
      const r = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        conversation_id: String(selectedConv.id) // On s'assure que c'est du texte
      });
      
      return r.data?.data || [];
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000 // On vérifie toutes les 3 secondes
  });

  // 4. Envoi de message
  const sendMessage = useMutation({
    mutationFn: (text) => base44.functions.invoke('chatService', { 
      action: 'send', 
      conversation_id: selectedConv.id, 
      content: text 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv.id]);
      setMessageText('');
    }
  });

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      
      {/* SIDEBAR (Ton menu "Messages") */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex items-center gap-2 bg-white">
          <MessageSquare className="text-orange-500" /> Messages
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div key={c.id} onClick={() => setSelectedConv(c)} 
                 className={`p-4 border-b cursor-pointer ${selectedConv?.id === c.id ? 'bg-orange-50 border-r-4 border-r-orange-500' : 'bg-white'}`}>
              <p className="font-bold text-sm truncate">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
              <p className="text-xs text-slate-500 truncate">{c.last_message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ZONE DE CHAT */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}><ArrowLeft /></Button>
              <div className="flex flex-col">
                <span className="font-bold">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</span>
                <span className="text-[10px] text-slate-400">ID: {selectedConv.id}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 flex flex-col">
              {messages.length === 0 && !loadingMsgs ? (
                <div className="text-center text-slate-400 text-sm mt-10 italic">
                  Aucun message trouvé dans l'historique.<br/>
                  (L'aperçu "{selectedConv.last_message}" suggère un problème de lien avec l'ID)
                </div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${m.sender_id === user.id ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white flex gap-2">
              <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === 'Enter' && messageText.trim() && sendMessage.mutate(messageText)} placeholder="Écrivez ici..." />
              <Button onClick={() => messageText.trim() && sendMessage.mutate(messageText)} disabled={sendMessage.isPending || !messageText.trim()} className="bg-orange-500"><Send size={18} /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300">
            Sélectionnez une discussion
          </div>
        )}
      </div>
    </div>
  );
}