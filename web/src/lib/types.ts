export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

// Current authenticated user, returned by GET /api/Users/me.
export interface CurrentUser {
  id: string
  email: string
  phoneNumber?: string | null
  roles: string[]
  isAdmin: boolean
}

// Kept for backward-compat. UserInfo now carries role/identity info too.
export interface UserInfo extends CurrentUser {
  isEmailConfirmed?: boolean
}

// ---- Admin ----
export interface AdminUser {
  id: string
  email: string
  phoneNumber?: string | null
  isAdmin: boolean
  roles: string[]
  plan: string
  maxProjects: number
  usedProjects: number
  isActive: boolean
  validTo?: string | null
}

export type SubscriptionPlan = "Free" | "Pro" | "Enterprise"

export interface UpdateUserSubscriptionInput {
  plan: SubscriptionPlan | string
  maxProjects: number
  isActive: boolean
  validTo?: string | null
}

export interface CreateUserInput {
  email: string
  password: string
  isAdmin: boolean
}

export interface Subscription {
  plan: string
  maxProjects: number
  usedProjects: number
  isActive?: boolean
  validTo?: string | null
}

// Mirrors the .NET ProjectDto returned by /api/Projects.
export interface Project {
  id: number | string
  title: string
  client?: string | null
  address?: string | null
  city?: string
  climateCode?: string
  totalArea?: number
  floorCount?: number
  unitCount?: number
  usage?: string | null
  deed?: string | null
  parcel?: string | null
  systemId?: string | null
  source?: string
  externalId?: string | null
  buildingGroupCode?: string
  buildingGroupLabel?: string
  hasAssessment?: boolean
  totalScore?: number | null
  maxScore?: number | null
  created?: string
  // kept for backward-compat with earlier code
  createdAt?: string
  buildingGroup?: string
}

export interface CreateProjectInput {
  title: string
  client?: string
  address?: string
  city?: string
  climateCode?: string
  totalArea?: number
  floorCount?: number
  unitCount?: number
  usage?: string
  deed?: string
  parcel?: string
  systemId?: string
}

export interface Assessment {
  inputJson: string
  resultJson: string
  totalScore: number
  maxScore: number
}
