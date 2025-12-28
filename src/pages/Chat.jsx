import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader2, Send, MessageSquare, ArrowLeft, Search, 
  User, Store, Clock, Check, CheckCheck, Image as ImageIcon,
  Paperclip, Smile, MoreVertical, Phone, Video, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const queryClient = useQueryClient();

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gestion de l'utilisateur
  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (!u) {
          toast.error('Session expirée');
          window.location.href = '/login';
        } else {
          setUser(u);
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  // Extraction de l'ID depuis l'URL
  const getUrlId = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('conv');
  }, []);

  // Mise à jour de l'URL
  const updateUrl = useCallback((convId) => {
    const url = new URL(window.location);
    if (convId) {
      url.searchParams.set('conv', convId);
    } else {
      url.searchParams.delete('conv');
    }
    window.history.pushState({}, '', url);
  }, []);

  // Liste des conversations avec recherche
  const { 
    data: conversationsData, 
    isLoading: isLoadingConvs,
    error: convsError 
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      try {
        const r = await base44.functions.invoke('chatService', { action: 'list' });
        return r.data || { data: [] };
      } catch (error) {
        toast.error('Erreur de chargement des conversations');
        throw error;
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // 30 secondes
    retry: 2
  });

  const conversations = conversationsData?.data || [];
  const userRole = conversationsData?.user_role || 'customer';

  // Messages de la conversation sélectionnée
  const { 
    data: messagesData, 
    isLoading: isLoadingMsgs,
    error: msgsError 
  } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      if (!selectedConv) return { data: [], has_more: false };
      
      try {
        const r = await base44.functions.invoke('chatService', { 
          action: 'messages', 
          conversation_id: selectedConv.id 
        });
        return r.data || { data: [], has_more: false };
      } catch (error) {
        toast.error('Erreur de chargement des messages');
        throw error;
      }
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 10000, // 10 secondes pour les messages actifs
  });

  const messages = messagesData?.data || [];
  const hasMoreMessages = messagesData?.has_more || false;

  // Mutation pour envoyer un message
  const sendMessage = useMutation({
    mutationFn: async (content) => {
      const r = await base44.functions.invoke('chatService', { 
        action: 'send', 
        conversation_id: selectedConv.id, 
        content 
      });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      queryClient.invalidateQueries(['conversations', user?.id]);
      setMessageText('');
    },
    onError: (error) => {
      toast.error('Échec de l\'envoi du message');
      console.error('Erreur envoi:', error);
    }
  });

  // Marquer comme lu
  const markAsRead = useMutation({
    mutationFn: async (convId) => {
      await base44.functions.invoke('chatService', {
        action: 'mark_read',
        conversation_id: convId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations', user?.id]);
    }
  });

  // Sélection de conversation
  const handleSelectConv = useCallback((conv) => {
    setSelectedConv(conv);
    updateUrl(conv.id);
    
    if (conv.unread_count > 0 && userRole === 'vendor') {
      markAsRead.mutate(conv.id);
    }
    
    if (isMobile) {
      // Cacher la liste sur mobile
      document.querySelector('.conversations-list')?.classList.add('hidden');
    }
  }, [isMobile, userRole, markAsRead, updateUrl]);

  // Retour à la liste (mobile)
  const handleBackToList = useCallback(() => {
    setSelectedConv(null);
    updateUrl(null);
    document.querySelector('.conversations-list')?.classList.remove('hidden');
  }, [updateUrl]);

  // Synchronisation URL -> Sélection
  useEffect(() => {
    const convIdFromUrl = getUrlId();
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found && selectedConv?.id !== found.id) {
        handleSelectConv(found);
      }
    }
  }, [getUrlId, conversations, selectedConv, handleSelectConv]);

  // Scroll auto vers le bas
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Filtrage des conversations
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const otherParty = userRole === 'customer' ? conv.shop_name : conv.customer_name;
    return otherParty?.toLowerCase().includes(searchLower) || 
           conv.last_message?.toLowerCase().includes(searchLower);
  });

  // Formatage de la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (diffHours < 48) {
      return 'Hier';
    } else {
      return format(date, 'dd/MM', { locale: fr });
    }
  };

  // Rendu de chargement
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-primary" />
          <p className="text-slate-600">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Liste des conversations - toujours visible sur desktop, conditionnel sur mobile */}
      <div className={`conversations-list flex flex-col w-full md:w-96 border-r bg-white ${selectedConv && isMobile ? 'hidden' : 'flex'}`}>
        {/* En-tête */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
            <Button size="icon" variant="ghost" className="md:hidden" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConvs ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : convsError ? (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>Erreur de chargement</p>
              <Button variant="outline" size="sm" className="mt-3">
                Réessayer
              </Button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-200" />
              <p className="text-slate-500 mb-2">Aucune conversation</p>
              <p className="text-sm text-slate-400">Commencez une nouvelle discussion</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = selectedConv?.id === conv.id;
              const otherParty = userRole === 'customer' ? conv.shop_name : conv.customer_name;
              const unreadCount = conv.unread_count || 0;
              const isUnread = unreadCount > 0 && userRole === 'vendor';
              
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`p-4 border-b cursor-pointer transition-all duration-200 hover:bg-slate-50 active:bg-slate-100 ${
                    isActive ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow">
                      <AvatarImage 
                        src={userRole === 'customer' ? conv.shop_logo : conv.customer_avatar} 
                        alt={otherParty}
                      />
                      <AvatarFallback className="bg-slate-100 text-slate-600">
                        {userRole === 'customer' ? <Store className="h-6 w-6" /> : <User className="h-6 w-6" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold truncate ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                          {otherParty || 'Anonyme'}
                        </span>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(conv.last_message_date)}
                        </span>
                      </div>
                      
                      <p className={`text-sm truncate ${isUnread ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                        {conv.last_message || 'Nouvelle conversation'}
                      </p>
                    </div>
                    
                    {isUnread && (
                      <Badge className="ml-2 bg-primary hover:bg-primary">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* User info */}
        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{user.full_name || 'Utilisateur'}</p>
              <p className="text-xs text-slate-500 capitalize">{userRole}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de chat */}
      <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
        {selectedConv ? (
          <>
            {/* En-tête de conversation */}
            <div className="p-4 border-b bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={userRole === 'customer' ? selectedConv.shop_logo : selectedConv.customer_avatar} 
                    />
                    <AvatarFallback className="bg-slate-100">
                      {userRole === 'customer' ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="font-semibold text-slate-800">
                      {userRole === 'customer' ? selectedConv.shop_name : selectedConv.customer_name}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      En ligne
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Info className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/50 p-4 md:p-6"
            >
              {isLoadingMsgs ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="animate-spin h-8 w-8 text-primary mb-3" />
                  <p className="text-slate-500">Chargement des messages...</p>
                </div>
              ) : msgsError ? (
                <div className="text-center p-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">Erreur de chargement des messages</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="p-8 rounded-full bg-slate-100 mb-4">
                    <MessageSquare className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Commencez la conversation
                  </h3>
                  <p className="text-slate-500 text-center max-w-md">
                    Envoyez votre premier message à {userRole === 'customer' ? selectedConv.shop_name : selectedConv.customer_name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isMine = msg.sender_id === user.id;
                    const prevMsg = messages[index - 1];
                    const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                    const showTime = !prevMsg || 
                      new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 300000; // 5 minutes
                    
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] md:max-w-[75%] ${isMine ? 'flex-row-reverse' : ''}`}>
                          {showAvatar && !isMine && (
                            <Avatar className="h-8 w-8 mt-1 mr-2">
                              <AvatarImage src={msg.sender_avatar} />
                              <AvatarFallback className="text-xs">
                                {msg.sender_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className={`flex flex-col ${isMine ? 'items-end' : ''}`}>
                            {showAvatar && !isMine && (
                              <span className="text-xs font-medium text-slate-600 mb-1 ml-1">
                                {msg.sender_name}
                              </span>
                            )}
                            
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isMine
                                  ? 'bg-primary text-white rounded-br-none'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            
                            {showTime && (
                              <div className={`flex items-center gap-1 mt-1 text-xs ${isMine ? 'justify-end' : ''}`}>
                                <span className="text-slate-400">
                                  {format(new Date(msg.timestamp), 'HH:mm', { locale: fr })}
                                </span>
                                {isMine && (
                                  <span className="text-slate-400">
                                    {msg.is_read ? (
                                      <CheckCheck className="h-3 w-3 text-primary" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input d'envoi */}
            <div className="border-t bg-white p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-500">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-500">
                  <ImageIcon className="h-5 w-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                        e.preventDefault();
                        sendMessage.mutate(messageText);
                      }
                    }}
                    placeholder={`Écrivez à ${userRole === 'customer' ? selectedConv.shop_name : selectedConv.customer_name}...`}
                    className="pr-12 resize-none min-h-[44px]"
                    disabled={sendMessage.isPending}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>
                
                <Button
                  onClick={() => messageText.trim() && sendMessage.mutate(messageText)}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  size="icon"
                  className="h-11 w-11 bg-primary hover:bg-primary/90 shadow"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-slate-400 text-center mt-2">
                Appuyez sur Entrée pour envoyer, Shift + Entrée pour un saut de ligne
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-md text-center">
              <div className="p-6 rounded-full bg-white shadow-lg inline-block mb-6">
                <MessageSquare className="h-16 w-16 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">
                Bienvenue dans la messagerie
              </h2>
              <p className="text-slate-600 mb-8">
                Sélectionnez une conversation pour commencer à discuter, ou démarrez-en une nouvelle depuis une boutique.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <Store className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <p className="font-medium text-sm">Acheter</p>
                  <p className="text-xs text-slate-500">Discutez avec les vendeurs</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <User className="h-8 w-8 text-primary mb-2 mx-auto" />
                  <p className="font-medium text-sm">Vendre</p>
                  <p className="text-xs text-slate-500">Répondez aux clients</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}