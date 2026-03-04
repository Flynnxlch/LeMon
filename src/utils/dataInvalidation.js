import { useEffect, useRef } from 'react';

/**
 * Cache invalidation: setelah CRUD, dispatch event agar halaman lain refetch data.
 * Types: 'assets' | 'branches' | 'users' | 'accountRequests' | 'transferRequests' | 'reassignmentRequests' | 'assetRequests'
 */
export const DATA_INVALIDATE_EVENT = 'data:invalidate';

export function invalidateData(type) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DATA_INVALIDATE_EVENT, { detail: { type } })
  );
}

/**
 * Hook: dengarkan event invalidate dan panggil refetch bila type cocok.
 * @param {string[]|string} types - misal ['assets', 'branches'] atau 'assets'
 * @param {() => void} refetch - callback refetch
 */
export function useDataInvalidation(types, refetch) {
  const typesRef = useRef(types);
  typesRef.current = types;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    const handler = (e) => {
      const t = e.detail?.type;
      if (!t) return;
      const set = new Set(Array.isArray(typesRef.current) ? typesRef.current : [typesRef.current]);
      if (set.has(t)) refetchRef.current();
    };
    window.addEventListener(DATA_INVALIDATE_EVENT, handler);
    return () => window.removeEventListener(DATA_INVALIDATE_EVENT, handler);
  }, []);
}
