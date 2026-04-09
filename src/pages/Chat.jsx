import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Loader2, Send, ArrowLeft, Image as ImageIcon, Phone, Video, Info, PlusCircle, Edit, Search, Menu, MessageCircle, Users, Compass, ShoppingBag, X } from 'lucide-react';
import ProductContextCard from '@/components/chat/ProductContextCard';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { applyClientMargin } from '@/components/utils/priceCalculation';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const convIdFromUrl = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id')
    : null;

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        if (!u) base44.auth.redirectToLogin('/Chat');
        else setUser(u);
      })
      .catch(() => base44.auth.redirectToLogin('/Chat'));
  }, []);

  // Fetch conversations list
  const { data: conversations = [], isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

  // Fetch direct conversation by ID if not in list yet
  const { data: directConv } = useQuery({
    queryKey: ['conversation-direct', convIdFromUrl],
    queryFn: () => base44.entities.Conversation.get(convIdFromUrl),
    enabled: !!convIdFromUrl && !!user?.id,
    staleTime: 0,
  });

  // Auto-select conversation from URL
  useEffect(() => {
    if (!convIdFromUrl || selectedConv?.id === convIdFromUrl) return;
    const found = conversations.find(c => String(c.id) === String(convIdFromUrl));
    if (found) setSelectedConv(found);
    else if (directConv) setSelectedConv(directConv);
  }, [convIdFromUrl, conversations, directConv]);

  // Fetch messages for selected conv
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

  // Send text message
  const sendMessage = useMutation({
    mutationFn: (text) => base44.functions.invoke('chatService', {
      action: 'send', conversation_id: selectedConv.id, content: text, type: 'text'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setMessageText('');
    },
    onError: () => toast.error("Erreur d'envoi")
  });

  // Send product card
  const sendProductCard = useMutation({
    mutationFn: (product) => base44.functions.invoke('chatService', {
      action: 'send',
      conversation_id: selectedConv.id,
      content: `🛍️ ${product.name} — ${applyClientMargin(product.promo_price || product.price).toLocaleString()} HTG`,
      type: 'product',
      metadata: {
        productId: product.id,
        productName: product.name,
        productImage: product.image_url,
        productPrice: applyClientMargin(product.promo_price || product.price),
        productSlug: product.slug
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      setShowProductPicker(false);
      toast.success('Carte produit envoyée');
    },
    onError: () => toast.error("Erreur d'envoi")
  });

  // Image upload via UploadFile integration
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error("Format invalide");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image trop lourde (max 10MB)");

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('chatService', {
        action: 'send',
        conversation_id: selectedConv.id,
        content: 'Photo',
        type: 'image',
        metadata: { imageUrl: file_url }
      });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv?.id] });
      toast.success('Photo envoyée');
    } catch (error) {
      toast.error("Échec de l'upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load vendor products for product picker
  const handleOpenProductPicker = async () => {
    if (!selectedConv) return;
    setShowProductPicker(true);
    if (vendorProducts.length === 0) {
      const r = await base44.functions.invoke('chatService', { action: 'vendor_products', convId: selectedConv.id });
      const prods = Array.isArray(r.data) ? r.data : (r.data?.data || []);
      setVendorProducts(prods);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isVendor = user && selectedConv && user.id === selectedConv.vendor_id;

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

      {/* ===== LISTE DES CONVERSATIONS ===== */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] lg:w-[400px] flex-col h-full border-r border-gray-200 bg-white shrink-0`}>
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

        <div className="overflow-y-auto flex-1 px-2 pt-2">
          {isLoadingConvs ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#0084FF]" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center mt-16 px-6">
              <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-[15px]">Aucun message</p>
              <p className="text-gray-300 text-sm mt-1">Vos conversations apparaîtront ici</p>
            </div>
          ) : (
            conversations.map(c => {
              const contactName = user.id === c.vendor_id ? c.customer_name : c.shop_name;
              const isActive = selectedConv?.id === c.id;
              const isUnread = (c.unread_count || 0) > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedConv(c); window.history.pushState({}, '', `/Chat?id=${c.id}`); }}
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
                  {isUnread && <div className="w-3 h-3 bg-[#0084FF] rounded-full shrink-0 mr-2 shadow-sm" />}
                </div>
              );
            })
          )}
        </div>

        <div className="md:hidden flex justify-around items-center border-t border-gray-200 bg-white pb-safe pt-2 px-2 shrink-0">
          <div className="flex flex-col items-center p-2 text-[#0084FF]"><MessageCircle className="w-6 h-6" fill="currentColor" /><span className="text-[10px] font-semibold mt-1">Discussions</span></div>
          <div className="flex flex-col items-center p-2 text-gray-400"><Users className="w-6 h-6" /><span className="text-[10px] font-medium mt-1">Personnes</span></div>
          <div className="flex flex-col items-center p-2 text-gray-400"><Compass className="w-6 h-6" /><span className="text-[10px] font-medium mt-1">Découvrir</span></div>
        </div>
      </div>

      {/* ===== ZONE DE CHAT ===== */}
      <div className={`${!selectedConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-white relative`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-white/95 backdrop-blur-sm shrink-0 z-10 shadow-sm">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-[#0084FF] hover:bg-gray-100 h-10 w-10 shrink-0"
                  onClick={() => { setSelectedConv(null); window.history.pushState({}, '', '/Chat'); }}>
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-2 p-1 rounded-lg">
                  <div className="relative">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={selectedConv.shop_logo} />
                      <AvatarFallback className="bg-[#E4E6EB] text-black text-sm">
                        {getInitials(user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31A24C] border-2 border-white rounded-full" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-semibold text-[15px] leading-tight">
                      {user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}
                    </p>
                    <p className="text-[12px] text-gray-500 leading-tight">En ligne · Support IA disponible 24/7</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#0084FF] shrink-0">
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full h-10 w-10"><Phone className="w-[22px] h-[22px]" /></Button>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full h-10 w-10"><Video className="w-[22px] h-[22px]" /></Button>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full h-10 w-10"><Info className="w-[22px] h-[22px]" /></Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 bg-white">
              {selectedConv?.product_context_id && (
                <div className="flex justify-center my-4">
                  <ProductContextCard productId={selectedConv.product_context_id} />
                </div>
              )}

              <div className="flex flex-col items-center justify-center mt-4 mb-8">
                <Avatar className="w-20 h-20 mb-3 shrink-0">
                  <AvatarImage src={selectedConv.shop_logo} />
                  <AvatarFallback className="bg-[#E4E6EB] text-black text-3xl">
                    {getInitials(user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-[18px] font-bold">
                  {user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}
                </h2>
                <p className="text-[13px] text-gray-400 mt-1">Rapido Presto Marketplace</p>
              </div>

              {messages.map((m, index) => {
                const isMe = m.sender_id === user.id;
                const nextMsg = messages[index + 1];
                const prevMsg = messages[index - 1];
                const isNextSameSender = nextMsg && nextMsg.sender_id === m.sender_id;
                const isPrevSameSender = prevMsg && prevMsg.sender_id === m.sender_id;
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
                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Nom IA */}
                      {!isMe && m.sender_name?.includes('(IA)') && !isPrevSameSender && (
                        <p className="text-[10px] text-gray-400 mb-1 ml-1">🤖 Support IA</p>
                      )}

                      {/* Message image */}
                      {m.type === 'image' && m.metadata?.imageUrl && (
                        <div className="rounded-[18px] overflow-hidden border border-gray-100 shadow-sm mb-1">
                          <img src={m.metadata.imageUrl} alt="img" className="max-w-[220px] max-h-[300px] object-cover" />
                        </div>
                      )}

                      {/* Carte produit */}
                      {m.type === 'product' && m.metadata?.productId && (
                        <div
                          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-1 max-w-[260px]"
                          onClick={() => window.open(`/product/${m.metadata.productSlug || m.metadata.productId}`, '_blank')}
                        >
                          {m.metadata.productImage && (
                            <img src={m.metadata.productImage} alt={m.metadata.productName} className="w-full h-32 object-cover" />
                          )}
                          <div className="p-3">
                            <p className="font-semibold text-sm text-gray-800 truncate">{m.metadata.productName}</p>
                            <p className="font-bold text-[#0084FF] text-sm mt-0.5">{(m.metadata.productPrice || 0).toLocaleString()} HTG</p>
                            <p className="text-[10px] text-gray-400 mt-1">Appuyer pour voir le produit →</p>
                          </div>
                        </div>
                      )}

                      {/* Texte */}
                      {m.content && m.content !== 'Photo' && m.type !== 'product' && (
                        <div
                          className={`px-[14px] py-[8px] text-[15px] leading-relaxed break-words max-w-full ${isMe ? 'bg-[#0084FF] text-white' : 'bg-[#E4E6EB] text-[#050505]'}`}
                          style={{ borderRadius }}
                        >
                          {m.content}
                        </div>
                      )}

                      {isMe && !isNextSameSender && (
                        <span className="text-[11px] text-gray-400 mt-1 mr-1">{m.is_read ? 'Vu' : 'Envoyé'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Sélecteur de produit (vendeur) */}
            {showProductPicker && (
              <div className="absolute bottom-[80px] left-0 right-0 bg-white border-t border-gray-200 shadow-xl max-h-[50vh] overflow-y-auto z-20">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="font-semibold text-[15px]">Choisir un produit</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowProductPicker(false)}><X className="w-5 h-5" /></Button>
                </div>
                {vendorProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" />Chargement...</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {vendorProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => sendProductCard.mutate(p)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left"
                      >
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-sm font-bold text-[#0084FF]">{applyClientMargin(p.promo_price || p.price).toLocaleString()} HTG</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Zone de saisie */}
            <div className="p-3 bg-white flex items-end gap-2 shrink-0 border-t border-gray-100">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

              <div className="flex gap-1 text-[#0084FF] pb-1.5 shrink-0">
                <Button
                  variant="ghost" size="icon"
                  className="h-9 w-9 rounded-full hover:bg-gray-100"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Envoyer une photo"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </Button>
                {isVendor && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9 rounded-full hover:bg-gray-100"
                    onClick={handleOpenProductPicker}
                    title="Partager un produit"
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </Button>
                )}
              </div>

              <div className="flex-1 bg-[#F0F2F5] rounded-2xl flex items-end min-h-[40px] relative px-3 py-2">
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageText.trim()) sendMessage.mutate(messageText.trim());
                    }
                  }}
                  placeholder="Aa"
                  className="w-full bg-transparent outline-none text-[15px] resize-none max-h-24 placeholder:text-gray-500 overflow-y-auto"
                  rows="1"
                  style={{ minHeight: '20px' }}
                  disabled={isUploading}
                />
              </div>

              <div className="pb-1 shrink-0">
                <Button
                  onClick={() => { if (messageText.trim()) sendMessage.mutate(messageText.trim()); }}
                  disabled={sendMessage.isPending || !messageText.trim()}
                  variant="ghost" size="icon"
                  className="h-9 w-9 rounded-full text-[#0084FF] hover:bg-gray-100 transition-transform active:scale-90 disabled:opacity-30"
                >
                  <Send className="w-5 h-5" fill="currentColor" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white">
            <MessageCircle className="w-16 h-16 text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-black mb-2">Vos messages</h2>
            <p className="text-gray-500 text-[15px]">Envoyez des photos et des messages privés.</p>
          </div>
        )}
      </div>
    </div>
  );
}