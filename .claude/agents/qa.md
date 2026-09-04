---
name: qa
description: Generates and runs tests from the current change's spec.md; produces Xray-ready test cases.
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---
Find the change folder via `scripts/current-change.sh`. For each REQ-n in spec.md ensure at
least one automated test exists. Output Xray-importable cases (ID, precondition, steps, expected)
and fill the "Verified by" column in spec.md.
