# AgentPass

**OAuth for AI agents on Sui.**

AgentPass is a permissionless on-chain authorization standard that lets users issue scoped, revocable permissions to AI agents — backed by zkLogin identity and Walrus immutable audit trails.

> Sui Overflow 2026 · Tracks: The Agentic Web · Walrus · DeepBook

---

## The Problem

AI agents on Sui have no standard way to prove they are authorized to act on a user's behalf. Every DeFi app either trusts agent transactions blindly or blocks them entirely. The February 2026 $400M cascade happened because agents had no authorization boundaries.

## The Solution

AgentPass is the coordination standard every Sui app needs. One integration. Works for any agent.

```
User logs in with Google (zkLogin)
  → Issues AgentCapability to agent: "trade up to $500 on DeepBook, 7 days"
  → Agent executes trades — every action verified against the capability
  → User clicks Revoke → agent halts on next cycle
  → Every event logged permanently on Walrus
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  User (Google / zkLogin → Sui address)              │
└───────────────────┬─────────────────────────────────┘
                    │ issues AgentCapability
                    ▼
┌─────────────────────────────────────────────────────┐
│  Sui Blockchain (Move)                              │
│  capability.move · registry.move · verifier.move    │
└──────────┬──────────────────────────┬───────────────┘
           │ agent checks registry    │ events emitted
           ▼                          ▼
┌──────────────────┐        ┌─────────────────────────┐
│  DeepBook Margin │        │  Walrus Indexer          │
│  (trade gating)  │        │  Permanent audit blobs   │
└──────────────────┘        └─────────────────────────┘
```

---

## Repo Structure

```
agentpass/
├── contracts/          Move smart contracts
│   └── sources/
│       ├── capability.move   AgentCapability object — issue / revoke
│       ├── registry.move     DelegationRegistry shared object
│       ├── verifier.move     Public verify() — what every app calls
│       └── events.move       On-chain audit events
├── sdk/                @agentpass/sdk — TypeScript SDK
│   └── src/
│       ├── client.ts   AgentPass class (grant/revoke/verify/getCapabilities/auditLog)
│       └── types.ts    Shared types
├── indexer/            Walrus audit indexer + HTTP API
│   └── src/
│       ├── listener.ts Sui event subscription
│       ├── walrus.ts   Walrus HTTP API (PUT/GET blobs)
│       ├── store.ts    Local JSON index
│       └── server.ts   HTTP API on port 3001
├── demo-agent/         Hackathon demo agent
│   └── src/
│       ├── agent.ts    Main loop — halts on revocation
│       ├── agentpass.ts Registry check via DynamicFieldObject
│       └── action.ts   Real Sui testnet transaction
└── app/                Next.js 16 frontend
    └── src/
        ├── lib/zklogin.ts    Full zkLogin flow (Google → Sui address)
        ├── lib/agentpass.ts  Move call wrappers
        └── app/              Pages: landing, dashboard, grant, audit log
```

---

## Quick Start

### 1. Deploy contracts

```bash
cd contracts
sui client publish --gas-budget 100000000
```

Note the **Package ID** and **DelegationRegistry** shared object ID from the output.

### 2. Configure environment

`app/.env.local`:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_REGISTRY_ID=0x...
NEXT_PUBLIC_REGISTRY_INITIAL_VERSION=1
NEXT_PUBLIC_INDEXER_URL=http://localhost:3001
NEXT_PUBLIC_SUI_NETWORK=testnet
```

`indexer/.env`:
```
PACKAGE_ID=0x...
NETWORK=testnet
PORT=3001
```

`demo-agent/.env`:
```
AGENT_PRIVATE_KEY=...   # generate with: bun run keygen
PACKAGE_ID=0x...
REGISTRY_ID=0x...
REGISTRY_INITIAL_VERSION=1
```

### 3. Generate agent keypair

```bash
cd demo-agent
bun run keygen
# Copy the printed private key → AGENT_PRIVATE_KEY
# Fund the printed address from Sui testnet faucet
```

### 4. Start everything

```bash
# Terminal 1 — Walrus indexer
cd indexer && bun start

# Terminal 2 — Frontend
cd app && bun dev

# Terminal 3 — Demo agent (after issuing a capability in the UI)
cd demo-agent && bun start
```

### 5. Run the demo

1. Open `http://localhost:3000` → Login with Google
2. Issue capability to your agent address: scope `trade:deepbook`, max $500, 7 days
3. Watch the agent loop in Terminal 3 — real txs appearing on SuiScan
4. Click **Revoke** in the dashboard → agent prints `AUTHORIZATION REVOKED` and halts

---

## How Apps Integrate AgentPass

Any Sui contract adds one call before executing agent actions:

```move
use agentpass::verifier;

public fun execute_agent_trade(
    cap: &AgentCapability,
    clock: &Clock,
    ...
) {
    assert!(verifier::verify(cap, utf8(b"trade:deepbook"), amount_usdc, clock), ENotAuthorized);
    // proceed with trade
}
```

TypeScript SDK:

```typescript
import { AgentPass } from "@agentpass/sdk"

const ap = new AgentPass({ network: "testnet", packageId: "0x...", registryId: "0x..." })

// Issue
const { capId } = await ap.grant(signer, {
  agent: "0xagent...",
  scopes: ["trade:deepbook"],
  maxUsdc: 500,
  expiresInDays: 7,
})

// Verify
const ok = await ap.verify({ agent: "0xagent...", scope: "trade:deepbook", amountUsdc: 100 })

// Revoke
await ap.revoke(signer, capId)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Sui (Move 2024) |
| Identity | Sui zkLogin (Google OAuth → ZK proof → Sui address) |
| Storage | Walrus (immutable audit blobs via HTTP API) |
| DeFi | DeepBook Margin (authorization check integration) |
| SDK | TypeScript + `@mysten/sui` |
| Frontend | Next.js 16 + Tailwind CSS |
| Runtime | Bun |

---

## Tracks

| Track | Why |
|-------|-----|
| **The Agentic Web** | On-chain authorization standard for autonomous agents |
| **Special — Walrus** | Every event logged as a permanent, content-addressed Walrus blob |
| **Special — DeepBook** | First agent-native authorization layer for DeepBook Margin trades |
