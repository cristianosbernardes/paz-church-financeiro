import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { Membership, AppRole } from '@/types/database';

export const ALL_CHURCHES = '__ALL__';

interface ChurchContextType {
  memberships: Membership[];
  selectedChurchId: string | null;
  selectedChurchName: string;
  activeChurchIds: string[];
  userRole: AppRole | null;
  setSelectedChurchId: (id: string) => void;
  loading: boolean;
}

const ChurchContext = createContext<ChurchContextType>({} as ChurchContextType);

export const useChurch = () => useContext(ChurchContext);

export const ChurchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setSelectedChurchId(null);
      setLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('memberships')
        .select('*, churches(*)')
        .eq('user_id', user.id);

      if (!error && data) {
        setMemberships(data as Membership[]);
        const stored = localStorage.getItem('selectedChurchId');
        if (stored && (stored === ALL_CHURCHES || data.some((m: any) => m.church_id === stored))) {
          setSelectedChurchId(stored);
        } else if (data.length === 1) {
          setSelectedChurchId(data[0].church_id);
        } else if (data.length > 1) {
          setSelectedChurchId(ALL_CHURCHES);
        }
      }
      setLoading(false);
    };

    fetchMemberships();
  }, [user]);

  useEffect(() => {
    if (selectedChurchId) {
      localStorage.setItem('selectedChurchId', selectedChurchId);
    }
  }, [selectedChurchId]);

  const allChurchIds = memberships.map(m => m.church_id);
  const activeChurchIds = selectedChurchId === ALL_CHURCHES ? allChurchIds : selectedChurchId ? [selectedChurchId] : [];

  const currentMembership = memberships.find(m => m.church_id === selectedChurchId);
  const selectedChurchName = selectedChurchId === ALL_CHURCHES
    ? 'Todas as Igrejas'
    : currentMembership?.churches?.name ?? '';
  const userRole = selectedChurchId === ALL_CHURCHES
    ? memberships[0]?.role ?? null
    : currentMembership?.role ?? null;

  return (
    <ChurchContext.Provider value={{ memberships, selectedChurchId, selectedChurchName, activeChurchIds, userRole, setSelectedChurchId, loading }}>
      {children}
    </ChurchContext.Provider>
  );
};
