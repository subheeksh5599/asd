# AgentPass — Product Requirements Document

**Version:** 0.1  
**Date:** 2026-05-30  
**Hackathon:** Sui Overflow 2026 (deadline Jun 20)  
**Tracks:** The Agentic Web · Special Walrus · Special DeepBook

---

## 1. Problem

AI agents on Sui have no standard way to prove they are authorized to act on a user's behalf.

Today:
- Every DeFi app either trusts agent transactions blindly or blocks them entirely
- Users cannot scope what an agent can do (max spend, allowed actions, expiry)
- Users cannot revoke agent access in real time
- Agent actions leave no verifiable audit trail
- NIST (Feb 2026) and IETF (Mar 2026 draft-klrc-aiagent-auth-00) both flagged this as critical unsolved infrastructure

The February 2026 $400M cascade showed what happens when agents act without authorization boundaries: unchecked agents amplify systemic risk.

---

## 2. Vision

AgentPass is the authorization standard for AI agents on Sui — the OAuth of the Agentic Web.

A user logs in with Google. Issues a scoped permission slip to their AI agent. The agent executes trades on DeepBook. Every action is logged permanently on Walrus. The user can revoke access in one click.

Any Sui app integrates one SDK call to verify agent authorization. No custom auth systems. No blind trust.

**Euphoric surprise:** A developer integrates AgentPass in 10 minutes. An end user authorizes their first AI agent in 30 seconds using just their Google account.

---

## 3. Users

### 3.1 End Users (Delegators)
- Retail crypto users who want AI agents managing their DeFi positions
- Do not want to manage seed phrases
- Want guardrails: "my agent can spend max $500, no leverage, expires in 7 days"
- Want to revoke access instantly if something goes wrong

### 3.2 Agent Developers
- Builders writing TypeScript/Python AI agents that interact with Sui DeFi
- Need a standard way to prove their agent is authorized
- Want to ship agents that users can trust and integrate with any Sui app

### 3.3 App Developers (Verifiers)
- DeFi protocols (DeepBook, Scallop, etc.) that want to accept agent-initiated transactions safely
- Need one SDK call to verify: "is this agent authorized to do this action?"
- Want immutable proof of authorization for compliance/audit purposes

---

## 4. Core Features

### F1 — zkLogin Identity Anchor
- User authenticates via Google or Apple using Sui's native zkLogin
- Results in a persistent Sui address tied to their Google identity
- No seed phrase required — lowest possible onboarding friction
- **Sui-unique:** this flow does not exist on Ethereum or Solana

### F2 — AgentCapability Object (Move)
- On-chain Sui object representing a scoped permission grant
- Fields: `agent_address`, `scopes[]`, `max_usdc`, `leverage_allowed`, `expiry_ms`, `revocable`
- Owned by the delegator (user), held in their wallet
- Transferable, composable — first-class Sui object

### F3 — DelegationRegistry (Move)
- On-chain index: maps agent address → active capabilities
- Public read: any app queries "does agent X have permission Y?" in one Move call
- Emits events on every issuance, revocation, and expiry — consumed by the Walrus indexer

### F4 — One-Click Revocation
- User hits Revoke in the UI → Move tx burns the capability object
- Registry updates atomically
- Agent's next action is blocked instantly — no lag, no polling

### F5 — Walrus Audit Trail
- Off-chain indexer listens to Sui events
- Every grant, action, and revocation written as a content-addressed Walrus blob
- Frontend shows browsable, permanent, tamper-proof audit log
- Key differentiator: audit trail cannot be deleted, edited, or faked

### F6 — Verifier SDK (`@agentpass/sdk`)
- TypeScript library for app developers
- `AgentPass.verify(agentAddress, scope)` → returns `{ valid: boolean, capability: Cap | null }`
- `AgentPass.grant(agentAddress, options)` → issues capability from user wallet
- `AgentPass.revoke(capabilityId)` → burns capability
- `AgentPass.auditLog(agentAddress)` → fetches Walrus log for agent

### F7 — DeepBook Integration Demo
- Demo shows AgentCapability check wired into DeepBook margin trade execution
- If agent lacks valid capability → trade rejected at contract level
- Live testnet demo for hackathon judges

### F8 — User Dashboard (Next.js)
- Login with Google (zkLogin flow)
- View all issued capabilities with status (active / expired / revoked)
- Issue new capability: pick agent address, set scopes + limits + expiry
- One-click revoke
- Audit log browser: Walrus-backed, immutable history

---

## 5. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| U1 | End user | Log in with Google and issue a permission slip to my AI agent | My agent can trade without me holding a seed phrase |
| U2 | End user | Set a max spend limit and expiry on my agent's authorization | I don't lose more than I'm comfortable with |
| U3 | End user | Revoke my agent's access in one click | I can stop it immediately if it behaves unexpectedly |
| U4 | End user | See every action my agent took in a permanent audit log | I have verifiable proof of what happened |
| A1 | Agent developer | Attach my agent's capability to every transaction | DeFi apps can verify I'm authorized |
| A2 | Agent developer | Know exactly what scopes I'm authorized for | I don't accidentally exceed permissions |
| P1 | App developer | Call one SDK function to verify agent authorization | I don't build custom auth for every agent integration |
| P2 | App developer | Receive an on-chain event when a capability is revoked | I stop accepting that agent's transactions immediately |

---

## 6. Non-Goals (v1)

- Cross-chain agent authorization (Sui only for now)
- KYC / AML compliance layer
- Agent-to-agent delegation (depth > 1)
- Mobile app
- Agent performance tracking or ranking
- Automated agent execution scheduling

---

## 7. Scope Constraints

- Must ship working testnet demo by Jun 18 (2 days buffer before Jun 20 deadline)
- Team: 2 Move engineers + 1 TypeScript + 1 frontend
- No external dependencies beyond Sui SDK, Walrus SDK, DeepBook SDK

---

## 8. Success Metrics (Hackathon)

| Metric | Target |
|--------|--------|
| Live testnet demo working | Yes |
| Capability issued + verified on-chain | Yes |
| Revocation blocks agent in real time | Yes |
| Walrus audit log browsable in UI | Yes |
| DeepBook authorization check wired | Yes |
| Tracks submitted | Agentic Web + Walrus + DeepBook |

---

## 9. Success Metrics (Post-Hackathon)

| Metric | 90-day target |
|--------|--------------|
| Sui apps integrating AgentPass SDK | 5 |
| Active capabilities issued | 1,000 |
| Walrus audit blobs written | 10,000 |
| SIP (Sui Improvement Proposal) submitted | Yes |

---

## 10. Open Questions

1. Should capability objects be transferable (user can reassign an agent) or soul-bound to issuer?
2. Should we support scope inheritance (parent cap → child cap with narrower scope)?
3. Gas sponsorship for agent verification calls — should AgentPass subsidize?
4. Should `$PASS` token be in scope for hackathon or post-hackathon?
