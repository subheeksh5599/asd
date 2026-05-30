export type Network = "mainnet" | "testnet" | "devnet"

export interface AgentPassConfig {
  network: Network
  packageId?: string       // AgentPass Move package address
  registryId?: string      // DelegationRegistry shared object ID
}

export interface GrantOptions {
  agent: string            // agent Sui address
  scopes: string[]         // e.g. ["trade:deepbook", "stake:scallop"]
  maxUsdc?: number         // 0 = unlimited
  leverageAllowed?: boolean
  expiresInDays?: number   // 0 = no expiry
}

export interface VerifyOptions {
  agent: string
  scope: string
  amountUsdc?: number
}

export interface Capability {
  id: string
  delegator: string
  agent: string
  scopes: string[]
  maxUsdc: number
  leverageAllowed: boolean
  expiryMs: number
  issuedAtMs: number
  status: "active" | "expired" | "revoked"
}

export interface AuditEntry {
  type: "issued" | "revoked" | "verified"
  capId: string
  agent: string
  timestamp: number
  txDigest: string
  walrusBlobId: string
  data: Record<string, unknown>
}
