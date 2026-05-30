import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"

export const suiClient = new SuiClient({
  url: getFullnodeUrl((process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as "testnet" | "mainnet" | "devnet"),
})
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? ""
export const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID ?? ""
export const REGISTRY_INITIAL_VERSION = process.env.NEXT_PUBLIC_REGISTRY_INITIAL_VERSION ?? "1"
export const CLOCK_ID = "0x0000000000000000000000000000000000000000000000000000000000000006"
