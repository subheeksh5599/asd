export type Network = "mainnet" | "testnet" | "devnet"

export interface AgentPassConfig {
  network: Network
  /** AgentPass Move package address (e.g. `0xabc...`). */
  packageId?: string
  /** `DelegationRegistry` shared object ID. */
  registryId?: string
  /**
   * Initial shared-object version of the registry. Required to build a
   * `sharedObjectRef` for transactions that mutate the registry (issue/revoke).
   * Obtainable from `getObject(registryId)` → `data.owner.Shared.initial_shared_version`.
   */
  registryInitialVersion?: string
  /** Base URL of the audit-log indexer HTTP API (e.g. `http://localhost:3001`). */
  indexerUrl?: string
}

export interface GrantOptions {
  /** Agent Sui address that will hold the delegated authority. */
  agent: string
  /** Scope strings, e.g. `["trade:deepbook", "stake:scallop"]`. */
  scopes: string[]
  /** Spending cap in whole USDC. `0` (the default) means unlimited. */
  maxUsdc?: number
  /** Whether the agent may take leveraged positions. Defaults to `false`. */
  leverageAllowed?: boolean
  /** Days until the capability expires. `0` (the default) means no expiry. */
  expiresInDays?: number
}

export interface VerifyOptions {
  agent: string
  scope: string
  /** Amount in whole USDC the action would spend. Defaults to `0`. */
  amountUsdc?: number
}

export interface Capability {
  id: string
  delegator: string
  agent: string
  scopes: string[]
  maxUsdc: number
  leverageAllowed: boolean
  /** Expiry in epoch milliseconds. `0` means no expiry. */
  expiryMs: number
  /** Issuance time in epoch milliseconds. */
  issuedAtMs: number
  /**
   * `active`  — owned, not past expiry.
   * `expired` — owned, but `expiryMs` is in the past.
   * `revoked` — no longer owned by the delegator (the object was destroyed on revoke).
   *
   * Note: `getCapabilities` reads currently-owned objects, so it can only
   * return `active` or `expired`; a revoked capability no longer exists as an
   * object and therefore does not appear in that result set.
   */
  status: "active" | "expired" | "revoked"
}

export interface AuditEntry {
  type: "issued" | "revoked" | "verified"
  capId: string
  agent: string
  /** Event time in epoch milliseconds. */
  timestamp: number
  txDigest: string
  walrusBlobId: string
  data: Record<string, unknown>
}

/** Result of a successful `grant` transaction. */
export interface GrantResult {
  /** Object ID of the freshly-created `AgentCapability`. */
  capId: string
  txDigest: string
}

/** Result of a successful `revoke` transaction. */
export interface RevokeResult {
  txDigest: string
}
