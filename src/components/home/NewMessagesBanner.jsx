import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { firebase } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';

export default function NewMessagesBanner({ user }) {
  const [showBanner, setShowBanner] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      const response = await firebase.functions.invoke('chatService', { action: 'unread-count' });
      return response.data.unreadCount;
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (unreadCount > 0) {
        setShowBanner(true);
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [unreadCount]);

  if (!showBanner || unreadCount === 0) return null;

  return (
    <div className="fixed top-32 right-4 z-50 animate-in slide-in-from-right duration-500 max-w-sm w-full md:w-80">
      <div className="bg-white border-l-4 border-blue-500 shadow-2xl rounded-lg p-4 relative">
        <button
          onClick={() => setShowBanner(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">Nouveaux messages !</h4>
            <p className="text-sm text-gray-600 mt-1">
              Vous avez <span className="font-bold">{unreadCount} message{unreadCount > 1 ? 's' : ''}</span> non lu{unreadCount > 1 ? 's' : ''}.
            </p>
          </div>
        </div>

        <Button
          className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold"
          onClick={() => window.location.href = createPageUrl('Chat')}
        >
          Voir mes messages
        </Button>
      </div>
    </div>
  );
}