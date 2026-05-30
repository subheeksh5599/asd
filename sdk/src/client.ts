import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import type {
  AgentPassConfig,
  GrantOptions,
  VerifyOptions,
  Capability,
  AuditEntry,
  GrantResult,
  RevokeResult,
} from "./types.js"

const CLOCK_ID = "0x0000000000000000000000000000000000000000000000000000000000000006"

export class AgentPass {
  private sui: SuiClient
  private config: AgentPassConfig

  constructor(config: AgentPassConfig) {
    this.config = config
    this.sui = new SuiClient({ url: getFullnodeUrl(config.network) })
  }

  get packageId(): string {
    return this.config.packageId ?? ""
  }

  get registryId(): string {
    return this.config.registryId ?? ""
  }

  get registryInitialVersion(): string {
    return this.config.registryInitialVersion ?? "1"
  }

  get indexerUrl(): string {
    return this.config.indexerUrl ?? ""
  }

  async grant(signer: Ed25519Keypair, options: GrantOptions): Promise<GrantResult> {
    const tx = new Transaction()
    const expiresInMs = options.expiresInDays
      ? Date.now() + options.expiresInDays * 86_400_000
      : 0

    tx.moveCall({
      target: `${this.packageId}::capability::issue`,
      arguments: [
        tx.sharedObjectRef({
          objectId: this.registryId,
          initialSharedVersion: this.registryInitialVersion,
          mutable: true,
        }),
        tx.pure.address(options.agent),
        tx.pure.vector("string", options.scopes),
        tx.pure.u64(options.maxUsdc ?? 0),
        tx.pure.bool(options.leverageAllowed ?? false),
        tx.pure.u64(expiresInMs),
        tx.object(CLOCK_ID),
      ],
    })

    const result = await this.sui.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: { showEffects: true, showObjectChanges: true },
    })

    const created = result.objectChanges?.find(
      (c) =>
        c.type === "created" &&
        (c as { objectType?: string }).objectType?.includes("::capability::AgentCapability"),
    )

    return {
      capId: (created as { objectId?: string } | undefined)?.objectId ?? "",
      txDigest: result.digest,
    }
  }

  async revoke(signer: Ed25519Keypair, capabilityId: string): Promise<RevokeResult> {
    const tx = new Transaction()

    tx.moveCall({
      target: `${this.packageId}::capability::revoke`,
      arguments: [
        tx.sharedObjectRef({
          objectId: this.registryId,
          initialSharedVersion: this.registryInitialVersion,
          mutable: true,
        }),
        tx.object(capabilityId),
        tx.object(CLOCK_ID),
      ],
    })

    const result = await this.sui.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: { showEffects: true },
    })

    return { txDigest: result.digest }
  }

  async verify(options: VerifyOptions): Promise<boolean> {
    const owned = await this.sui.getOwnedObjects({
      owner: options.agent,
      filter: { StructType: `${this.packageId}::capability::AgentCapability` },
      options: { showContent: true },
    })

    const now = Date.now()
    const requestedAmount = options.amountUsdc ?? 0

    for (const item of owned.data) {
      const content = item.data?.content
      if (!content || content.dataType !== "moveObject") continue

      const fields = (content as { fields: Record<string, unknown> }).fields
      const expiryMs = Number(fields.expiry_ms ?? 0)
      const scopes = (fields.scopes as string[]) ?? []
      const maxUsdc = Number(fields.max_usdc ?? 0)

      const notExpired = expiryMs === 0 || now < expiryMs
      const scopeAllowed = scopes.includes(options.scope)
      const amountAllowed = maxUsdc === 0 || requestedAmount <= maxUsdc

      if (notExpired && scopeAllowed && amountAllowed) {
        return true
      }
    }

    return false
  }

  async getCapabilities(ownerAddress: string): Promise<Capability[]> {
    const result = await this.sui.getOwnedObjects({
      owner: ownerAddress,
      filter: { StructType: `${this.packageId}::capability::AgentCapability` },
      options: { showContent: true },
    })

    return result.data
      .filter((item) => item.data?.content?.dataType === "moveObject")
      .map((item) => {
        const fields = (item.data!.content as { fields: Record<string, unknown> }).fields
        const expiryMs = Number(fields.expiry_ms ?? 0)
        return {
          id: item.data!.objectId,
          delegator: fields.delegator as string,
          agent: fields.agent as string,
          scopes: (fields.scopes as string[]) ?? [],
          maxUsdc: Number(fields.max_usdc ?? 0),
          leverageAllowed: Boolean(fields.leverage_allowed),
          expiryMs,
          issuedAtMs: Number(fields.issued_at_ms ?? 0),
          status: expiryMs !== 0 && Date.now() > expiryMs ? "expired" : "active",
        } as Capability
      })
  }

  async auditLog(agentAddress: string): Promise<AuditEntry[]> {
    if (!this.indexerUrl) return []
    try {
      const response = await fetch(`${this.indexerUrl}/audit/${agentAddress}`)
      if (!response.ok) return []
      return (await response.json()) as AuditEntry[]
    } catch {
      return []
    }
  }
}
