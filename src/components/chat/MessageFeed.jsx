import { useEffect, useRef, useCallback, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MessageBubble from './MessageBubble';
import ProductContextCard from './ProductContextCard';

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

const MessageFeed = memo(({ messages, selectedConv, user, isLoading }) => {
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    // Scroll to bottom seulement si nouveau message ajouté (pas lors du scroll infini)
    if (messages.length !== prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (!selectedConv) return null;

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col bg-white">
      {selectedConv?.product_context_id && (
        <div className="flex justify-center my-3">
          <ProductContextCard productId={selectedConv.product_context_id} />
        </div>
      )}

      {/* Entête profil */}
      <div className="flex flex-col items-center py-6 mb-2">
        <Avatar className="w-18 h-18 mb-2 shrink-0" style={{ width: 72, height: 72 }}>
          <AvatarImage src={selectedConv.shop_logo} />
          <AvatarFallback className="bg-[#E4E6EB] text-black text-2xl">
            {getInitials(user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name)}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-[17px] font-bold">
          {user.id === selectedConv.vendor_id ? selectedConv.customer_name : selectedConv.shop_name}
        </h2>
        <p className="text-[12px] text-gray-400 mt-0.5">Rapido Presto · Support IA 24/7</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#0084FF]" /></div>
      ) : (
        messages.map((m, index) => {
          const isMe = m.sender_id === user.id;
          const nextMsg = messages[index + 1];
          const prevMsg = messages[index - 1];
          return (
            <MessageBubble
              key={m.id}
              m={m}
              isMe={isMe}
              isNextSameSender={!!(nextMsg && nextMsg.sender_id === m.sender_id)}
              isPrevSameSender={!!(prevMsg && prevMsg.sender_id === m.sender_id)}
              shopLogo={selectedConv.shop_logo}
            />
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
});

MessageFeed.displayName = 'MessageFeed';
export default MessageFeed;