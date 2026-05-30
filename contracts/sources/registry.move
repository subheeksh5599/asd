module agentpass::registry {
    use sui::table::{Self, Table};

    // ── Object ───────────────────────────────────────────────────

    /// Shared registry mapping each agent address to the set of active
    /// capability IDs delegated to it. Shared so any app can read it.
    public struct DelegationRegistry has key {
        id: UID,
        // agent_address → active capability IDs
        active: Table<address, vector<ID>>,
    }

    // ── Init ─────────────────────────────────────────────────────

    /// Publishing the package creates and shares a single registry.
    fun init(ctx: &mut TxContext) {
        transfer::share_object(DelegationRegistry {
            id: object::new(ctx),
            active: table::new(ctx),
        });
    }

    // ── Write (called by capability.move) ────────────────────────

    /// Add `cap_id` to `agent`'s active list, creating the list if absent.
    public(package) fun register(
        registry: &mut DelegationRegistry,
        agent: address,
        cap_id: ID,
    ) {
        if (!table::contains(&registry.active, agent)) {
            table::add(&mut registry.active, agent, vector::empty());
        };
        let caps = table::borrow_mut(&mut registry.active, agent);
        vector::push_back(caps, cap_id);
    }

    /// Remove `cap_id` from `agent`'s active list. No-op if absent.
    public(package) fun deregister(
        registry: &mut DelegationRegistry,
        agent: address,
        cap_id: ID,
    ) {
        if (!table::contains(&registry.active, agent)) return;
        let caps = table::borrow_mut(&mut registry.active, agent);
        let (found, idx) = vector::index_of(caps, &cap_id);
        if (found) {
            vector::remove(caps, idx);
        };
    }

    // ── Read (public — any contract can call) ─────────────────────

    /// True if `agent` has at least one active capability.
    public fun has_active_capability(
        registry: &DelegationRegistry,
        agent: address,
    ): bool {
        table::contains(&registry.active, agent) &&
            !vector::is_empty(table::borrow(&registry.active, agent))
    }

    /// Returns a copy of `agent`'s active capability IDs (empty if none).
    public fun get_active_caps(
        registry: &DelegationRegistry,
        agent: address,
    ): vector<ID> {
        if (!table::contains(&registry.active, agent)) {
            return vector::empty()
        };
        *table::borrow(&registry.active, agent)
    }

    // ── Test-only ─────────────────────────────────────────────────

    #[test_only]
    /// Create and share a registry inside a test scenario.
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
