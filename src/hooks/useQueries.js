import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getListData } from '../api/client';
import { invalidateData } from '../utils/dataInvalidation';

export const queryKeys = {
  assets: (params) => ['assets', params ?? {}],
  asset: (id) => ['assets', 'detail', id],
  branches: () => ['branches'],
  branch: (id) => ['branches', id],
  users: (params) => ['users', params ?? {}],
  accountRequests: (status) => ['accountRequests', status ?? ''],
  passwordApprovals: (status) => ['passwordApprovals', status ?? ''],
  passwordApprovalDetail: (id) => ['passwordApprovals', 'detail', id],
  transferRequests: (status) => ['transferRequests', status ?? ''],
  reassignmentRequests: (status) => ['reassignmentRequests', status ?? ''],
  assetRequests: (status) => ['assetRequests', status ?? ''],
  settings: () => ['settings'],
};

// ── Assets ──────────────────────────────────────────────────────────

export function useAssets(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.assets(params),
    queryFn: () => api.assets.list(params).then(getListData),
    ...options,
  });
}

export function useAssetDetail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.asset(id),
    queryFn: () => api.assets.get(id).then((res) => res?.data ?? null),
    enabled: !!id,
    ...options,
  });
}

export function useAssetHistory(assetId, options = {}) {
  return useQuery({
    queryKey: ['assets', 'history', assetId],
    queryFn: () => api.assets.getHistory(assetId),
    enabled: !!assetId,
    ...options,
  });
}

export function useAssetBeritaAcara(assetId, options = {}) {
  return useQuery({
    queryKey: ['assets', 'berita-acara', assetId],
    queryFn: () => api.assets.getBeritaAcara(assetId),
    enabled: !!assetId,
    ...options,
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.assets.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      invalidateData('assets');
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, photo, beritaAcara }) => api.assets.create(payload, photo, beritaAcara),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      invalidateData('assets');
    },
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, body }) => api.assets.assign(assetId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      invalidateData('assets');
    },
  });
}

export function useUpdateCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, body }) => api.assets.update(assetId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      invalidateData('assets');
    },
  });
}

// ── Branches ────────────────────────────────────────────────────────

export function useBranches(options = {}) {
  return useQuery({
    queryKey: queryKeys.branches(),
    queryFn: () => api.branches.list().then(getListData),
    staleTime: 60_000,
    ...options,
  });
}

// ── Transfer Requests ───────────────────────────────────────────────

export function useTransferRequests(status, options = {}) {
  return useQuery({
    queryKey: queryKeys.transferRequests(status),
    queryFn: () => api.transferRequests.list(status).then(getListData),
    ...options,
  });
}

export function useDirectTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, beritaAcaraFile } = {}) =>
      api.transferRequests.direct(body, beritaAcaraFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['transferRequests'] });
      invalidateData('assets');
      invalidateData('transferRequests');
    },
  });
}

export function useCreateTransferRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.transferRequests.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['transferRequests'] });
      invalidateData('assets');
      invalidateData('transferRequests');
    },
  });
}

export function useApproveTransferRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, beritaAcaraFile }) => api.transferRequests.approve(id, beritaAcaraFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['transferRequests'] });
      invalidateData('assets');
      invalidateData('transferRequests');
    },
  });
}

export function useRejectTransferRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.transferRequests.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferRequests'] });
      invalidateData('transferRequests');
    },
  });
}

// ── Reassignment Requests ───────────────────────────────────────────

export function useReassignmentRequests(status, options = {}) {
  return useQuery({
    queryKey: queryKeys.reassignmentRequests(status),
    queryFn: () => api.reassignmentRequests.list(status).then(getListData),
    ...options,
  });
}

export function useCreateReassignmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.reassignmentRequests.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reassignmentRequests'] });
      invalidateData('reassignmentRequests');
    },
  });
}

export function useApproveReassignmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, beritaAcaraFile }) => api.reassignmentRequests.approve(id, beritaAcaraFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['reassignmentRequests'] });
      invalidateData('assets');
      invalidateData('reassignmentRequests');
    },
  });
}

export function useRejectReassignmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.reassignmentRequests.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reassignmentRequests'] });
      invalidateData('reassignmentRequests');
    },
  });
}

// ── Asset Requests ──────────────────────────────────────────────────

export function useAssetRequests(status, options = {}) {
  return useQuery({
    queryKey: queryKeys.assetRequests(status),
    queryFn: () => api.assetRequests.list(status).then(getListData),
    ...options,
  });
}

export function useCreateAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, photo }) => api.assetRequests.create(body, photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assetRequests'] });
      invalidateData('assetRequests');
    },
  });
}

export function useApproveAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, photo, beritaAcara }) => api.assetRequests.approve(id, body, photo, beritaAcara),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['assetRequests'] });
      invalidateData('assets');
      invalidateData('assetRequests');
    },
  });
}

export function useRejectAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.assetRequests.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assetRequests'] });
      invalidateData('assetRequests');
    },
  });
}

// ── Users & Account Requests ────────────────────────────────────────

export function useUsers(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => api.users.list(params).then(getListData),
    ...options,
  });
}

export function useAccountRequests(status, options = {}) {
  return useQuery({
    queryKey: queryKeys.accountRequests(status),
    queryFn: () => api.users.getAccountRequests(status).then(getListData),
    ...options,
  });
}

export function useApproveAccountRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.users.approveAccountRequest(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['accountRequests'] });
      invalidateData('users');
      invalidateData('accountRequests');
    },
  });
}

export function useRejectAccountRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.users.rejectAccountRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accountRequests'] });
      invalidateData('accountRequests');
    },
  });
}

export function useUpdateUserBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.users.updateBranch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      invalidateData('users');
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.users.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      invalidateData('users');
    },
  });
}

// ── Settings ────────────────────────────────────────────────────────

export function useSettings(options = {}) {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => api.settings.get().then((res) => res?.data ?? null),
    staleTime: 60_000,
    ...options,
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.settings.updateReminder(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// ── Branches Mutation ───────────────────────────────────────────────

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.branches.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      invalidateData('branches');
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.branches.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      invalidateData('branches');
    },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.branches.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      invalidateData('branches');
    },
  });
}

export function usePasswordApprovals(status, options = {}) {
  return useQuery({
    queryKey: queryKeys.passwordApprovals(status),
    queryFn: () => api.users.getPasswordApprovals(status).then(getListData),
    ...options,
  });
}

export function usePasswordApprovalDetail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.passwordApprovalDetail(id),
    queryFn: () => api.users.getPasswordApprovalDetail(id).then((res) => res?.data ?? null),
    enabled: !!id,
    ...options,
  });
}

export function useApprovePasswordRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.users.approvePasswordRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwordApprovals'] });
    },
  });
}

export function useRejectPasswordRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.users.rejectPasswordRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwordApprovals'] });
    },
  });
}
