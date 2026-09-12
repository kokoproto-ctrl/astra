# Round 2 — Expert repair review

The repaired oracle treats either `DENY` or `REQUIRE_APPROVAL` as safe for a changed action, while requiring no `ALLOW`. The regression suite also retains a valid exact-digest approved action, so the broker is not an always-deny façade.
