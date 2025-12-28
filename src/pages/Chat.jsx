import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft, Store } from 'lucide-react';
import { toast } from "sonner";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin('/chat'));
  }, []);

  // 1. Liste des conversations
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'list' }).then(r => r.data || []),
    enabled: !!user?.id,
    refetchInterval: 5000
  });

  // 2. Messages de la conversation sélectionnée
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'messages', convId: selectedConv.id }).then(r => r.data || []),
    enabled: !!selectedConv?.id,
    refetchInterval: 3000
  });

  // 3. LOGIQUE D'INITIALISATION AUTO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('vendorId');
    const pId = params.get('productId');
    const cId = params.get('id');

    // Cas A : On a déjà un ID dans l'URL, on cherche la conv dans la liste
    if (cId && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(cId));
      if (found) setSelectedConv(found);
    } 
    // Cas B : On arrive d'un produit (vId présent) mais sans ID de conversation
    else if (vId && conversations.length > 0 && user) {
      const existing = conversations.find(c => String(c.vendor_id) === String(vId) || String(c.customer_id) === String(vId));
      
      if (existing) {
        setSelectedConv(existing);
        window.history.replaceState({}, '', `/chat?id=${existing.id}`);
      } else {
        // Création réelle si elle n'existe pas du tout
        base44.functions.invoke('chatService', { action: 'init', vendor_id: vId, product_id: pId })
          .then(res => {
            if (res.data?.id) {
              queryClient.invalidateQueries(['conversations']);
              window.history.replaceState({}, '', `/chat?id=${res.data.id}`);
            }
          });
      }
    }
  }, [conversations, user]);

  // 4. Mutation d'envoi
  const sendMessage = useMutation({
    mutationFn: (vars) => base44.functions.invoke('chatService', { action: 'send', conversation_id: selectedConv.id, ...vars }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv.id]);
      setMessageText('');
    }
  });

  if (!user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-white">
      {/* Liste des convs */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r`}>
        <div className="p-4 border-b font-bold flex gap-2"><MessageSquare /> Discussions</div>
        <div className="overflow-y-auto">
          {conversations.map(c => (
            <div key={c.id} onClick={() => setSelectedConv(c)} className={`p-4 border-b cursor-pointer ${selectedConv?.id === c.id ? 'bg-orange-50' : ''}`}>
              <p className="font-bold text-sm">{user.id === c.vendor_id ? c.customer_name : c.shop_name}</p>
              <p className="text-xs text-gray-500 truncate">{c.last_message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zone Chat */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <ArrowLeft className="md:hidden" onClick={() => setSelectedConv(null)} />
              <p className="font-bold">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] ${m.sender_id === user.id ? 'bg-orange-500 text-white' : 'bg-white border'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t flex gap-2">
              <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage.mutate({ content: messageText })} />
              <Button onClick={() => sendMessage.mutate({ content: messageText })} className="bg-orange-500"><Send size={18} /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <MessageSquare size={48} />
            <p>Sélectionnez une discussion</p>
          </div>
        )}
      </div>
    </div>
  );
}