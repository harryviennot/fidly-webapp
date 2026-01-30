export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
}

export type MembershipRole = 'owner' | 'admin' | 'scanner';

export interface MembershipWithUser {
  id: string;
  user_id: string;
  business_id: string;
  role: MembershipRole;
  user: User;
  created_at?: string;
  last_active_at?: string;
  scans_count?: number;
}

export interface MembershipCreate {
  user_id: string;
  business_id: string;
  role: MembershipRole;
}

export interface MembershipUpdate {
  role: MembershipRole;
}
