export const config = {
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY ?? "",
  packageId: process.env.PACKAGE_ID ?? "",
  registryId: process.env.REGISTRY_ID ?? "",
  registryInitialVersion: process.env.REGISTRY_INITIAL_VERSION ?? "1",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
  network: (process.env.SUI_NETWORK ?? "testnet") as "testnet" | "mainnet",
}
