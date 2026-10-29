export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  rating: number;
  location: string;
  /** DANE codes of the user's registered municipality (set at registration). */
  departmentCode?: string;
  municipalityCode?: string;
  verified: boolean;
  co2SavedKg: number;
  initials?: string;
  level?: number;
  tradesCompleted?: number;
  createdAt?: string;
}

export interface ItemOwnerSummary {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  rating: number;
  location: string;
  verified?: boolean;
  co2SavedKg?: number;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  condition: string;
  ownerId: string;
  imageUrl: string;
  images?: string[];
  wants: string[];
  description?: string;
  estimatedValue?: number;
  location?: string;
  departmentCode?: string;
  municipalityCode?: string;
  /** Distance from the viewer's municipality, when the API could compute it. */
  distanceKm?: number | null;
  status?: string;
  aiTags?: string[];
  owner?: ItemOwnerSummary;
  createdAt?: string;
}

export interface SwapStep {
  fromUserId: string;
  toUserId: string;
  fromItemId: string;
  toItemId: string;
}

export interface SwapRoute {
  id: string;
  title: string;
  stepsCount: number;
  targetItemId: string;
  offeredItemId: string;
  participants: User[];
  chainItems: Item[];
  co2SavedKg: number;
  isLoop: boolean;
}

export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface Proposal {
  id: string;
  targetItemId: string;
  offeredItemId: string;
  proposerUserId: string;
  recipientUserId: string;
  status: ProposalStatus;
  createdAt: string;
}
