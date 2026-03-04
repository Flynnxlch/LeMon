import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  assets: {
    all: ['assets'],
    list: (params) => ['assets', 'list', params],
    detail: (id) => ['assets', 'detail', id],
  },
  branches: {
    all: ['branches'],
    list: () => ['branches', 'list'],
    detail: (id) => ['branches', 'detail', id],
  },
  users: {
    all: ['users'],
    list: (params) => ['users', 'list', params],
  },
  accountRequests: {
    all: ['accountRequests'],
    list: (status) => ['accountRequests', 'list', status],
  },
  transferRequests: {
    all: ['transferRequests'],
    list: (status) => ['transferRequests', 'list', status],
  },
  reassignmentRequests: {
    all: ['reassignmentRequests'],
    list: (status) => ['reassignmentRequests', 'list', status],
  },
  assetRequests: {
    all: ['assetRequests'],
    list: (status) => ['assetRequests', 'list', status],
  },
  settings: {
    all: ['settings'],
  },
};
