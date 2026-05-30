import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { writeAuditBlob } from "./walrus.js"
import { addEntry } from "./store.js"

interface ListenerConfig {
  network: "testnet" | "mainnet"
  packageId: string
}

export async function startListener(config: ListenerConfig): Promise<void> {
  const client = new SuiClient({ url: getFullnodeUrl(config.network) })

  console.log(`Subscribing to events from package ${config.packageId}`)

  await client.subscribeEvent({
    filter: { Package: config.packageId },
    onMessage: async (event) => {
      try {
        const blobId = await writeAuditBlob(event)
        const agentAddress = extractAgent(event)
        if (agentAddress) {
          addEntry(agentAddress, {
            blobId,
            eventType: event.type,
            timestamp: Number(event.timestampMs ?? Date.now()),
            txDigest: event.id.txDigest,
          })
        }
        console.log(`[${event.type}] blobId=${blobId}`)
      } catch (err) {
        console.error("Failed to process event:", err)
        // keep running
      }
    },
  })
}

function extractAgent(event: any): string | null {
  return event.parsedJson?.agent ?? event.parsedJson?.delegator ?? null
}
