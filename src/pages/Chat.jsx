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

  useEffect(() => {
    base44.auth.me().then(u => u ? setUser(u) : window.location.href = '/login');
  }, []);

  // 1. Liste des conversations (ton menu "Messages")
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return r.data?.data || [];
    },
    enabled: !!user?.id
  });

  // 2. Historique des messages
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        conversation_id: selectedConv.id 
      });
      return r.data?.data || [];
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000 
  });

  // 3. Envoi de message
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900 font-sans">
      
      {/* MENU EXTERIEUR (Sidebar) */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex items-center gap-2 bg-white">
          <MessageSquare className="text-orange-500" size={20} /> Messages
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div key={c.id} onClick={() => setSelectedConv(c)} 
                 className={`p-4 border-b cursor-pointer transition ${selectedConv?.id === c.id ? 'bg-orange-50 border-r-4 border-r-orange-500' : 'bg-white hover:bg-slate-50'}`}>
              <p className="font-bold text-sm truncate">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
              <p className="text-xs text-slate-500 truncate mt-1">{c.last_message || "..."}</p>
            </div>
          ))}
        </div>
      </div>

      {/* INTERIEUR CONVERSATION */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white shadow-sm">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}><ArrowLeft /></Button>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</span>
                <span className="text-[9px] text-slate-400 font-mono">ID: {selectedConv.id}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 flex flex-col">
              {messages.length === 0 && !loadingMsgs ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                  <p className="text-sm italic">Aucun message trouvé dans l'historique.</p>
                  <p className="text-[10px] mt-2 opacity-70">Si un aperçu existe dans le menu mais pas ici, envoyez un nouveau message pour synchroniser.</p>
                </div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${m.sender_id === user.id ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white flex gap-2">
              <Input 
                value={messageText} 
                onChange={e => setMessageText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && messageText.trim() && sendMessage.mutate(messageText)} 
                placeholder="Écrivez ici..." 
                className="bg-slate-50"
              />
              <Button onClick={() => messageText.trim() && sendMessage.mutate(messageText)} disabled={sendMessage.isPending || !messageText.trim()} className="bg-orange-500 hover:bg-orange-600 rounded-full w-10 h-10 p-0 flex items-center justify-center">
                {sendMessage.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <MessageSquare size={64} className="opacity-10 mb-2" />
            <p className="text-sm">Sélectionnez une discussion</p>
          </div>
        )}
      </div>
    </div>
  );
}