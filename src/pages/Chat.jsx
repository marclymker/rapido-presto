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
    base44.auth.me().then(u => u ? setUser(u) : window.location.href = '/login').catch(() => window.location.href = '/login');
  }, []);

  const convIdFromUrl = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id');

  // 1. Liste des discussions
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'list' }).then(r => r.data?.data || []),
    enabled: !!user?.id,
    refetchInterval: 10000
  });

  // 2. Flux des messages (HISTORIQUE)
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      console.log("Tentative de récupération pour :", selectedConv.id);
      const r = await base44.functions.invoke('chatService', { 
        action: 'messages', 
        conversation_id: selectedConv.id 
      });
      const data = r.data?.data || [];
      console.log("Messages reçus :", data.length);
      return data;
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 4000
  });

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
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found) setSelectedConv(found);
    }
  }, [convIdFromUrl, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      {/* Sidebar */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex items-center gap-2 bg-white">
          <MessageSquare className="text-orange-500" /> Vos messages
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Aucune conversation.</div>
          ) : conversations.map(c => (
            <div key={c.id} onClick={() => { setSelectedConv(c); window.history.pushState({}, '', `/chat?id=${c.id}`); }} 
                 className={`p-4 border-b cursor-pointer transition ${selectedConv?.id === c.id ? 'bg-orange-50 border-r-4 border-r-orange-500' : 'bg-white hover:bg-slate-50'}`}>
              <p className="font-bold text-sm truncate">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
              <p className="text-xs text-slate-500 truncate">{c.last_message || "..."}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white shadow-sm">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}><ArrowLeft /></Button>
              <div className="font-bold">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 flex flex-col">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm text-sm ${m.sender_id === user.id ? 'bg-orange-500 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white flex gap-2">
              <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === 'Enter' && messageText.trim() && sendMessage.mutate(messageText)} placeholder="Écrivez votre message..." />
              <Button onClick={() => messageText.trim() && sendMessage.mutate(messageText)} disabled={sendMessage.isPending || !messageText.trim()} className="bg-orange-500 hover:bg-orange-600">
                {sendMessage.isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <MessageSquare size={64} className="opacity-10 mb-4" />
            <p className="text-sm font-medium">Sélectionnez une discussion pour voir l'historique</p>
          </div>
        )}
      </div>
    </div>
  );
}