"use client"

// TanStack Query hooks over the existing endpoints.ts transport. Components use these
// instead of hand-rolling useState/useEffect fetches; mutations invalidate the relevant
// query keys so lists stay fresh automatically.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { adminApi, projectsApi, subscriptionApi, authApi } from "./endpoints"
import { ApiError } from "./api"
import { queryKeys } from "./query-keys"
import type {
  Assessment,
  CreateProjectInput,
  CreateUserInput,
  UpdateUserSubscriptionInput,
} from "./types"

// ---------------------------------------------------------------- Queries ----

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => authApi.me(),
    enabled,
  })
}

export function useSubscription(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => subscriptionApi.me(),
    enabled,
  })
}

export function useProjects(enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectsApi.list(),
    enabled,
  })
}

export function useProject(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectsApi.get(id),
    enabled: enabled && !!id,
  })
}

export function useAssessment(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessment(projectId),
    queryFn: async () => {
      try {
        return await projectsApi.getAssessment(projectId)
      } catch (err) {
        // A 404 means no assessment has been saved yet — start fresh, not an error.
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },
    enabled: enabled && !!projectId,
  })
}

export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => adminApi.listUsers(),
    enabled,
  })
}

// -------------------------------------------------------------- Mutations ----

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects })
      void qc.invalidateQueries({ queryKey: queryKeys.subscription })
    },
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<CreateProjectInput>) =>
      projectsApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.project(id) })
      void qc.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects })
      void qc.invalidateQueries({ queryKey: queryKeys.subscription })
    },
  })
}

export function useImportProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      source,
      externalId,
    }: {
      source: string
      externalId: string
    }) => projectsApi.importProject(source, externalId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects })
      void qc.invalidateQueries({ queryKey: queryKeys.subscription })
    },
  })
}

export function useGenerateReport(id: string) {
  // No cached state changes — returns a fresh presigned download URL.
  return useMutation({
    mutationFn: () => projectsApi.report(id),
  })
}

export function useSaveAssessment(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assessment: Assessment) =>
      projectsApi.saveAssessment(projectId, assessment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assessment(projectId) })
      void qc.invalidateQueries({ queryKey: queryKeys.project(projectId) })
    },
  })
}

// ---- Admin mutations ----

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminApi.createUser(input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })
}

export function useUpdateUserSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateUserSubscriptionInput
    }) => adminApi.updateSubscription(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminUsers })
      void qc.invalidateQueries({ queryKey: queryKeys.adminUser(id) })
    },
  })
}

export function useSetUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      adminApi.setRole(id, isAdmin),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminUsers })
      void qc.invalidateQueries({ queryKey: queryKeys.adminUser(id) })
    },
  })
}

export function useRemoveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.removeUser(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })
}
