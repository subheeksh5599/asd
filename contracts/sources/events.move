module agentpass::events {
    use std::string::String;

    /// Emitted when a delegator issues a new capability to an agent.
    public struct CapabilityIssued has copy, drop {
        cap_id: ID,
        delegator: address,
        agent: address,
        scopes: vector<String>,
        expiry_ms: u64,
        timestamp_ms: u64,
    }

    /// Emitted when a capability is revoked and destroyed.
    public struct CapabilityRevoked has copy, drop {
        cap_id: ID,
        agent: address,
        timestamp_ms: u64,
    }

    /// Emitted every time an app verifies an agent action against a capability.
    /// `allowed` records the verdict so integrators have an on-chain audit trail.
    public struct AgentActionVerified has copy, drop {
        cap_id: ID,
        agent: address,
        scope_used: String,
        amount_usdc: u64,
        timestamp_ms: u64,
        allowed: bool,
    }

    // ── Package constructors ──────────────────────────────────────
    // Event structs have only `copy, drop` (no `store`), so they cannot be
    // built by field literal outside this module. These package-internal
    // constructors let capability.move and verifier.move emit them.

    public(package) fun new_capability_issued(
        cap_id: ID,
        delegator: address,
        agent: address,
        scopes: vector<String>,
        expiry_ms: u64,
        timestamp_ms: u64,
    ): CapabilityIssued {
        CapabilityIssued { cap_id, delegator, agent, scopes, expiry_ms, timestamp_ms }
    }

    public(package) fun new_capability_revoked(
        cap_id: ID,
        agent: address,
        timestamp_ms: u64,
    ): CapabilityRevoked {
        CapabilityRevoked { cap_id, agent, timestamp_ms }
    }

    public(package) fun new_agent_action_verified(
        cap_id: ID,
        agent: address,
        scope_used: String,
        amount_usdc: u64,
        timestamp_ms: u64,
        allowed: bool,
    ): AgentActionVerified {
        AgentActionVerified { cap_id, agent, scope_used, amount_usdc, timestamp_ms, allowed }
    }
}
