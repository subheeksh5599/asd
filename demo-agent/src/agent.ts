import { AgentPass } from "@agentpass/sdk"

// Demo agent — checks AgentPass before every DeepBook trade
// Used exclusively for hackathon demo

const ap = new AgentPass({ network: "testnet" })

export async function runTradeLoop(agentAddress: string) {
  console.log(`Agent ${agentAddress} starting trade loop...`)

  while (true) {
    const isAuthorized = await ap.verify({
      agent: agentAddress,
      scope: "trade:deepbook",
      amountUsdc: 100,
    })

    if (!isAuthorized) {
      console.log("Authorization revoked or expired. Agent halted.")
      break
    }

    await executeTrade(agentAddress)
    await new Promise((r) => setTimeout(r, 5000))
  }
}

async function executeTrade(agent: string) {
  // TODO: build PTB with verifier::verify() check + deepbook.place_order()
  console.log(`[${agent}] Executing authorized trade on DeepBook...`)
}
