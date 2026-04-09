import { memo } from 'react';
import { Loader2, MessageCircle, Edit, Search, Menu, Users, Compass } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return new Date() - d < 86400000
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const ConversationList = memo(({ conversations, isLoading, selectedConvId, userId, onSelect }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="bg-gray-100 hover:bg-gray-200 rounded-full h-10 w-10">
              <Menu className="w-5 h-5 text-black" />
            </Button>
            <h1 className="text-[22px] font-bold">Discussions</h1>
          </div>
          <Button variant="ghost" size="icon" className="bg-gray-100 hover:bg-gray-200 rounded-full h-10 w-10">
            <Edit className="w-5 h-5 text-black" />
          </Button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Rechercher"
            className="w-full bg-[#F0F2F5] rounded-full py-2 pl-9 pr-4 text-[14px] outline-none placeholder:text-gray-500" />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-2 pt-1">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#0084FF]" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center mt-16 px-6">
            <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-[14px]">Aucun message</p>
          </div>
        ) : (
          conversations.map(c => {
            const contactName = userId === c.vendor_id ? c.customer_name : c.shop_name;
            const isActive = selectedConvId === c.id;
            const isUnread = (c.unread_count || 0) > 0;
            return (
              <div key={c.id} onClick={() => onSelect(c)}
                className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${isActive ? 'bg-[#EAF3FF]' : 'hover:bg-[#F2F2F2]'}`}
              >
                <Avatar className="w-[52px] h-[52px] shrink-0">
                  <AvatarImage src={c.shop_logo} />
                  <AvatarFallback className="bg-[#E4E6EB] text-black text-base">{getInitials(contactName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] truncate ${isUnread ? 'font-semibold text-black' : 'text-[#050505]'}`}>{contactName}</p>
                  <div className="flex text-[12px] text-gray-500 items-center gap-1 truncate">
                    <span className={`truncate ${isUnread ? 'font-semibold text-[#0084FF]' : ''}`}>{c.last_message || "Nouvelle discussion"}</span>
                    <span>·</span>
                    <span className="shrink-0">{formatTime(c.last_message_date)}</span>
                  </div>
                </div>
                {isUnread && <div className="w-2.5 h-2.5 bg-[#0084FF] rounded-full shrink-0" />}
              </div>
            );
          })
        )}
      </div>

      <div className="md:hidden flex justify-around items-center border-t border-gray-200 bg-white pt-2 pb-4 px-2 shrink-0">
        <div className="flex flex-col items-center p-2 text-[#0084FF]"><MessageCircle className="w-6 h-6" fill="currentColor" /><span className="text-[10px] font-semibold mt-1">Discussions</span></div>
        <div className="flex flex-col items-center p-2 text-gray-400"><Users className="w-6 h-6" /><span className="text-[10px] mt-1">Personnes</span></div>
        <div className="flex flex-col items-center p-2 text-gray-400"><Compass className="w-6 h-6" /><span className="text-[10px] mt-1">Découvrir</span></div>
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';
export default ConversationList;