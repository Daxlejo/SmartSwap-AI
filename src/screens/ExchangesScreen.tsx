import { useEffect, useState } from 'react';
import { Proposal, Item, User } from '@/types';
import { getProposals, getItems, getCurrentUser, getUserById } from '@/services/swapService';
import { ProposalCard } from '@/components/ProposalCard';
import { EmptyState } from '@/components/ui/EmptyState';

const TABS = ['Recibidos', 'Enviados', 'Activos', 'Historial'];

export const ExchangesScreen = () => {
  const [activeTab, setActiveTab] = useState('Enviados');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedProposals, fetchedItems, user] = await Promise.all([
          getProposals(),
          getItems(),
          getCurrentUser()
        ]);
        
        setCurrentUser(user);
        setProposals(fetchedProposals);
        
        const itemMap = fetchedItems.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
        setItems(itemMap);

        const userIds = new Set<string>();
        fetchedProposals.forEach(p => {
          userIds.add(p.proposerUserId);
          userIds.add(p.recipientUserId);
        });

        const fetchedUsers: Record<string, User> = {};
        for (const id of Array.from(userIds)) {
          const u = await getUserById(id);
          if (u) fetchedUsers[u.id] = u;
        }
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error loading exchanges", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAccept = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'accepted' } : p));
  };

  const handleDecline = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'declined' } : p));
  };

  const getFilteredProposals = () => {
    if (!currentUser) return [];
    
    return proposals.filter(p => {
      if (activeTab === 'Recibidos') {
        return p.recipientUserId === currentUser.id && p.status === 'pending';
      }
      if (activeTab === 'Enviados') {
        return p.proposerUserId === currentUser.id && p.status === 'pending';
      }
      if (activeTab === 'Activos') {
        return p.status === 'accepted' && (p.proposerUserId === currentUser.id || p.recipientUserId === currentUser.id);
      }
      if (activeTab === 'Historial') {
        return (p.status === 'declined' || p.status === 'completed') && (p.proposerUserId === currentUser.id || p.recipientUserId === currentUser.id);
      }
      return false;
    });
  };

  const filteredProposals = getFilteredProposals();

  return (
    <div className="flex flex-col h-full bg-surface-50">
      <div className="px-margin pt-4 pb-2 bg-surface-50 sticky top-0 z-10">
        <h2 className="text-h2 font-bold text-text-primary mb-4">Tus Canjes</h2>
        
        {/* Tabs */}
        <div className="flex bg-surface-100 p-1 rounded-xl mb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-surface-50 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-margin py-4">
        {isLoading ? (
          <div className="text-center text-text-secondary mt-10 animate-pulse">Cargando propuestas...</div>
        ) : filteredProposals.length === 0 ? (
          <EmptyState
            iconName="inbox"
            title="Sin propuestas"
            description={`No tienes propuestas en la bandeja de ${activeTab.toLowerCase()}.`}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {filteredProposals.map(proposal => {
              const isReceived = currentUser?.id === proposal.recipientUserId;
              const otherUserId = isReceived ? proposal.proposerUserId : proposal.recipientUserId;
              
              return (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  targetItem={items[proposal.targetItemId]}
                  offeredItem={items[proposal.offeredItemId]}
                  otherUser={users[otherUserId]}
                  isReceived={isReceived}
                  onAccept={() => handleAccept(proposal.id)}
                  onDecline={() => handleDecline(proposal.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
