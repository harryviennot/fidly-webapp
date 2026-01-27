export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
}

export interface MembershipWithUser {
  id: string;
  user_id: string;
  business_id: string;
  role: 'owner' | 'scanner';
  user: User;
  created_at?: string;
}

export interface MembershipCreate {
  user_id: string;
  business_id: string;
  role: 'owner' | 'scanner';
}

export interface MembershipUpdate {
  role: 'owner' | 'scanner';
}
