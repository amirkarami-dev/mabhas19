// API DTOs — mirrors the .NET backend (kept in sync with web/src/lib/types.ts).

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface CurrentUser {
  id: string
  email: string
  phoneNumber?: string | null
  roles: string[]
  isAdmin: boolean
}

export interface Subscription {
  plan: string
  maxProjects: number
  usedProjects: number
  isActive?: boolean
  validTo?: string | null
}

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
