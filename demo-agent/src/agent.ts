import { loadKeypair } from "./keypair.js"
import { checkAuthorization } from "./agentpass.js"
import { executeAction } from "./action.js"
import { config } from "./config.js"

const SCOPE = "trade:deepbook"

export async function runAgent(): Promise<void> {
  const keypair = loadKeypair()
  const address = keypair.toSuiAddress()

  console.log("═══════════════════════════════════════")
  console.log("  AgentPass Demo Agent")
  console.log("═══════════════════════════════════════")
  console.log(`  Address: ${address}`)
  console.log(`  Scope:   ${SCOPE}`)
  console.log(`  Network: ${config.network}`)
  console.log(`  Poll:    every ${config.pollIntervalMs}ms`)
  console.log("═══════════════════════════════════════")
  console.log()

  // Initial authorization check
  const initial = await checkAuthorization(address, SCOPE)
  if (!initial.authorized) {
    console.log(`✗ Not authorized: ${initial.reason}`)
    console.log("  Ask the delegator to issue a capability at /dashboard/grant")
    console.log(`  Agent address to authorize: ${address}`)
    process.exit(1)
  }

  console.log(`✓ Authorized (cap: ${initial.capId})`)
  console.log("  Starting execution loop...\n")

  let cycle = 0

  while (true) {
    cycle++
    const timestamp = new Date().toISOString()

    const { authorized, capId, reason } = await checkAuthorization(address, SCOPE)

    if (!authorized) {
      console.log(`[${timestamp}] cycle=${cycle}`)
      console.log(`  ✗ AUTHORIZATION REVOKED — ${reason}`)
      console.log("  Agent halted. Exiting.")
      process.exit(0)
    }

    console.log(`[${timestamp}] cycle=${cycle} cap=${capId?.slice(0, 12)}...`)

    try {
      const { txDigest } = await executeAction(keypair, capId!)
      console.log(`  ✓ Action executed | digest: ${txDigest}`)
      console.log(`    https://suiscan.xyz/testnet/tx/${txDigest}`)
    } catch (err: any) {
      console.error(`  ✗ Action failed: ${err.message}`)
    }

    await new Promise((r) => setTimeout(r, config.pollIntervalMs))
  }
}
