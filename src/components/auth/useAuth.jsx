import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error
  };
}