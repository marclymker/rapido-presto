import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

const MessageBubble = memo(({ m, isMe, isNextSameSender, isPrevSameSender, shopLogo }) => {
  const borderRadius = isMe
    ? `18px ${!isNextSameSender ? '18px' : '4px'} ${!isPrevSameSender ? '18px' : '4px'} 18px`
    : `${!isNextSameSender ? '18px' : '4px'} 18px 18px ${!isPrevSameSender ? '18px' : '4px'}`;

  return (
    <div className={`flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'} ${!isNextSameSender ? 'mb-3' : 'mb-[2px]'}`}>
      {!isMe && (
        <div className="w-7 shrink-0 flex items-end">
          {!isNextSameSender && (
            <Avatar className="w-7 h-7">
              <AvatarImage src={shopLogo} />
              <AvatarFallback className="bg-[#E4E6EB] text-[10px] text-black">{getInitials(m.sender_name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && m.sender_name?.includes('(IA)') && !isPrevSameSender && (
          <p className="text-[10px] text-gray-400 mb-0.5 ml-1">🤖 Support IA</p>
        )}

        {/* Image */}
        {m.type === 'image' && m.metadata?.imageUrl && (
          <div className="rounded-[18px] overflow-hidden border border-gray-100 shadow-sm mb-1">
            <img src={m.metadata.imageUrl} alt="img" className="max-w-[220px] max-h-[280px] object-cover" loading="lazy" />
          </div>
        )}

        {/* Carte produit */}
        {m.type === 'product' && m.metadata?.productId && (
          <div
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-1 w-[240px]"
            onClick={() => window.open(`/product/${m.metadata.productSlug || m.metadata.productId}`, '_blank')}
          >
            {m.metadata.productImage && (
              <img src={`${m.metadata.productImage}?width=240&quality=60`} alt={m.metadata.productName} className="w-full h-28 object-cover" loading="lazy" />
            )}
            <div className="p-2.5">
              <p className="font-semibold text-sm text-gray-800 truncate">{m.metadata.productName}</p>
              <p className="font-bold text-[#0084FF] text-sm">{(m.metadata.productPrice || 0).toLocaleString()} HTG</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Voir le produit →</p>
            </div>
          </div>
        )}

        {/* Texte */}
        {m.content && m.content !== 'Photo' && m.type !== 'product' && (
          <div
            className={`px-3 py-2 text-[15px] leading-relaxed break-words max-w-full ${
              isMe ? 'bg-[#0084FF] text-white' : 'bg-[#E4E6EB] text-[#050505]'
            } ${m._optimistic ? 'opacity-70' : ''}`}
            style={{ borderRadius }}
          >
            {m.content}
          </div>
        )}

        {isMe && !isNextSameSender && (
          <span className="text-[11px] text-gray-400 mt-0.5 mr-1">
            {m._optimistic ? '⌛' : m.is_read ? 'Vu' : 'Envoyé'}
          </span>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
export default MessageBubble;