# Round 1 — Red Team report

The red-team review challenged the initial draft for incomplete treatment of (1) approval/UI mismatch, (2) confused deputy, (3) unsafe delegation, (4) stale-policy execution, (5) provider-timeout ambiguity, and (6) evidence deletion. These were material HIGH/CRITICAL gaps in a conceptual first pass.

Repair required: add THR-027 through THR-033, INV-021 and INV-022, and NEG-027 through NEG-033; bind all to an enforcement layer and make timeout/recovery fail closed. Open findings before repair: `OPEN_CRITICAL=3`, `OPEN_HIGH=3`.
