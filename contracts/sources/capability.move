module agentpass::capability {
    use sui::clock::Clock;
    use sui::event;
    use std::string::String;

    use agentpass::registry::{Self, DelegationRegistry};
    use agentpass::events;

    // ── Object ──────────────────────────────────────────────────

    /// A scoped, revocable authorization granted by a `delegator` (user)
    /// to an `agent`. Held by the delegator; presented by apps to `verify`.
    public struct AgentCapability has key, store {
        id: UID,
        delegator: address,
        agent: address,
        scopes: vector<String>,
        max_usdc: u64,           // 0 = unlimited
        leverage_allowed: bool,
        expiry_ms: u64,          // 0 = no expiry
        issued_at_ms: u64,
        revocable: bool,
    }

    // ── Errors ───────────────────────────────────────────────────

    const ENotRevocable: u64 = 0;
    const ENotDelegator: u64 = 1;

    // ── Internal constructor ──────────────────────────────────────

    /// Build, register, and emit for a capability. Returns the object so the
    /// caller decides custody. Shared by the public and test-only entrypoints.
    fun new_cap(
        registry: &mut DelegationRegistry,
        agent: address,
        scopes: vector<String>,
        max_usdc: u64,
        leverage_allowed: bool,
        expiry_ms: u64,
        revocable: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): AgentCapability {
        let cap = AgentCapability {
            id: object::new(ctx),
            delegator: ctx.sender(),
            agent,
            scopes,
            max_usdc,
            leverage_allowed,
            expiry_ms,
            issued_at_ms: clock.timestamp_ms(),
            revocable,
        };

        let cap_id = object::id(&cap);
        registry::register(registry, cap.agent, cap_id);

        event::emit(events::new_capability_issued(
            cap_id,
            cap.delegator,
            cap.agent,
            cap.scopes,
            cap.expiry_ms,
            cap.issued_at_ms,
        ));

        cap
    }

    // ── Public functions ─────────────────────────────────────────

    /// Issue a revocable capability to `agent`, register it, emit the event,
    /// and transfer the object to the caller (the delegator).
    public fun issue(
        registry: &mut DelegationRegistry,
        agent: address,
        scopes: vector<String>,
        max_usdc: u64,
        leverage_allowed: bool,
        expiry_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let cap = new_cap(
            registry,
            agent,
            scopes,
            max_usdc,
            leverage_allowed,
            expiry_ms,
            true, // revocable
            clock,
            ctx,
        );
        transfer::public_transfer(cap, ctx.sender());
    }

    /// Revoke a capability: requires it be revocable and that the caller is the
    /// original delegator. Deregisters, emits the event, and destroys the object.
    public fun revoke(
        registry: &mut DelegationRegistry,
        cap: AgentCapability,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert!(cap.revocable, ENotRevocable);
        assert!(cap.delegator == ctx.sender(), ENotDelegator);

        let cap_id = object::id(&cap);
        let agent = cap.agent;

        registry::deregister(registry, agent, cap_id);

        event::emit(events::new_capability_revoked(
            cap_id,
            agent,
            clock.timestamp_ms(),
        ));

        let AgentCapability {
            id,
            delegator: _,
            agent: _,
            scopes: _,
            max_usdc: _,
            leverage_allowed: _,
            expiry_ms: _,
            issued_at_ms: _,
            revocable: _,
        } = cap;
        object::delete(id);
    }

    // ── Read ─────────────────────────────────────────────────────

    /// True if the capability has an expiry and the clock is past it.
    public fun is_expired(cap: &AgentCapability, clock: &Clock): bool {
        cap.expiry_ms != 0 && clock.timestamp_ms() > cap.expiry_ms
    }

    public fun id(cap: &AgentCapability): ID { object::id(cap) }
    public fun agent(cap: &AgentCapability): address { cap.agent }
    public fun delegator(cap: &AgentCapability): address { cap.delegator }
    public fun scopes(cap: &AgentCapability): &vector<String> { &cap.scopes }
    public fun max_usdc(cap: &AgentCapability): u64 { cap.max_usdc }
    public fun leverage_allowed(cap: &AgentCapability): bool { cap.leverage_allowed }
    public fun expiry_ms(cap: &AgentCapability): u64 { cap.expiry_ms }
    public fun revocable(cap: &AgentCapability): bool { cap.revocable }

    // ── Test-only ─────────────────────────────────────────────────

    #[test_only]
    /// Issue a capability with an explicit `revocable` flag and return it to the
    /// caller (instead of transferring), so tests can drive revoke / abort paths.
    public fun issue_for_testing(
        registry: &mut DelegationRegistry,
        agent: address,
        scopes: vector<String>,
        max_usdc: u64,
        leverage_allowed: bool,
        expiry_ms: u64,
        revocable: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): AgentCapability {
        new_cap(
            registry,
            agent,
            scopes,
            max_usdc,
            leverage_allowed,
            expiry_ms,
            revocable,
            clock,
            ctx,
        )
    }
}
