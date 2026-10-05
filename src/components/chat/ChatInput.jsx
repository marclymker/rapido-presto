import { useState, useRef, useCallback, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Send, ImageIcon, ShoppingBag } from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';
import { toast } from 'sonner';

// Isolé : le state messageText ne re-render QUE ce composant
const ChatInput = memo(({ conversationId, isVendor, onMessageSent, onOpenProductPicker, user }) => {
  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || isSending) return;
    setMessageText('');
    setIsSending(true);

    // Optimistic UI: on notifie le parent immédiatement
    const optimisticMsg = {
      id: `optimistic_${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_name: user.full_name || 'Moi',
      content: text,
      type: 'text',
      is_read: false,
      created_date: new Date().toISOString(),
      _optimistic: true
    };
    onMessageSent(optimisticMsg);

    try {
      await firebaseApi.functions.invoke('chatService', {
        action: 'send', conversation_id: conversationId, content: text, type: 'text'
      });
    } catch {
      toast.error("Erreur d'envoi, réessayez");
    } finally {
      setIsSending(false);
    }
  }, [messageText, isSending, conversationId, user, onMessageSent]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error("Format invalide");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");

    setIsUploading(true);
    try {
      const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file });
      await firebaseApi.functions.invoke('chatService', {
        action: 'send', conversation_id: conversationId,
        content: 'Photo', type: 'image', metadata: { imageUrl: file_url }
      });
      onMessageSent(null); // Déclenche un refetch
      toast.success('Photo envoyée');
    } catch {
      toast.error("Échec de l'upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [conversationId, onMessageSent]);

  return (
    <div className="p-3 bg-white flex items-end gap-2 shrink-0 border-t border-gray-100">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <div className="flex gap-1 text-[#0084FF] pb-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Photo">
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        </Button>
        {isVendor && (
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100"
            onClick={onOpenProductPicker} title="Partager un produit">
            <ShoppingBag className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 bg-[#F0F2F5] rounded-2xl px-3 py-2 min-h-[40px] flex items-end">
        <textarea
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aa"
          className="w-full bg-transparent outline-none text-[15px] resize-none max-h-24 placeholder:text-gray-500 overflow-y-auto"
          rows="1"
          style={{ minHeight: '20px' }}
        />
      </div>

      <div className="pb-1 shrink-0">
        <Button
          onClick={handleSend}
          disabled={!messageText.trim() || isSending}
          variant="ghost" size="icon"
          className="h-9 w-9 rounded-full text-[#0084FF] hover:bg-gray-100 active:scale-90 disabled:opacity-30"
        >
          <Send className="w-5 h-5" fill="currentColor" />
        </Button>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;
