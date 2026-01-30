import type { User, MembershipRole } from './membership';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type InvitableRole = Exclude<MembershipRole, 'owner'>;

export interface Invitation {
  id: string;
  business_id: string;
  email: string;
  name?: string;
  role: InvitableRole;
  token: string;
  status: InvitationStatus;
  invited_by: string;
  expires_at: string;
  created_at?: string;
  accepted_at?: string;
  inviter?: User;
}

export interface InvitationPublic {
  id: string;
  email: string;
  name?: string;
  role: InvitableRole;
  status: InvitationStatus;
  expires_at: string;
  business_name: string;
  inviter_name: string;
  is_expired: boolean;
}

export interface InvitationCreate {
  email: string;
  name?: string;
  role: InvitableRole;
}

export interface InvitationAcceptResponse {
  message: string;
  business_id: string;
  business_name: string;
  role: InvitableRole;
}
