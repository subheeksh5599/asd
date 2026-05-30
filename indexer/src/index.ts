import { startListener } from "./listener.js"

console.log("AgentPass Walrus indexer starting...")

await startListener({
  network: (process.env.NETWORK ?? "testnet") as "testnet" | "mainnet",
  packageId: process.env.PACKAGE_ID ?? "",
})
