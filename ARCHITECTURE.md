# AgentPass — Architecture Document

**Version:** 0.1 | **Date:** 2026-05-30

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Google Login)                       │
│                         zkLogin → Sui Address                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ issues AgentCapability
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUI BLOCKCHAIN (Move)                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ AgentCapability │  │DelegationRegistry│  │  Audit Events │  │
│  │    (object)     │  │  (shared object) │  │  (emitted)    │  │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬────────┘  │
│           │                   │                    │            │
│           └─────── verify() ──┘          consumed by indexer   │
└───────────────────────────────────────────────────┬─────────────┘
                            │                       │
              agent submits tx with cap             │ events
                            │                       ▼
┌───────────────────────────┴───┐    ┌──────────────────────────┐
│   DEEPBOOK MARGIN (on-chain)  │    │   WALRUS INDEXER (off)   │
│   checks AgentPass registry   │    │   writes blobs per event │
│   before accepting order      │    │   content-addressed      │
└───────────────────────────────┘    └──────────────────────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │   WALRUS NETWORK   │
                                          │  (permanent blobs) │
                                          └─────────┬──────────┘
                                                    │ read
┌───────────────────────────────────────────────────▼─────────────┐
│                    NEXT.JS FRONTEND                              │
│   Dashboard · Issue Cap · Revoke · Audit Log Browser            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. On-Chain Components (Move)

### 2.1 `capability.move`

Core data object — the permission slip.

```move
public struct AgentCapability has key, store {
    id: UID,
    delegator: address,          // user who issued this
    agent: address,              // AI agent address
    scopes: vector<String>,      // ["trade:deepbook", "stake:scallop"]
    max_usdc: u64,               // 0 = unlimited
    leverage_allowed: bool,
    expiry_ms: u64,              // unix timestamp ms, 0 = no expiry
    issued_at_ms: u64,
    revocable: bool,
}
```

Key functions:
- `issue(agent, scopes, max_usdc, leverage, expiry)` → creates + registers capability
- `revoke(cap)` → burns object + removes from registry
- `is_valid(cap)` → checks expiry, not revoked

### 2.2 `registry.move`

Shared object — global on-chain index.

```move
public struct DelegationRegistry has key {
    id: UID,
    // agent_address → vector of active cap IDs
    active: Table<address, vector<ID>>,
}
```

Key functions:
- `register(cap)` → called on issue
- `deregister(cap_id, agent)` → called on revoke
- `has_scope(agent, scope)` → public read, returns bool
- `get_capabilities(agent)` → returns all active caps for agent

### 2.3 `verifier.move`

Public interface — what other protocols call.

```move
// Any Sui contract calls this before accepting agent action
public fun verify(
    registry: &DelegationRegistry,
    agent: address,
    required_scope: String,
    amount_usdc: u64,
    clock: &Clock,
): bool
```

This is the one function every app integrates. Zero trust assumptions, pure on-chain logic.

### 2.4 Events (consumed by Walrus indexer)

```move
public struct CapabilityIssued has copy, drop {
    cap_id: ID,
    delegator: address,
    agent: address,
    scopes: vector<String>,
    expiry_ms: u64,
    timestamp_ms: u64,
}

public struct CapabilityRevoked has copy, drop {
    cap_id: ID,
    agent: address,
    timestamp_ms: u64,
}

public struct AgentActionVerified has copy, drop {
    cap_id: ID,
    agent: address,
    scope_used: String,
    amount_usdc: u64,
    timestamp_ms: u64,
    result: bool,
}
```

---

## 3. Off-Chain Components

### 3.1 Walrus Indexer (`indexer/`)

Node.js service. Subscribes to Sui event stream, writes blobs to Walrus.

```
Sui Event Stream
      │
      ▼
EventListener (suiClient.subscribeEvent)
      │
      ▼
BlobSerializer (JSON → bytes)
      │
      ▼
WalrusClient.store(blob) → blobId
      │
      ▼
LocalIndex (blobId ↔ agentAddress ↔ eventType)
```

