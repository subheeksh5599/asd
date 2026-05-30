module agentpass::verifier {
    use sui::clock::Clock;
    use sui::event;
    use std::string::String;

    use agentpass::capability::{Self, AgentCapability};
    use agentpass::events;

    // ── Public verify — the function every Sui app calls ──────────

    /// Returns true if `cap` is unexpired, grants `required_scope`, and either
    /// has no USDC cap (`max_usdc == 0`) or `amount_usdc` is within the cap.
    /// Emits `AgentActionVerified` recording the verdict for on-chain audit.
    /// Any Sui contract integrating AgentPass calls this before executing
    /// agent actions.
    public fun verify(
        cap: &AgentCapability,
        required_scope: String,
        amount_usdc: u64,
        clock: &Clock,
    ): bool {
        let allowed = check(cap, &required_scope, amount_usdc, clock);

        event::emit(events::new_agent_action_verified(
            capability::id(cap),
            capability::agent(cap),
            required_scope,
            amount_usdc,
            clock.timestamp_ms(),
            allowed,
        ));

        allowed
    }

    /// Pure verdict computation, no side effects. Keeps `verify`'s emitted
    /// event and return value guaranteed identical.
    fun check(
        cap: &AgentCapability,
        required_scope: &String,
        amount_usdc: u64,
        clock: &Clock,
    ): bool {
        // expired
        if (capability::is_expired(cap, clock)) return false;

        // scope not granted
        let scopes = capability::scopes(cap);
        if (!vector::contains(scopes, required_scope)) return false;

        // exceeds max_usdc (0 means unlimited)
        let max = capability::max_usdc(cap);
        if (max != 0 && amount_usdc > max) return false;

        true
    }

    /// True if `cap` is unexpired and permits leverage. Emits the audit event
    /// with the leverage scope marker.
    public fun verify_leverage(cap: &AgentCapability, clock: &Clock): bool {
        let allowed = !capability::is_expired(cap, clock) && capability::leverage_allowed(cap);

        event::emit(events::new_agent_action_verified(
            capability::id(cap),
            capability::agent(cap),
            std::string::utf8(b"leverage"),
            0,
            clock.timestamp_ms(),
            allowed,
        ));

        allowed
    }
}
