import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Image as ImageIcon, Package, Store, Loader2, MessageCircle, MessageSquare } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Extraction de l'ID de l'URL sans dépendance complexe
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const convIdFromUrl = urlParams.get('id');

  // 1. Authentification avec sécurité
  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch((err) => {
        console.error("Auth error:", err);
        // Si pas de user, on redirige
        if (typeof window !== 'undefined') {
            base44.auth.redirectToLogin(window.location.pathname);
        }
      });
  }, []);

  // 2. Récupération des conversations
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('chatService', { action: 'list' });
        return res.data || [];
      } catch (e) {
        console.error("List conversations error:", e);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 5000 
  });

  // 3. Récupération des messages
  const { data: messages = [] } = useQuery({
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

  // 4. Mutation d'envoi
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type, metadata }) => {
      return await base44.functions.invoke('chatService', {
        action: 'send',
        conversation_id: selectedConv.id,
        content,
        type: type || 'text',
        metadata: metadata || {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      setMessageText('');
    }
  });

  // Gestion de la sélection automatique via URL
  useEffect(() => {
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found && (!selectedConv || selectedConv.id !== found.id)) {
        setSelectedConv(found);
      }
    }
  }, [convIdFromUrl, conversations]);

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText });
  };

  // Rendu de sécurité pendant le chargement initial
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
        <p className="text-slate-500 text-sm">Chargement de votre messagerie...</p>
      </div>
    );
  }

  const isVendor = selectedConv && selectedConv.vendor_id === user.id;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r`}>
        <div className="p-4 border-b font-bold text-lg flex items-center gap-2">
          <MessageSquare className="text-orange-500 w-5 h-5" /> Discussions
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv)}
              className={`p-4 border-b cursor-pointer transition-colors ${selectedConv?.id === conv.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  <img src={conv.shop_logo || 'https://via.placeholder.com/40'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{isVendor ? conv.customer_name : conv.shop_name}</p>
                  <p className="text-xs text-slate-500 truncate">{conv.last_message || 'Nouveau message...'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                <ArrowLeft />
              </Button>
              <p className="font-bold">{isVendor ? selectedConv.customer_name : selectedConv.shop_name}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender_id === user.id ? 'bg-orange-500 text-white' : 'bg-white border'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t flex gap-2">
              <Input 
                value={messageText} 
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Écrivez un message..."
              />
              <Button onClick={handleSendMessage} className="bg-orange-500">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageCircle size={48} className="mb-2 opacity-20" />
            <p>Sélectionnez une discussion</p>
          </div>
        )}
      </div>
    </div>
  );
}