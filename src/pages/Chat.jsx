import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Image as ImageIcon, Package, Store } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const convId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'list' }).then(r => r.data),
    enabled: !!user,
    refetchInterval: 5000
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv?.id],
    queryFn: () => base44.functions.invoke('chatService', { action: 'messages', convId: selectedConv.id }).then(r => r.data),
    enabled: !!selectedConv,
    refetchInterval: 3000
  });

  // Fetch vendor products (for product sharing)
  const { data: vendorProducts = [] } = useQuery({
    queryKey: ['vendor-products', user?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: selectedConv?.shop_id }),
    enabled: !!selectedConv && selectedConv.vendor_id === user?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type, metadata }) => {
      const response = await base44.functions.invoke('chatService', {
        conversation_id: selectedConv.id,
        content,
        type,
        metadata
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['conversations']);
      setMessageText('');
      setShowProductPicker(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (convId) => {
      await base44.functions.invoke('chatService', { conversation_id: convId }, 'PUT');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']);
      queryClient.invalidateQueries(['unread-count']);
    }
  });

  useEffect(() => {
    if (convId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === convId);
      if (conv) {
        setSelectedConv(conv);
        markAsReadMutation.mutate(convId);
      }
    }
  }, [convId, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText, type: 'text' });
  };

  const handleShareProduct = (product) => {
    sendMessageMutation.mutate({
      content: `Article: ${product.name}`,
      type: 'product',
      metadata: {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_image: product.image_url
      }
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Upload en cours...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMessageMutation.mutate({
        content: 'Photo envoyée',
        type: 'image',
        metadata: { url: file_url }
      });
      toast.dismiss();
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const isVendor = selectedConv && selectedConv.vendor_id === user.id;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Liste des conversations */}
      <div className={`${selectedConv ? 'hidden md:block' : 'block'} w-full md:w-96 bg-white border-r`}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-slate-800">💬 Messagerie</h1>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isUnread = messages.some(m => 
                m.conversation_id === conv.id && 
                m.sender_id !== user.id && 
                !m.is_read
              );
              
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConv(conv);
                    markAsReadMutation.mutate(conv.id);
                    window.history.pushState({}, '', `${createPageUrl('Chat')}?id=${conv.id}`);
                  }}
                  className={`w-full p-4 border-b hover:bg-slate-50 text-left transition ${
                    selectedConv?.id === conv.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {conv.shop_logo ? (
                      <img src={conv.shop_logo} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <Store className="w-6 h-6 text-orange-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">
                          {conv.vendor_id === user.id ? conv.customer_name : conv.shop_name}
                        </p>
                        {isUnread && (
                          <Badge className="bg-orange-500 text-white">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                      {conv.last_message_date && (
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(conv.last_message_date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat View */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConv(null)}
              className="md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {selectedConv.shop_logo ? (
              <img src={selectedConv.shop_logo} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-orange-600" />
              </div>
            )}
            <div>
              <p className="font-bold text-slate-800">
                {isVendor ? selectedConv.customer_name : selectedConv.shop_name}
              </p>
              <p className="text-xs text-slate-500">
                {isVendor ? 'Client' : 'Boutique'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => {
              const isMine = msg.sender_id === user.id;
              
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMine ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800'} rounded-2xl p-3`}>
                    {msg.type === 'text' && <p>{msg.content}</p>}
                    
                    {msg.type === 'image' && (
                      <img 
                        src={msg.metadata.url} 
                        className="rounded-lg max-w-full" 
                        alt="Image partagée"
                      />
                    )}
                    
                    {msg.type === 'product' && (
                      <Card className="p-3 bg-white">
                        <div className="flex gap-3">
                          <img 
                            src={msg.metadata.product_image} 
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-sm">
                              {msg.metadata.product_name}
                            </p>
                            <p className="text-orange-600 font-bold text-sm">
                              {msg.metadata.product_price} HTG
                            </p>
                            <a 
                              href={`${createPageUrl('Product')}?id=${msg.metadata.product_id}`}
                              className="text-xs text-blue-600 underline"
                            >
                              Voir l'article
                            </a>
                          </div>
                        </div>
                      </Card>
                    )}
                    
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Product Picker for Vendors */}
          {showProductPicker && isVendor && (
            <div className="border-t p-4 bg-slate-50 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-slate-800">Partager un article</p>
                <Button variant="ghost" size="sm" onClick={() => setShowProductPicker(false)}>
                  Fermer
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {vendorProducts.map(product => (
                  <Card 
                    key={product.id} 
                    className="p-3 cursor-pointer hover:shadow-md transition"
                    onClick={() => handleShareProduct(product)}
                  >
                    <img 
                      src={product.image_url} 
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                    <p className="font-bold text-sm text-slate-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-orange-600 font-bold text-sm">
                      {product.price} HTG
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center gap-2">
              {!isVendor && (
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <ImageIcon className="w-5 h-5 text-slate-500" />
                  </div>
                </label>
              )}

              {isVendor && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowProductPicker(!showProductPicker)}
                >
                  <Package className="w-5 h-5 text-orange-500" />
                </Button>
              )}

              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Écrivez votre message..."
                className="flex-1"
              />

              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Sélectionnez une conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}