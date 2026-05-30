import { Transaction } from "@mysten/sui/transactions"
import { suiClient, PACKAGE_ID, REGISTRY_ID, REGISTRY_INITIAL_VERSION, CLOCK_ID } from "./sui"
import { signAndExecuteTx } from "./zklogin"
import type { Capability, GrantOptions } from "./types"

export async function fetchCapabilities(address: string): Promise<Capability[]> {
  if (!PACKAGE_ID) return []
  const result = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: `${PACKAGE_ID}::capability::AgentCapability` },
    options: { showContent: true },
  })
  return result.data
    .filter(item => item.data?.content?.dataType === "moveObject")
    .map(item => {
      const fields = (item.data!.content as any).fields
      const expiryMs = Number(fields.expiry_ms ?? 0)
      return {
        id: item.data!.objectId,
        delegator: fields.delegator,
        agent: fields.agent,
        scopes: fields.scopes ?? [],
        maxUsdc: Number(fields.max_usdc ?? 0),
        leverageAllowed: Boolean(fields.leverage_allowed),
        expiryMs,
        issuedAtMs: Number(fields.issued_at_ms ?? 0),
        status: (expiryMs !== 0 && Date.now() > expiryMs) ? "expired" : "active",
      } as Capability
    })
}

export async function issueCapability(opts: GrantOptions): Promise<string> {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::capability::issue`,
    arguments: [
      tx.sharedObjectRef({ objectId: REGISTRY_ID, initialSharedVersion: REGISTRY_INITIAL_VERSION, mutable: true }),
      tx.pure.address(opts.agent),
      tx.pure.vector("string", opts.scopes),
      tx.pure.u64(opts.maxUsdc),
      tx.pure.bool(opts.leverageAllowed),
      tx.pure.u64(opts.expiresInMs),
      tx.object(CLOCK_ID),
    ],
  })
  const { digest } = await signAndExecuteTx(tx)
  return digest
}

export async function revokeCapability(capId: string): Promise<string> {
  const tx = new Transaction()
  tx.moveCall({
    target: `${PACKAGE_ID}::capability::revoke`,
    arguments: [
      tx.sharedObjectRef({ objectId: REGISTRY_ID, initialSharedVersion: REGISTRY_INITIAL_VERSION, mutable: true }),
      tx.object(capId),
      tx.object(CLOCK_ID),
    ],
  })
  const { digest } = await signAndExecuteTx(tx)
  return digest
}
