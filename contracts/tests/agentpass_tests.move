#[test_only]
module agentpass::agentpass_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};

    use agentpass::registry::{Self, DelegationRegistry};
    use agentpass::capability::{Self, AgentCapability};
    use agentpass::verifier;

    const DELEGATOR: address = @0xA11CE;
    const AGENT: address = @0xB0B;
    const OTHER: address = @0xCAFE;

    // ── Helpers ───────────────────────────────────────────────────

    fun scope_trade(): String { string::utf8(b"trade:deepbook") }
    fun scope_stake(): String { string::utf8(b"stake:scallop") }

    fun two_scopes(): vector<String> {
        let mut v = vector::empty<String>();
        vector::push_back(&mut v, scope_trade());
        vector::push_back(&mut v, scope_stake());
        v
    }

    /// Start a scenario, publish (share) the registry, and return a clock fixed
    /// at `now_ms`. Leaves the scenario at the DELEGATOR's next tx.
    fun start(now_ms: u64): (Scenario, Clock) {
        let mut scenario = ts::begin(DELEGATOR);
        {
            registry::init_for_testing(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, DELEGATOR);
        let mut clk = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, now_ms);
        (scenario, clk)
    }

    // ── Test: issue → registry has it → not expired before expiry ─

    #[test]
    fun issue_registers_and_not_expired() {
        let now = 1_000;
        let expiry = 10_000;
        let (mut scenario, clk) = start(now);

        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg,
            AGENT,
            two_scopes(),
            1_000_000, // max_usdc
            true,      // leverage_allowed
            expiry,
            true,      // revocable
            &clk,
            ts::ctx(&mut scenario),
        );

        // registry tracks the capability for the agent
        assert!(registry::has_active_capability(&reg, AGENT), 100);
        let caps = registry::get_active_caps(&reg, AGENT);
        assert!(vector::length(&caps) == 1, 101);
        assert!(*vector::borrow(&caps, 0) == capability::id(&cap), 102);

        // not expired: clock (1_000) is before expiry (10_000)
        assert!(!capability::is_expired(&cap, &clk), 103);

        // accessor sanity
        assert!(capability::agent(&cap) == AGENT, 104);
        assert!(capability::delegator(&cap) == DELEGATOR, 105);
        assert!(capability::max_usdc(&cap) == 1_000_000, 106);
        assert!(capability::leverage_allowed(&cap), 107);

        // consume the cap (no `drop` ability) by transferring it to the delegator
        transfer::public_transfer(cap, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: expiry boundary — expired after expiry_ms ───────────

    #[test]
    fun expired_after_expiry() {
        let (mut scenario, mut clk) = start(5_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, false, 10_000, true, &clk,
            ts::ctx(&mut scenario),
        );

        assert!(!capability::is_expired(&cap, &clk), 200); // 5_000 < 10_000
        clock::set_for_testing(&mut clk, 10_001);
        assert!(capability::is_expired(&cap, &clk), 201);  // 10_001 > 10_000

        transfer::public_transfer(cap, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: verify valid scope + amount → true ──────────────────

    #[test]
    fun verify_valid_scope_and_amount() {
        let (mut scenario, clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 500, false, 0, true, &clk,
            ts::ctx(&mut scenario),
        );

        assert!(verifier::verify(&cap, scope_trade(), 100, &clk), 300);
        // amount exactly equal to max is allowed
        assert!(verifier::verify(&cap, scope_stake(), 500, &clk), 301);

        transfer::public_transfer(cap, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: verify wrong scope → false ──────────────────────────

    #[test]
    fun verify_wrong_scope() {
        let (mut scenario, clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, false, 0, true, &clk,
            ts::ctx(&mut scenario),
        );

        let wrong = string::utf8(b"lend:navi");
        assert!(!verifier::verify(&cap, wrong, 1, &clk), 400);

        transfer::public_transfer(cap, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: verify amount > max_usdc → false ────────────────────

    #[test]
    fun verify_amount_exceeds_max() {
        let (mut scenario, clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 500, false, 0, true, &clk,
            ts::ctx(&mut scenario),
        );

        // 501 > 500 → denied even though the scope is valid
        assert!(!verifier::verify(&cap, scope_trade(), 501, &clk), 500);

        transfer::public_transfer(cap, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: verify expired cap → false ──────────────────────────

    #[test]
    fun verify_expired_returns_false() {
        let (mut scenario, mut clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, false, 2_000, true, &clk,
            ts::ctx(&mut scenario),
        );

        clock::set_for_testing(&mut clk, 2_001); // past expiry
        // valid scope and amount, but expired → false
        assert!(!verifier::verify(&cap, scope_trade(), 1, &clk), 600);

        transfer::public_transfer(cap, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: verify_leverage honors flag and expiry ──────────────

    #[test]
    fun verify_leverage_paths() {
        let (mut scenario, mut clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);

        let cap_yes = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, true, 5_000, true, &clk,
            ts::ctx(&mut scenario),
        );
        assert!(verifier::verify_leverage(&cap_yes, &clk), 700);

        let cap_no = capability::issue_for_testing(
            &mut reg, OTHER, two_scopes(), 0, false, 5_000, true, &clk,
            ts::ctx(&mut scenario),
        );
        assert!(!verifier::verify_leverage(&cap_no, &clk), 701);

        // expired leverage cap → false even though leverage_allowed is true
        clock::set_for_testing(&mut clk, 5_001);
        assert!(!verifier::verify_leverage(&cap_yes, &clk), 702);

        transfer::public_transfer(cap_yes, DELEGATOR);
        transfer::public_transfer(cap_no, DELEGATOR);
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: revoke → registry no longer has it ──────────────────

    #[test]
    fun revoke_removes_from_registry() {
        let (mut scenario, clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, false, 0, true, &clk,
            ts::ctx(&mut scenario),
        );
        assert!(registry::has_active_capability(&reg, AGENT), 800);

        capability::revoke(&mut reg, cap, &clk, ts::ctx(&mut scenario));

        assert!(!registry::has_active_capability(&reg, AGENT), 801);
        assert!(vector::is_empty(&registry::get_active_caps(&reg, AGENT)), 802);

        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: revoke non-revocable cap → aborts ENotRevocable (0) ─

    #[test]
    #[expected_failure(abort_code = capability::ENotRevocable)]
    fun revoke_non_revocable_aborts() {
        let (mut scenario, clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, false, 0,
            false, // NOT revocable
            &clk, ts::ctx(&mut scenario),
        );

        // Should abort with ENotRevocable before any state change.
        capability::revoke(&mut reg, cap, &clk, ts::ctx(&mut scenario));

        // Unreachable cleanup (required by the type checker for the happy path).
        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }

    // ── Test: revoke by non-delegator → aborts ENotDelegator (1) ──

    #[test]
    #[expected_failure(abort_code = capability::ENotDelegator)]
    fun revoke_by_non_delegator_aborts() {
        let (mut scenario, clk) = start(1_000);
        let mut reg = ts::take_shared<DelegationRegistry>(&scenario);
        let cap = capability::issue_for_testing(
            &mut reg, AGENT, two_scopes(), 0, false, 0, true, &clk,
            ts::ctx(&mut scenario),
        );

        // Switch sender to a non-delegator and attempt revoke → ENotDelegator.
        ts::next_tx(&mut scenario, OTHER);
        capability::revoke(&mut reg, cap, &clk, ts::ctx(&mut scenario));

        ts::return_shared(reg);
        clock::destroy_for_testing(clk);
        ts::end(scenario);
    }
}
