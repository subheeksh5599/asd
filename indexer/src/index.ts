import { startListener } from "./listener.js"
import { startServer } from "./server.js"

const network = (process.env.NETWORK ?? "testnet") as "testnet" | "mainnet"
const packageId = process.env.PACKAGE_ID ?? ""

if (!packageId) {
  console.warn("PACKAGE_ID not set — event subscription will not start until set")
}

startServer(Number(process.env.PORT ?? 3001))

if (packageId) {
  startListener({ network, packageId }).catch((err) => {
    console.error("Listener failed:", err)
    process.exit(1)
  })
}