Walrus blob structure per event:
```json
{
  "type": "CapabilityIssued",
  "capId": "0x...",
  "delegator": "0x...",
  "agent": "0x...",
  "scopes": ["trade:deepbook"],
  "timestamp": 1748610000000,
  "txDigest": "0x..."
}
```

### 3.2 TypeScript SDK (`sdk/`)

Published as `@agentpass/sdk`. Two audiences: app devs and agent devs.

```typescript
// App developer — verify before executing
import { AgentPass } from "@agentpass/sdk"

const ap = new AgentPass({ network: "mainnet" })

const valid = await ap.verify({
  agent: "0xagent...",
  scope: "trade:deepbook",
  amountUsdc: 500,
})

// Agent developer — attach proof to transaction
const cap = await ap.getCapability({ agent: myAddress, scope: "trade:deepbook" })
// cap.id is attached to the PTB (Programmable Transaction Block)

// User — issue capability
const cap = await ap.grant({
  agent: "0xagent...",
  scopes: ["trade:deepbook"],
  maxUsdc: 500,
  leverageAllowed: false,
  expiresInDays: 7,
})

// User — revoke
await ap.revoke({ capabilityId: cap.id })

// Anyone — read audit log
const log = await ap.auditLog({ agent: "0xagent..." })
// returns array of Walrus blobs in chronological order
```

### 3.3 Next.js Frontend (`app/`)

Pages:
- `/` — landing page with "Login with Google" (zkLogin)
- `/dashboard` — list of issued capabilities (active / expired / revoked)
- `/grant` — form: agent address, scopes checkboxes, max USDC slider, expiry picker
- `/audit/[agentAddress]` — Walrus audit log browser, reverse-chron, filterable
- `/verify` — developer tool: paste agent address + scope → live verification result

### 3.4 Demo Agent (`demo-agent/`)

TypeScript agent that:
1. Reads its own capabilities from AgentPass registry
2. Constructs a DeepBook margin trade PTB
3. Includes capability proof in the transaction
4. Contract verifies → executes or rejects
5. Every step emits events → Walrus log

Used exclusively for the hackathon demo.

---

## 4. Data Flow — Happy Path

```
1. User opens app → clicks "Login with Google"
2. zkLogin generates ephemeral keypair + ZK proof → Sui address derived
3. User fills grant form: agent=0xABC, scope=trade:deepbook, max=500, expiry=7d
4. SDK calls issue() → Move tx → AgentCapability object created
5. DelegationRegistry updated atomically
6. CapabilityIssued event emitted
7. Walrus indexer picks up event → writes blob → logs blobId

8. Agent wakes up, wants to trade on DeepBook
9. Agent calls sdk.getCapability() → fetches cap from registry
10. Agent builds PTB: [verifier.verify(), deepbook.place_order()]
11. verifier.verify() checks registry → scope valid, not expired, under limit → true
12. DeepBook executes order
13. AgentActionVerified event emitted → Walrus logs it

14. User opens audit log → fetches Walrus blobs → sees full history
```

---

## 5. Data Flow — Revocation

```
1. User clicks Revoke on capability 0xCAP
2. SDK calls revoke(capId) → Move tx → burns AgentCapability object
3. Registry removes entry atomically
4. CapabilityRevoked event emitted → Walrus logs it

5. Agent attempts next trade
6. verifier.verify() → registry lookup → no active cap → returns false
7. DeepBook tx fails at contract level
8. No funds moved
```

---

## 6. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Blockchain | Sui | Object model = native capability primitives |
| Smart contracts | Move (Sui) | Linear types = safe capability ownership |
| Identity | Sui zkLogin | Google/Apple → Sui address, no seed phrase |
| Storage | Walrus | Immutable, content-addressed audit trail |
| DeFi integration | DeepBook Margin SDK | On-chain authorization check in margin trades |
| SDK | TypeScript + bun | Standard for Sui ecosystem tooling |
| Frontend | Next.js 15 + TypeScript | Fastest path to polished UI |
| Styling | Tailwind CSS + shadcn/ui | Ship fast, looks professional |
| Sui client | @mysten/sui | Official SDK |
| Walrus client | @mysten/walrus | Official SDK |
| Monorepo | bun workspaces | Single repo, shared types |
| Testnet | Sui testnet | Live demo for judges |

