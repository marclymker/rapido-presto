import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, ArrowLeft, Plus } from 'lucide-react';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // 1. Protection Auth au montage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          window.location.href = '/login';
        } else {
          console.log('Utilisateur connecté:', u.id, u.full_name);
          setUser(u);
        }
      } catch (error) {
        console.error('Erreur d\'authentification:', error);
        window.location.href = '/login';
      }
    };
    
    checkAuth();
  }, []);

  // 2. Liste des conversations
  const { 
    data: conversations = [], 
    isLoading: isLoadingConvs,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const response = await base44.functions.invoke('chatService', { 
          action: 'list' 
        });
        
        console.log('Réponse conversations:', response);
        
        // Vérifier la structure de la réponse
        if (response && response.success === true) {
          return response.data || [];
        } else if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          console.error('Format de réponse inattendu:', response);
          return [];
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    retry: 2,
    onSuccess: (data) => {
      console.log('Conversations chargées:', data.length);
    }
  });

  // 3. Messages d'une conversation
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: async () => {
      if (!selectedConv?.id) return [];
      
      try {
        const response = await base44.functions.invoke('chatService', { 
          action: 'messages',
          convId: selectedConv.id
        });
        
        console.log('Réponse messages:', response);
        
        // Vérifier la structure de la réponse
        let messagesData = [];
        if (response && response.success === true) {
          messagesData = response.data || [];
        } else if (response && response.data && Array.isArray(response.data)) {
          messagesData = response.data;
        } else if (Array.isArray(response)) {
          messagesData = response;
        }
        
        // Trier les messages par date (du plus ancien au plus récent)
        return messagesData.sort((a, b) => {
          const timeA = a.timestamp || a.created_at || a.id;
          const timeB = b.timestamp || b.created_at || b.id;
          
          try {
            const dateA = new Date(timeA).getTime();
            const dateB = new Date(timeB).getTime();
            return dateA - dateB;
          } catch {
            return a.id - b.id;
          }
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        return [];
      }
    },
    enabled: !!selectedConv?.id,
    refetchInterval: 5000,
  });

  // 4. Mutation d'envoi de message - CORRIGÉE
  const sendMessage = useMutation({
    mutationFn: async (text) => {
      if (!selectedConv?.id) throw new Error('Aucune conversation sélectionnée');
      
      console.log('Envoi du message:', text, 'à la conversation:', selectedConv.id);
      
      const response = await base44.functions.invoke('chatService', { 
        action: 'send', 
        conversation_id: selectedConv.id, 
        content: text 
      });
      
      console.log('Réponse d\'envoi:', response);
      
      if (!response || response.success === false) {
        throw new Error(response?.error || 'Erreur lors de l\'envoi du message');
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Message envoyé avec succès:', data);
      // Invalider et rafraîchir les messages
      queryClient.invalidateQueries(['messages', selectedConv?.id]);
      // Rafraîchir la liste des conversations pour mettre à jour le dernier message
      queryClient.invalidateQueries(['conversations', user?.id]);
      setMessageText('');
    },
    onError: (error) => {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(`Erreur: ${error.message}`);
    }
  });

  // 5. Mutation pour démarrer une nouvelle conversation
  const startNewChat = useMutation({
    mutationFn: async ({ vendorId, shopId, shopName, initialMessage }) => {
      const response = await base44.functions.invoke('chatService', {
        action: 'init',
        vendor_id: vendorId,
        shop_id: shopId,
        shop_name: shopName,
        initial_message: initialMessage || 'Bonjour, je souhaite discuter avec vous.'
      });
      
      console.log('Réponse init:', response);
      
      if (!response || response.success === false) {
        throw new Error(response?.error || 'Erreur lors de la création de la conversation');
      }
      
      return response.conversation;
    },
    onSuccess: (newConversation) => {
      setSelectedConv(newConversation);
      setShowNewChatModal(false);
      // Rafraîchir la liste des conversations
      refetchConversations();
      // Mettre à jour l'URL
      window.history.pushState({}, '', `/chat?id=${newConversation.id}`);
    },
    onError: (error) => {
      console.error('Erreur lors de la création de la conversation:', error);
      alert('Erreur lors de la création de la conversation: ' + error.message);
    }
  });

  // 6. Scroll automatique vers le dernier message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 100);
    }
  }, [messages]);

  // 7. Gestionnaire pour la touche Entrée
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageText.trim() && !sendMessage.isPending) {
        sendMessage.mutate(messageText);
      }
    }
  };

  // 8. Fonction pour démarrer une nouvelle conversation de test
  const handleStartTestChat = () => {
    // Pour tester, utilisez un vrai ID de vendeur et boutique
    // Vous pouvez les obtenir depuis votre base de données
    startNewChat.mutate({
      vendorId: 'vendeur_id_exemple', // À remplacer
      shopId: 'boutique_id_exemple', // À remplacer
      shopName: 'Boutique Test',
      initialMessage: 'Bonjour, je souhaite vous poser une question.'
    });
  };

  // Rendu de chargement
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
        <div className="p-4 border-b font-bold flex gap-2 items-center bg-white justify-between">
          <div className="flex gap-2 items-center">
            <MessageSquare className="text-orange-500" /> 
            <span className="truncate">Vos messages</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowNewChatModal(true)}
            className="h-8 text-xs"
          >
            <Plus size={14} /> Nouveau
          </Button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoadingConvs ? (
            <div className="p-4 text-center">
              <Loader2 className="animate-spin mx-auto text-slate-300" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
              <p className="mb-2">Aucune discussion trouvée.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStartTestChat}
                className="mt-2"
                disabled={startNewChat.isPending}
              >
                {startNewChat.isPending ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                Démarrer une discussion test
              </Button>
            </div>
          ) : (
            conversations.map(conversation => (
              <div 
                key={conversation.id} 
                onClick={() => {
                  setSelectedConv(conversation);
                  window.history.pushState({}, '', `/chat?id=${conversation.id}`);
                }}
                className={`p-4 border-b cursor-pointer transition-all duration-200 ${
                  selectedConv?.id === conversation.id 
                    ? 'bg-orange-50 border-r-4 border-r-orange-500' 
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {conversation.shop_logo ? (
                    <img 
                      src={conversation.shop_logo} 
                      alt="Logo boutique" 
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <MessageSquare size={20} className="text-orange-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {user.id === conversation.vendor_id 
                        ? conversation.customer_name 
                        : conversation.shop_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {conversation.last_message || "Nouvelle discussion"}
                    </p>
                    {conversation.last_message_date && (
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(conversation.last_message_date).toLocaleDateString()}
                      </p>
                    )}
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
                {selectedConv.shop_logo ? (
                  <img 
                    src={selectedConv.shop_logo} 
                    alt="Logo boutique" 
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <MessageSquare size={20} className="text-orange-400" />
                  </div>
                )}
                <div>
                  <div className="font-bold">
                    {user.id === selectedConv.vendor_id 
                      ? selectedConv.customer_name 
                      : selectedConv.shop_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedConv.product_context_id ? 'Discussion sur un produit' : 'Discussion générale'}
                  </div>
                </div>
              </div>
            </div>

            {/* Zone des messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
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
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[70%]">
                        <div className={`p-3 rounded-2xl ${message.sender_id === user.id 
                          ? 'bg-orange-500 text-white rounded-br-none' 
                          : 'bg-white text-slate-800 border rounded-bl-none'}`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <div className={`text-xs text-slate-400 mt-1 px-2 ${
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
                    <Send size={18} />
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

      {/* Modal pour nouvelle conversation */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Nouvelle conversation</h3>
            <p className="text-slate-600 mb-4">
              Pour démarrer une nouvelle conversation, vous devez spécifier le vendeur et la boutique.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID du vendeur</label>
                <Input placeholder="vendeur_id" id="vendorId" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID de la boutique</label>
                <Input placeholder="shop_id" id="shopId" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom de la boutique</label>
                <Input placeholder="Nom de la boutique" id="shopName" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message initial</label>
                <Input placeholder="Votre message..." id="initialMessage" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowNewChatModal(false)}
              >
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  const vendorId = document.getElementById('vendorId').value;
                  const shopId = document.getElementById('shopId').value;
                  const shopName = document.getElementById('shopName').value;
                  const initialMessage = document.getElementById('initialMessage').value;
                  
                  if (!vendorId || !shopId || !shopName) {
                    alert('Veuillez remplir tous les champs obligatoires');
                    return;
                  }
                  
                  startNewChat.mutate({
                    vendorId,
                    shopId,
                    shopName,
                    initialMessage
                  });
                }}
                className="bg-orange-500 hover:bg-orange-600"
                disabled={startNewChat.isPending}
              >
                {startNewChat.isPending ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : null}
                Démarrer la conversation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}