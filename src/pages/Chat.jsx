import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const messagesContainerRef = useRef(null);
  const queryClient = useQueryClient();

  // 1. Protection Auth au montage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          window.location.href = '/login';
        } else {
          setUser(u);
        }
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login';
      }
    };
    
    checkAuth();
  }, []);

  // Extraction sécurisée de l'ID de l'URL
  const getUrlId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('id');
  }, []);

  // 2. Liste des conversations
  const { 
    data: conversations = [], 
    isLoading: isLoadingConvs 
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('chatService', { 
          action: 'list' 
        });
        // S'assurer que nous retournons toujours un tableau
        return Array.isArray(response?.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Rafraîchir toutes les 15 secondes
    retry: 2
  });

  // 3. Messages avec tri de secours côté front
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      if (!selectedConv?.id) return [];
      
      try {
        const response = await base44.functions.invoke('chatService', { 
          action: 'messages', 
          convId: selectedConv.id 
        });
        
        let messages = Array.isArray(response?.data) ? response.data : [];
        
        // Tri de secours côté client (par timestamp ou created_at)
        messages.sort((a, b) => {
          const timeA = a.timestamp || a.created_at || a.id;
          const timeB = b.timestamp || b.created_at || b.id;
          
          try {
            const dateA = new Date(timeA).getTime();
            const dateB = new Date(timeB).getTime();
            return dateA - dateB; // Ascendant: ancien -> récent
          } catch {
            return a.id - b.id; // Fallback sur ID
          }
        });
        
        return messages;
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  });

  // 4. Mutation d'envoi
  const sendMessage = useMutation({
    mutationFn: async (text) => {
      if (!selectedConv?.id) throw new Error('No conversation selected');
      
      return await base44.functions.invoke('chatService', { 
        action: 'send', 
        conversation_id: selectedConv.id, 
        content: text 
      });
    },
    onSuccess: () => {
      // Invalider et rafraîchir les messages
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      // Rafraîchir aussi la liste des conversations pour mettre à jour le dernier message
      queryClient.invalidateQueries(['conversations', user?.id]);
      setMessageText('');
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    }
  });

  // 5. Synchronisation URL -> Sélection
  useEffect(() => {
    const convIdFromUrl = getUrlId();
    if (convIdFromUrl && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
      if (found && selectedConv?.id !== found.id) {
        setSelectedConv(found);
      }
    }
  }, [getUrlId, conversations, selectedConv?.id]);

  // 6. Scroll automatique vers le dernier message
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      const scrollToBottom = () => {
        messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      };
      
      // Petit délai pour s'assurer que le DOM est mis à jour
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  // Gestionnaire pour la touche Entrée
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageText.trim() && !sendMessage.isPending) {
        sendMessage.mutate(messageText);
      }
    }
  };

  // 7. Mise à jour de l'URL lors de la sélection
  const handleSelectConversation = (conversation) => {
    setSelectedConv(conversation);
    // Mettre à jour l'URL sans recharger la page
    window.history.pushState({}, '', `/chat?id=${conversation.id}`);
  };

  // Rendu de chargement (Évite la page blanche pendant l'auth)
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin text-orange-500 mb-2" />
        <p>Vérification de votre session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar : Liste des discussions */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-slate-50`}>
        <div className="p-4 border-b font-bold flex gap-2 items-center bg-white">
          <MessageSquare className="text-orange-500" /> 
          <span className="truncate">Vos messages</span>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoadingConvs ? (
            <div className="p-4 text-center">
              <Loader2 className="animate-spin mx-auto text-slate-300" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Aucune discussion trouvée.
            </div>
          ) : (
            conversations.map(conversation => (
              <div 
                key={conversation.id} 
                onClick={() => handleSelectConversation(conversation)}
                className={`p-4 border-b cursor-pointer transition-all duration-200 ${
                  selectedConv?.id === conversation.id 
                    ? 'bg-orange-50 border-r-4 border-r-orange-500' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {conversation.shop_logo && (
                    <img 
                      src={conversation.shop_logo} 
                      alt="Logo boutique" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {user.id === conversation.vendor_id 
                        ? conversation.customer_name 
                        : conversation.shop_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {conversation.last_message || "Démarrer la discussion"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 text-xs text-slate-400 border-t bg-white text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Zone de Chat */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConv ? (
          <>
            {/* En-tête de la conversation */}
            <div className="p-4 border-b flex items-center gap-3 bg-white shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={() => setSelectedConv(null)}
              >
                <ArrowLeft />
              </Button>
              
              <div className="flex items-center gap-3">
                {selectedConv.shop_logo && (
                  <img 
                    src={selectedConv.shop_logo} 
                    alt="Logo boutique" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div className="font-bold truncate">
                  {user.id === selectedConv.vendor_id 
                    ? selectedConv.customer_name 
                    : selectedConv.shop_name}
                </div>
              </div>
            </div>

            {/* Zone des messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white"
            >
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="animate-spin text-slate-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare size={48} className="mb-3 opacity-30" />
                  <p>Aucun message pour le moment</p>
                  <p className="text-sm">Envoyez le premier message !</p>
                </div>
              ) : (
                <>
                  {/* Message d'information */}
                  <div className="text-center text-xs text-slate-400 py-2">
                    Conversation avec {user.id === selectedConv.vendor_id 
                      ? selectedConv.customer_name 
                      : selectedConv.shop_name}
                  </div>
                  
                  {/* Liste des messages */}
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[75%]">
                        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.sender_id === user.id 
                            ? 'bg-orange-500 text-white rounded-br-none' 
                            : 'bg-white text-slate-800 border rounded-bl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <div className={`text-xs text-slate-400 mt-1 px-1 ${
                          message.sender_id === user.id ? 'text-right' : 'text-left'
                        }`}>
                          {message.timestamp || message.created_at
                            ? new Date(message.timestamp || message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <Input 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez votre message..."
                  className="flex-1"
                  disabled={sendMessage.isPending}
                />
                <Button 
                  onClick={() => messageText.trim() && sendMessage.mutate(messageText)}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="bg-orange-500 hover:bg-orange-600 min-w-[80px]"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Send size={16} />
                      <span className="hidden sm:inline">Envoyer</span>
                    </div>
                  )}
                </Button>
              </div>
              <div className="text-xs text-slate-400 mt-2 text-center">
                Appuyez sur Entrée pour envoyer
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <MessageSquare size={80} className="opacity-10 mb-4" />
            <p className="text-slate-400 mb-1">Sélectionnez une conversation</p>
            <p className="text-sm text-slate-300">
              Ou commencez une nouvelle discussion
            </p>
          </div>
        )}
      </div>
    </div>
  );
}