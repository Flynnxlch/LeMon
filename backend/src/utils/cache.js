import NodeCache from 'node-cache';

const TTL = 90; // seconds - list/read caches for faster repeat requests (target 120-250ms)
const cache = new NodeCache({ stdTTL: TTL, checkperiod: 120 });

const KEYS = {
  ASSETS: 'assets',
  ASSET_ID: (id) => `asset:${id}`,
  BRANCHES: 'branches',
  BRANCH_ID: (id) => `branch:${id}`,
  USERS: 'users',
  ACCOUNT_REQUESTS: 'account_requests',
  TRANSFER_REQUESTS: 'transfer_requests',
  REASSIGNMENT_REQUESTS: 'reassignment_requests',
  ASSET_REQUESTS: 'asset_requests',
};

export { cache, KEYS };

export function invalidateAssets() {
  const keys = cache.keys();
  keys.forEach((k) => {
    if (k === KEYS.ASSETS || k.startsWith('asset:') || k.startsWith('assets')) cache.del(k);
  });
}

export function invalidateBranches() {
  cache.del(KEYS.BRANCHES);
  cache.keys().forEach((k) => {
    if (k.startsWith('branch:')) cache.del(k);
  });
}

export function invalidateUsers() {
  cache.keys().forEach((k) => {
    if (k === KEYS.USERS || k.startsWith('users')) cache.del(k);
  });
}

export function invalidateAccountRequests() {
  cache.keys().forEach((k) => {
    if (k === KEYS.ACCOUNT_REQUESTS || k.startsWith('account_requests')) cache.del(k);
  });
}

// FIX [F008]: Cache keys are KEYS.TRANSFER_REQUESTS + status (e.g. "transfer_requestsPending"); delete all matching keys by prefix
export function invalidateTransferRequests() {
  cache.keys().forEach((k) => {
    if (k.startsWith(KEYS.TRANSFER_REQUESTS)) cache.del(k);
  });
}

export function invalidateReassignmentRequests() {
  cache.keys().forEach((k) => {
    if (k.startsWith(KEYS.REASSIGNMENT_REQUESTS)) cache.del(k);
  });
}

export function invalidateAssetRequests() {
  cache.keys().forEach((k) => {
    if (k === KEYS.ASSET_REQUESTS || k.startsWith('asset_requests')) cache.del(k);
  });
}

export function invalidateAll() {
  cache.flushAll();
}
