import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { writeAuditBlob } from "./walrus.js"

interface ListenerConfig {
  network: "testnet" | "mainnet"
  packageId: string
}

export async function startListener(config: ListenerConfig) {
  const client = new SuiClient({ url: getFullnodeUrl(config.network) })

  // Subscribe to all AgentPass events
  await client.subscribeEvent({
    filter: { Package: config.packageId },
    onMessage: async (event) => {
      await writeAuditBlob(event)
    },
  })
}
