import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import type { AgentPassConfig, GrantOptions, VerifyOptions, Capability, AuditEntry } from "./types.js"

export class AgentPass {
  private sui: SuiClient
  private packageId: string
  private registryId: string

  constructor(config: AgentPassConfig) {
    this.sui = new SuiClient({ url: getFullnodeUrl(config.network) })
    this.packageId = config.packageId ?? DEPLOYED_PACKAGE_IDS[config.network]
    this.registryId = config.registryId ?? DEPLOYED_REGISTRY_IDS[config.network]
  }

  async grant(options: GrantOptions): Promise<Capability> {
    const tx = new Transaction()
    // TODO: wire to capability::issue Move call
    // Returns the created AgentCapability object
    throw new Error("not implemented — wire to Move package after deploy")
  }

  async revoke(capabilityId: string): Promise<void> {
    const tx = new Transaction()
    // TODO: wire to capability::revoke Move call
    throw new Error("not implemented")
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    // TODO: call verifier::verify via devInspect (read-only)
    throw new Error("not implemented")
  }

  async getCapabilities(agentAddress: string): Promise<Capability[]> {
    // TODO: read DelegationRegistry shared object
    throw new Error("not implemented")
  }

  async auditLog(agentAddress: string): Promise<AuditEntry[]> {
    // TODO: fetch from Walrus indexer, return sorted by timestamp desc
    throw new Error("not implemented")
  }
}

const DEPLOYED_PACKAGE_IDS: Record<string, string> = {
  testnet: "0x0",   // fill after deploy
  mainnet: "0x0",
  devnet:  "0x0",
}

const DEPLOYED_REGISTRY_IDS: Record<string, string> = {
  testnet: "0x0",   // fill after deploy
  mainnet: "0x0",
  devnet:  "0x0",
}
