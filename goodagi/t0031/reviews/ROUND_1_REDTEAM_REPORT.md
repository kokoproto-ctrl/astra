# Round 1 — Red Team report

Finding: a changed action can be denied at capability validation before reaching approval verification. This is safe but the approval test incorrectly required only `REQUIRE_APPROVAL`; a malformed or out-of-scope changed action may correctly be `DENY`.

Repair: updated the test to require the normative property—changed digest/bound field can never become `ALLOW`—and retained a matching valid approval positive case. Open before repair: `OPEN_CRITICAL=0`, `OPEN_HIGH=1` (test-oracle precision). After repair, follow-up review required.