---

## 7. Folder Structure

```
agentpass/
├── contracts/                  # Move smart contracts
│   ├── Move.toml
│   ├── sources/
│   │   ├── capability.move     # AgentCapability object
│   │   ├── registry.move       # DelegationRegistry shared object
│   │   ├── verifier.move       # Public verify() function
│   │   └── events.move         # Event structs
│   └── tests/
│       ├── capability_tests.move
│       └── registry_tests.move
│
├── sdk/                        # @agentpass/sdk
│   ├── package.json
│   └── src/
│       ├── index.ts            # Public exports
│       ├── client.ts           # AgentPass class
│       ├── capability.ts       # Issue / revoke / get
│       ├── verify.ts           # Verification logic
│       ├── audit.ts            # Walrus log fetching
│       └── types.ts            # Shared types
│
├── indexer/                    # Walrus audit indexer
│   ├── package.json
│   └── src/
│       ├── index.ts            # Entry point
│       ├── listener.ts         # Sui event subscription
│       ├── walrus.ts           # Walrus blob writer
│       └── store.ts            # Local blobId index
│
├── app/                        # Next.js frontend
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Landing / login
│       │   ├── dashboard/
│       │   │   └── page.tsx    # Capability list
│       │   ├── grant/
│       │   │   └── page.tsx    # Issue capability form
│       │   └── audit/
│       │       └── [agent]/
│       │           └── page.tsx # Walrus audit log
│       ├── components/
│       │   ├── CapabilityCard.tsx
│       │   ├── GrantForm.tsx
│       │   ├── AuditLog.tsx
│       │   └── ZkLoginButton.tsx
│       └── lib/
│           ├── sui.ts          # Sui client singleton
│           ├── agentpass.ts    # SDK wrapper
│           └── zklogin.ts      # zkLogin flow helpers
│
├── demo-agent/                 # Hackathon demo agent
│   ├── package.json
│   └── src/
│       ├── index.ts            # Agent entry point
│       ├── agent.ts            # Main agent loop
│       ├── deepbook.ts         # DeepBook trade execution
│       └── agentpass.ts        # Capability fetching
│
├── docs/
│   ├── PRD.md                  # This file's sibling
│   └── ARCHITECTURE.md         # This file
│
└── package.json                # bun workspaces root
```

---

## 8. Build Timeline (3 weeks to Jun 20)

### Week 1 — Contracts + Core
- Day 1-2: `capability.move` + `registry.move` — issue/revoke/query
- Day 3: `verifier.move` — public verify function
- Day 4: `events.move` + contract tests
- Day 5: Deploy to Sui testnet + smoke test

### Week 2 — SDK + Indexer + DeepBook
- Day 1-2: `@agentpass/sdk` — grant, revoke, verify, auditLog
- Day 3: Walrus indexer — event listener + blob writer
- Day 4-5: DeepBook integration — wire verifier into margin trade PTB

### Week 3 — Frontend + Demo + Polish
- Day 1-2: Next.js app — zkLogin flow + dashboard + grant form
- Day 3: Audit log browser (Walrus blobs → UI)
- Day 4: Demo agent — full happy path + revocation path
- Day 5: Record demo video + write submission

---

## 9. Key Risks

| Risk | Mitigation |
|------|-----------|
| zkLogin integration complexity | Use official Mysten Labs examples, not from scratch |
| Walrus SDK API changes | Pin to specific version day 1 |
| DeepBook Margin testnet instability | Build with mock fallback for demo if needed |
| Move contract bugs | Write tests first, deploy early (Day 5 Week 1) |
| Demo fails live | Pre-record backup video with working testnet run |
