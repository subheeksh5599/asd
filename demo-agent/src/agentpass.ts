import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { config } from "./config.js"

const client = new SuiClient({ url: getFullnodeUrl(config.network) })

export interface AuthResult {
  authorized: boolean
  capId: string | null
  reason: string
}

/**
 * Authorization check against the on-chain AgentPass contract.
 *
 * Per contracts/sources/{registry,capability}.move the capability object is
 * held by the DELEGATOR, not the agent — so we cannot find it via
 * getOwnedObjects on the agent. The authoritative source of "is this agent
 * authorized" is the shared DelegationRegistry: it maps agent address ->
 * vector<ID> of ACTIVE capability IDs. Revoking a capability deregisters its
 * ID from that table, which is exactly the on-chain signal this agent watches.
 *
 * Steps:
 *   1. Read the registry's `active` Table entry for the agent address.
 *   2. For each active cap ID, fetch the capability object (readable by anyone)
 *      and confirm it grants `scope` and is not expired.
 *   3. Authorized iff at least one such capability exists.
 */
export async function checkAuthorization(agentAddress: string, scope: string): Promise<AuthResult> {
  if (!config.packageId) return { authorized: false, capId: null, reason: "PACKAGE_ID not configured" }
  if (!config.registryId) return { authorized: false, capId: null, reason: "REGISTRY_ID not configured" }

  const activeCapIds = await getActiveCapIds(agentAddress)
  if (activeCapIds.length === 0) {
    return { authorized: false, capId: null, reason: "no active capability in registry" }
  }

  const caps = await client.multiGetObjects({
    ids: activeCapIds,
    options: { showContent: true },
  })

  const now = Date.now()

  for (const item of caps) {
    if (item.data?.content?.dataType !== "moveObject") continue
    const fields = (item.data.content as any).fields

    const scopes: string[] = fields.scopes ?? []
    const expiryMs = Number(fields.expiry_ms ?? 0)
    const capAgent: string = fields.agent ?? ""

    // Defensive: registry should only list this agent's caps, but verify.
    if (capAgent && capAgent !== agentAddress) continue

    // expiry_ms == 0 means no expiry
    if (expiryMs !== 0 && now > expiryMs) continue

    if (!scopes.includes(scope)) continue

    return { authorized: true, capId: item.data.objectId, reason: "valid capability found" }
  }

  return { authorized: false, capId: null, reason: "no valid capability for scope " + scope }
}

/**
 * Read the registry's `active: Table<address, vector<ID>>` entry for an agent.
 * Sui Tables are stored as dynamic fields keyed by the entry key (the agent
 * address). We resolve that dynamic field and return the vector<ID> value.
 * Missing entry (agent never granted, or fully revoked) -> empty list.
 */
async function getActiveCapIds(agentAddress: string): Promise<string[]> {
  try {
    const field = await client.getDynamicFieldObject({
      parentId: config.registryId,
      name: { type: "address", value: agentAddress },
    })

    if (field.data?.content?.dataType !== "moveObject") return []
    const value = (field.data.content as any).fields?.value

    // A vector<ID> is returned as an array of object-id strings.
    if (!Array.isArray(value)) return []
    return value as string[]
  } catch (err: any) {
    // A "dynamic field not found" response means the agent has no entry yet.
    const msg = String(err?.message ?? err)
    if (msg.includes("not found") || msg.includes("dynamicFieldNotFound")) return []
    throw err
  }
}
