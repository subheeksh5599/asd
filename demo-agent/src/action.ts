import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { config } from "./config.js"

const client = new SuiClient({ url: getFullnodeUrl(config.network) })

/**
 * Real on-chain action proving the agent executed something while authorized.
 *
 * For the demo we split 1 MIST off the gas coin and transfer it back to the
 * agent itself — a real, verifiable testnet transaction with no external
 * dependency. A production app would instead build a PTB that calls
 * `verifier::verify(cap, scope, amount, clock)` and then the real DeFi move
 * (e.g. deepbook::place_order) atomically. The demo's proof is that the agent
 * stops issuing these transactions the moment its capability is revoked.
 */
export async function executeAction(
  keypair: Ed25519Keypair,
  capId: string,
): Promise<{ txDigest: string }> {
  const address = keypair.toSuiAddress()

  const tx = new Transaction()
  tx.setSender(address)

  // Split 1 MIST from gas and transfer to self — proves real execution.
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1)])
  tx.transferObjects([coin], tx.pure.address(address))

  tx.setGasBudget(10_000_000)

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true },
  })

  if (result.effects?.status?.status !== "success") {
    throw new Error(`Transaction failed: ${JSON.stringify(result.effects?.status)}`)
  }

  return { txDigest: result.digest }
}
