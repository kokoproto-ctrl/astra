# Round 2 — Expert repair

The repaired specification includes policy version binding, identity/confused-deputy checks, attenuation of delegation, committed-only recovery, idempotent provider-timeout reconciliation, exact UI/action digest matching, and append-only evidence. Every repaired threat has a matrix test and owner T0031. The suite additionally rejects `ALLOW` outcomes and any test permitting a side effect.
