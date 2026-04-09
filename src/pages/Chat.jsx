import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ArrowLeft, Image as ImageIcon, Phone, Video, Info, PlusCircle, Smile, Sticker, Edit, Search, Menu, MessageCircle, Users, Compass } from 'lucide-react';
import ProductContextCard from '@/components/chat/ProductContextCard';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (!u) window.location.href = '/login';
        else setUser(u);
      })
      .catch(() => window.location.href = '/login');
  }, []);

  const getUrlId = () => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('id');
  };
  const convIdFromUrl = getUrlId();

  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'messages', convId: selectedConv.id });
      const msgs = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 3000
  });

  const sendMessage = useMutation({
    mutationFn: (text) => base44.functions.invoke('chatService', { 
      action: 'send', conversation_id: selectedConv.id, content: text, type: 'text'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      setMessageText('');
    }
  });

  const sendImageMessage = useMutation({
    mutationFn: (imageUrl) => base44.functions.invoke('chatService', { 
      action: 'send', conversation_id: selectedConv.id, content: 'Photo', type: 'image', metadata: { imageUrl }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      setIsUploading(false);
    },
    onError: () => {
      toast.error("Erreur d'envoi");
      setIsUploading(false);
    }
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error("Format invalide");
    
    setIsUploading(true);
    try {
      const uploadResult = await base44.storage.upload(file);
      if (uploadResult?.url) sendImageMessage.mutate(uploadResult.url);
    } catch (error) {
      toast.error("Échec de l'upload");
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fetch direct si la conv n'est pas encore dans la liste (ex: conversation toute fraîche)
  const { data: directConv } = useQuery({
    queryKey: ['conversation-direct', convIdFromUrl],
    queryFn: () => base44.entities.Conversation.filter({ id: convIdFromUrl }).then(r => r[0] || null),
    enabled: !!convIdFromUrl && !!user?.id,
    staleTime: 0,
  });

  useEffect(() => {
    if (!convIdFromUrl || selectedConv?.id === convIdFromUrl) return;
    // Chercher d'abord dans la liste
    const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
    if (found) {
      setSelectedConv(found);
    } else if (directConv) {
      setSelectedConv(directConv);
    }
  }, [convIdFromUrl, conversations, directConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#0084FF] w-8 h-8" /></div>;

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return new Date() - d < 86400000 
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-[100dvh] w-full bg-white font-sans text-[#050505] overflow-hidden">
      
      {/* ========================================== */}
      {/* INTERFACE 1 : LA LISTE DES CHATS (INBOX)   */}
      {/* ========================================== */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] lg:w-[400px] flex-col h-full border-r border-gray-200 bg-white shrink-0`}>
        
        {/* Header Inbox Messenger */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="bg-gray-100 hover:bg-gray-200 rounded-full h-10 w-10 shrink-0">
                <Menu className="w-5 h-5 text-black" />
              </Button>
              <h1 className="text-[24px] font-bold tracking-tight">Discussions</h1>
            </div>
            <Button variant="ghost" size="icon" className="bg-gray-100 hover:bg-gray-200 rounded-full h-10 w-10 shrink-0">
              <Edit className="w-5 h-5 text-black" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Rechercher" 
              className="w-full bg-[#F0F2F5] hover:bg-[#E4E6EB] transition-colors rounded-full py-[8px] pl-9 pr-4 text-[15px] outline-none placeholder:text-gray-500" 
            />
          </div>
        </div>

        {/* Liste des conversations */}
        <div className="overflow-y-auto flex-1 px-2 pt-2">
          {isLoadingConvs ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#0084FF]" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-gray-400 mt-10 text-[15px]">Aucun message</p>
          ) : (
            conversations.map(c => {
              const contactName = user.id === c.vendor_id ? c.customer_name : c.shop_name;
              const isActive = selectedConv?.id === c.id;
              const isUnread = c.unread_count > 0;
              
              return (
                <div 
                  key={c.id} 
                  onClick={() => { setSelectedConv(c); window.history.pushState({}, '', `/chat?id=${c.id}`); }} 
                  className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${isActive ? 'bg-[#EAF3FF]' : 'hover:bg-[#F2F2F2]'}`}
                >
                  <Avatar className="w-[56px] h-[56px] shrink-0">
                    <AvatarImage src={c.shop_logo} />
                    <AvatarFallback className="bg-[#E4E6EB] text-black text-lg">{getInitials(contactName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`text-[15px] truncate ${isUnread ? 'font-semibold text-black' : 'text-[#050505]'}`}>{contactName}</p>
                    <div className="flex text-[13px] text-gray-500 truncate items-center gap-1">
                      <span className={`truncate ${isUnread ? 'font-semibold text-[#0084FF]' : ''}`}>{c.last_message || "Nouvelle discussion"}</span>
                      <span>·</span>
                      <span className={isUnread ? 'font-semibold text-black' : ''}>{formatTime(c.last_message_date)}</span>
                    </div>
                  </div>
                  {isUnread && <div className="w-3 h-3 bg-[#0084FF] rounded-full shrink-0 mr-2 shadow-sm"></div>}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Nav Messenger (Mobile Only) */}
        <div className="md:hidden flex justify-around items-center border-t border-gray-200 bg-white pb-safe pt-2 px-2 shrink-0">
          <div className="flex flex-col items-center p-2 text-[#0084FF]"><MessageCircle className="w-6 h-6" fill="currentColor" /><span className="text-[10px] font-semibold mt-1">Discussions</span></div>
          <div className="flex flex-col items-center p-2 text-gray-400"><Users className="w-6 h-6" /><span className="text-[10px] font-medium mt-1">Personnes</span></div>
          <div className="flex flex-col items-center p-2 text-gray-400"><Compass className="w-6 h-6" /><span className="text-[10px] font-medium mt-1">Découvrir</span></div>
        </div>
      </div>

      {/* ========================================== */}
      {/* INTERFACE 2 : A L'INTÉRIEUR DU CHAT        */}
      {/* ========================================== */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-white relative`}>
        {selectedConv ? (
          <>
            {/* Header Inside Chat */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-white/95 backdrop-blur-sm shrink-0 z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-[#0084FF] hover:bg-gray-100 h-10 w-10 shrink-0" onClick={() => setSelectedConv(null)}>
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors">
                  <div className="relative">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={selectedConv.shop_logo} />
                      <AvatarFallback className="bg-[#E4E6EB] text-black text-sm">{getInitials(user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31A24C] border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="font-semibold text-[15px] leading-tight">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</p>
                    <p className="text-[12px] text-gray-500 leading-tight">En ligne</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#0084FF] shrink-0">
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full h-10 w-10"><Phone className="w-[22px] h-[22px]" fill="currentColor" /></Button>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full h-10 w-10"><Video className="w-[22px] h-[22px]" fill="currentColor" /></Button>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full h-10 w-10"><Info className="w-[22px] h-[22px]" fill="currentColor" /></Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 bg-white">
              {/* Product Context */}
              {selectedConv?.product_context_id && (
                <div className="flex justify-center my-4">
                  <ProductContextCard productId={selectedConv.product_context_id} />
                </div>
              )}
              
              {/* Profile Intro au début du chat */}
              <div className="flex flex-col items-center justify-center mt-8 mb-10">
                <Avatar className="w-24 h-24 mb-3 shrink-0">
                  <AvatarImage src={selectedConv.shop_logo} />
                  <AvatarFallback className="bg-[#E4E6EB] text-black text-3xl">{getInitials(user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name)}</AvatarFallback>
                </Avatar>
                <h2 className="text-[20px] font-bold">{user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}</h2>
                <p className="text-[14px] text-gray-500 mt-1">Rapido Presto Marketplace</p>
                <p className="text-[13px] text-gray-400 mt-2">Vous êtes connectés sur Rapido Presto</p>
              </div>

              {messages.map((m, index) => {
                const isMe = m.sender_id === user.id;
                const nextMsg = messages[index + 1];
                const isNextSameSender = nextMsg && nextMsg.sender_id === m.sender_id;
                const prevMsg = messages[index - 1];
                const isPrevSameSender = prevMsg && prevMsg.sender_id === m.sender_id;

                // Logique parfaite des coins arrondis
                const borderRadius = isMe 
                  ? `18px ${!isNextSameSender ? '18px' : '4px'} ${!isPrevSameSender ? '18px' : '4px'} 18px`
                  : `${!isNextSameSender ? '18px' : '4px'} 18px 18px ${!isPrevSameSender ? '18px' : '4px'}`;

                return (
                  <div key={m.id} className={`flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'} ${!isNextSameSender ? 'mb-4' : 'mb-[2px]'}`}>
                    {!isMe && (
                      <div className="w-7 shrink-0 flex items-end">
                        {!isNextSameSender && (
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={selectedConv.shop_logo} />
                            <AvatarFallback className="bg-[#E4E6EB] text-[10px] text-black">{getInitials(m.sender_name)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {m.type === 'image' && m.metadata?.imageUrl ? (
                        <div className="rounded-[18px] overflow-hidden border border-gray-100 shadow-sm">
                          <img src={m.metadata.imageUrl} alt="img" className="max-w-[220px] max-h-[300px] object-cover" />
                        </div>
                      ) : null}

                      {m.content && m.content !== 'Photo' && (
                        <div 
                          className={`px-[14px] py-[8px] text-[15px] leading-relaxed break-words max-w-full ${isMe ? 'bg-[#0084FF] text-white' : 'bg-[#E4E6EB] text-[#050505]'}`}
                          style={{ borderRadius }}
                        >
                          {m.content}
                        </div>
                      )}
                      
                      {/* Affichage lu/distribué (simulation) sous le dernier message de la grappe */}
                      {isMe && !isNextSameSender && (
                        <span className="text-[11px] text-gray-400 mt-1 mr-1">{m.is_read ? 'Vu' : 'Distribué'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area Messenger */}
            <div className="p-3 bg-white flex items-end gap-2 shrink-0 border-t border-gray-100 pb-safe">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              
              <div className="flex gap-1 text-[#0084FF] pb-1.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 hidden sm:flex"><PlusCircle className="w-[20px] h-[20px]" fill="currentColor" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 hidden sm:flex"><MessageCircle className="w-[20px] h-[20px]" fill="currentColor" className="text-transparent" style={{stroke: "currentColor", strokeWidth: 2}} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-[20px] h-[20px]" fill="currentColor" className="text-transparent" style={{stroke: "currentColor", strokeWidth: 1.5}} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 hidden sm:flex"><Sticker className="w-[20px] h-[20px]" fill="currentColor" className="text-transparent" style={{stroke: "currentColor", strokeWidth: 1.5}} /></Button>
              </div>

              <div className="flex-1 bg-[#F0F2F5] rounded-full flex items-end min-h-[36px] relative px-3 py-[6px]">
                <textarea 
                  value={messageText} 
                  onChange={e => setMessageText(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if(messageText.trim()) sendMessage.mutate(messageText); } }}
                  placeholder="Aa"
                  className="w-full bg-transparent outline-none text-[15px] resize-none max-h-24 placeholder:text-gray-500 overflow-y-auto"
                  rows="1"
                  style={{ minHeight: '20px' }}
                  disabled={isUploading}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-[#0084FF] hover:bg-transparent absolute right-2 bottom-[6px] shrink-0">
                  <Smile className="w-[20px] h-[20px]" />
                </Button>
              </div>

              <div className="pb-1 shrink-0">
                {messageText.trim() ? (
                  <Button onClick={() => sendMessage.mutate(messageText)} disabled={sendMessage.isPending} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#0084FF] hover:bg-gray-100 transition-transform active:scale-90">
                    <Send className="w-[20px] h-[20px]" fill="currentColor" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#0084FF] hover:bg-gray-100 transition-transform active:scale-90">
                     <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.7c.09 1.15 1.05 1.81 2.45 1.81 1.48 0 2.22-.61 2.22-1.52 0-1.11-.79-1.42-2.31-1.84-1.94-.53-3.41-1.34-3.41-3.26 0-1.81 1.34-3.05 3.28-3.43V4.5h2.67v1.94c1.61.32 2.76 1.43 2.96 3.06h-1.68c-.14-1.01-.98-1.52-2.17-1.52-1.29 0-2.12.56-2.12 1.41 0 1.03.86 1.36 2.43 1.83 2.05.58 3.3 1.4 3.3 3.32 0 1.95-1.42 3.09-3.38 3.55z"/></svg>
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white border-l border-gray-100">
            <h2 className="text-2xl font-bold text-black mb-2">Vos messages</h2>
            <p className="text-gray-500 text-[15px]">Envoyez des photos et des messages privés.</p>
          </div>
        )}
      </div>
    </div>
  );
}