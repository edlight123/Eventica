import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useI18n } from '../contexts/I18nContext';
import { getStaffEventIds } from '../lib/staffAssignments';

type StaffMemberDoc = {
  uid?: string;
  eventId?: string;
  role?: string;
  permissions?: { checkin?: boolean; viewAttendees?: boolean };
};

export type StaffEventSummary = {
  id: string;
  title: string;
  start_datetime?: any;
  venue_name?: string;
  city?: string;
};

export interface UseStaffEventsResult {
  events: StaffEventSummary[];
  loading: boolean;
  /** True while a pull-to-refresh (silent) reload is in flight. */
  refreshing: boolean;
  error: boolean;
  /** Pull-to-refresh handler (silent reload; toggles `refreshing`). */
  refresh: () => Promise<void>;
}

/**
 * Shared staff-events loader — the common Firestore logic previously duplicated
 * in `screens/staff/StaffEventsScreen` and `screens/staff/StaffScanScreen`.
 *
 * Mirrors those screens exactly:
 *  1. Discover assignments via the `members` collectionGroup (keyed by uid).
 *  2. Merge locally persisted eventIds (added on successful invite redeem).
 *  3. Verify per-event access by reading the direct member doc; a member with
 *     `permissions.checkin === false` is excluded (missing → allowed, back-compat).
 *  4. Hydrate each allowed event's summary from its `events/{id}` doc.
 *
 * Loads on mount and on focus (silent), and exposes a pull-to-refresh `refresh`.
 */
export function useStaffEvents(): UseStaffEventsResult {
  const { t } = useI18n();
  const uid = auth.currentUser?.uid || null;

  const [events, setEvents] = useState<StaffEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadEvents = useCallback(
    async (options?: { silent?: boolean; isCancelled?: () => boolean }) => {
      if (!uid) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const silent = Boolean(options?.silent);
      if (!silent) setLoading(true);

      try {
        const eventIds: string[] = [];

        // Primary path: discover assignments from members collectionGroup.
        try {
          const memberQuery = query(collectionGroup(db, 'members'), where('__name__', '==', uid));
          const memberSnap = await getDocs(memberQuery);
          memberSnap.forEach((d) => {
            const data = d.data() as StaffMemberDoc;
            const derivedEventId = String(data?.eventId || d.ref.parent?.parent?.id || '');
            if (derivedEventId) eventIds.push(derivedEventId);
          });
        } catch {
          // If a collectionGroup query fails (rules/data edge cases), fall back below.
        }

        // Fallback: include locally persisted eventIds (added on successful invite redeem).
        const persisted = await getStaffEventIds();
        for (const id of persisted) eventIds.push(id);

        const uniqueEventIds = Array.from(new Set(eventIds)).filter(Boolean);

        // Verify access per event by reading the direct member doc. The reads
        // are independent per id, so fan them out in parallel instead of awaiting
        // each in sequence.
        const memberSnaps = await Promise.all(
          uniqueEventIds.map((eventId) => getDoc(doc(db, 'events', eventId, 'members', uid)))
        );
        const allowedEventIds: string[] = [];
        memberSnaps.forEach((memberSnap, i) => {
          if (!memberSnap.exists()) return;
          const member = memberSnap.data() as StaffMemberDoc;
          const checkinFlag = member?.permissions?.checkin;
          // Back-compat: missing permissions should not hide assigned events.
          if (checkinFlag === false) return;
          allowedEventIds.push(uniqueEventIds[i]);
        });

        // Hydrate each allowed event's summary — again independent per id.
        const eventSnaps = await Promise.all(
          allowedEventIds.map((eventId) => getDoc(doc(db, 'events', eventId)))
        );
        const loaded: StaffEventSummary[] = [];
        eventSnaps.forEach((eventSnap) => {
          if (!eventSnap.exists()) return;
          const data = eventSnap.data() as any;
          loaded.push({
            id: eventSnap.id,
            title: data?.title || t('common.event'),
            start_datetime: data?.start_datetime,
            venue_name: data?.venue_name || '',
            city: data?.city || '',
          });
        });

        if (options?.isCancelled?.()) return;
        setError(false);
        setEvents(loaded);
      } catch (e) {
        if (options?.isCancelled?.()) return;
        setError(true);
        setEvents([]);
      } finally {
        if (options?.isCancelled?.()) return;
        if (!silent) setLoading(false);
      }
    },
    [uid, t]
  );

  useEffect(() => {
    let cancelled = false;
    loadEvents({ isCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  // Refresh after redeeming an invite or returning to this tab.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadEvents({ silent: true, isCancelled: () => cancelled });
      return () => {
        cancelled = true;
      };
    }, [loadEvents])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvents({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadEvents]);

  return { events, loading, refreshing, error, refresh };
}

export default useStaffEvents;
