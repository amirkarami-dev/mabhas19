// API DTO types — sourced from the generated @mabhas19/api-types package.
// All existing "@/lib/types" imports in this project continue to work unchanged.

export type {
  Project,
  Assessment,
  CurrentUser,
  Subscription,
  AdminUser,
  CreateProjectInput,
  UpdateProjectInput,
  ImportProjectInput,
  SaveAssessmentInput,
  CreateUserInput,
  UpdateUserSubscriptionInput,
  SetUserRoleInput,
  GenerateReportResult,
  SubscriptionPlan,
} from "@mabhas19/api-types"

import type { CurrentUser } from "@mabhas19/api-types"

// Kept for backward-compat — UserInfo now carries role/identity info too.
// Not in the OpenAPI contract; kept as a local alias.
export interface UserInfo extends CurrentUser {
  isEmailConfirmed?: boolean
}
