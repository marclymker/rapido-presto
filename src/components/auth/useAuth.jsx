import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getAccessSource, logAccessSource } from '@/components/utils/detectFacebookInApp';
import { useEffect } from 'react';

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const currentUser = await base44.auth.me();
        // Log l'accès si utilisateur connecté
        if (currentUser?.id) {
          logAccessSource(currentUser.id);
        }
        return currentUser;
      } catch (error) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - évite les appels répétés
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Important: ne pas refetch à chaque montage
  });

  // Ajouter la source d'accès aux données utilisateur
  const accessSource = getAccessSource();
  
  return {
    user: user ? { ...user, access_source: accessSource } : null,
    isLoading,
    isAuthenticated: !!user,
    error,
    accessSource // Exposer directement aussi
  };
}