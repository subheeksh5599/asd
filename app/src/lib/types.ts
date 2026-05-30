export interface Capability {
  id: string
  delegator: string
  agent: string
  scopes: string[]
  maxUsdc: number
  leverageAllowed: boolean
  expiryMs: number
  issuedAtMs: number
  status: "active" | "expired"
}

export interface ZkLoginSession {
  address: string
  ephemeralPrivateKey: string
  zkProof: object
  maxEpoch: number
  randomness: string
  userSalt: string
}

export interface GrantOptions {
  agent: string
  scopes: string[]
  maxUsdc: number
  leverageAllowed: boolean
  expiresInMs: number
}
