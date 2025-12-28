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
  const convIdFromUrl = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => window.location.href = '/login');
  }, []);

  // Liste des conversations (Polling 10s pour éviter 429)
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'list' }).then(r => r.data || []),
    enabled: !!user?.id,
    refetchInterval: 10000, 
    retry: false
  });

  // Messages (Polling 5s)
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'messages', convId: selectedConv.id }).then(r => r.data || []),
    enabled: !!selectedConv?.id,
    refetchInterval: 5000,
    retry: false
  });

  // Auto-sélection de la conversation depuis l'URL
  useEffect(() => {
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found) setSelectedConv(found);
    }
  }, [convIdFromUrl, conversations]);

  const sendMessage = useMutation({
    mutationFn: (text) => base44.functions.invoke('chatService', { 
      action: 'send', 
      conversation_id: selectedConv.id, 
      content: text 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv.id]);
      setMessageText('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if (!user || isLoadingConvs) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex gap-2 items-center"><MessageSquare size={20}/> Discussions</div>
        <div className="overflow-y-auto flex-1">
          {conversations.map(c => (
            <div key={c.id} onClick={() => setSelectedConv(c)} className={`p-4 border-b cursor-pointer transition ${selectedConv?.id === c.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'bg-white'}`}>
              <p className="font-bold text-sm truncate">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
              <p className="text-xs text-slate-500 truncate">{c.last_message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white">
              <ArrowLeft className="md:hidden cursor-pointer" onClick={() => setSelectedConv(null)} />
              <p className="font-bold">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${m.sender_id === user.id ? 'bg-orange-500 text-white' : 'bg-white text-slate-800 border'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white border-t flex gap-2">
              <Input 
                value={messageText} 
                onChange={e => setMessageText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage.mutate(messageText)}
                placeholder="Votre message..."
                disabled={sendMessage.isPending}
              />
              <Button onClick={() => sendMessage.mutate(messageText)} disabled={sendMessage.isPending} className="bg-orange-500 hover:bg-orange-600">
                {sendMessage.isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare size={60} className="mb-4 opacity-20" />
            <p>Sélectionnez une discussion pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}