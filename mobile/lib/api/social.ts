/**
 * Mobile API client for the social layer.
 * Reuses the same web backend endpoints via `backendFetch` (Firebase-auth'd),
 * so the data model stays identical across web, PWA, and native.
 */

import { backendFetch } from './backend';
import type {
  ContactMatch,
  EventSocialAttendance,
  FriendshipState,
  PublicUserSummary,
  SocialLinks,
  PrivacySettings,
} from '../../types/social';

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export interface ConnectionsOverview {
  friends: PublicUserSummary[];
  incoming: PublicUserSummary[];
  outgoing: PublicUserSummary[];
}

/** Friends + pending requests for the current user. */
export async function fetchConnections(): Promise<ConnectionsOverview> {
  const res = await backendFetch('/api/connections', { method: 'GET' });
  const data = await readJson(res);
  if (!res.ok || !data) {
    return { friends: [], incoming: [], outgoing: [] };
  }
  return {
    friends: data.friends || [],
    incoming: data.incoming || [],
    outgoing: data.outgoing || [],
  };
}

export async function sendConnectionRequest(targetUserId: string): Promise<FriendshipState> {
  const res = await backendFetch('/api/connections/request', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.error || 'Failed to send request');
  return (data?.status as FriendshipState) || 'request_sent';
}

export async function respondToConnectionRequest(
  targetUserId: string,
  action: 'accept' | 'decline'
): Promise<FriendshipState> {
  const res = await backendFetch('/api/connections/respond', {
    method: 'POST',
    body: JSON.stringify({ targetUserId, action }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.error || 'Failed to respond');
  return (data?.status as FriendshipState) || 'none';
}

export async function removeConnection(targetUserId: string): Promise<void> {
  const res = await backendFetch('/api/connections/remove', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) {
    const data = await readJson(res);
    throw new Error(data?.error || 'Failed to remove connection');
  }
}

export interface UserSearchResult extends PublicUserSummary {
  friendship: FriendshipState;
}

export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const res = await backendFetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`, {
    method: 'GET',
  });
  const data = await readJson(res);
  return res.ok && data?.results ? data.results : [];
}

export async function matchContacts(phones: string[]): Promise<ContactMatch[]> {
  if (!phones.length) return [];
  const res = await backendFetch('/api/connections/match-contacts', {
    method: 'POST',
    body: JSON.stringify({ phones }),
  });
  const data = await readJson(res);
  return res.ok && data?.matches ? data.matches : [];
}

/** "Who's going" attendance for an event (privacy-enforced server-side). */
export async function fetchEventSocial(eventId: string): Promise<EventSocialAttendance> {
  const res = await backendFetch(`/api/events/${eventId}/social`, { method: 'GET' });
  const data = await readJson(res);
  if (!res.ok || !data) {
    return { totalGoing: 0, viewerIsGoing: false, friendsGoing: [], publicGoing: [] };
  }
  return data;
}

export interface SocialProfileUpdate {
  bio?: string;
  socialLinks?: SocialLinks;
  privacy?: Partial<PrivacySettings>;
}

/** Update social/bio/privacy via the shared profile endpoint (sanitized server-side). */
export async function updateSocialProfile(updates: SocialProfileUpdate): Promise<void> {
  const res = await backendFetch('/api/profile/update', {
    method: 'POST',
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await readJson(res);
    throw new Error(data?.error || 'Failed to update profile');
  }
}

/**
 * Batch "friends going" counts for a set of events (viewer's perspective).
 * Returns a map of eventId -> distinct friend count. Empty for logged-out users.
 */
export async function fetchFriendsGoingCounts(
  eventIds: string[]
): Promise<Record<string, number>> {
  const ids = Array.from(new Set(eventIds.filter(Boolean)));
  if (ids.length === 0) return {};
  try {
    const res = await backendFetch('/api/events/social-counts', {
      method: 'POST',
      body: JSON.stringify({ eventIds: ids }),
    });
    const data = await readJson(res);
    return res.ok && data?.counts ? data.counts : {};
  } catch {
    return {};
  }
}
