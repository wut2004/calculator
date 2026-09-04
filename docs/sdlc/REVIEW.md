# Review policy

> Read by the review agent and by humans.

## Tiers
| Path pattern                   | Tier     | Agentic review | Human review        |
|--------------------------------|----------|----------------|---------------------|
| `**/auth/**`, `**/rbac/**`     | critical | required       | required (2 people) |
| `**/migrations/**`             | critical | required       | required            |
| `**/*_test.go`, `**/*.spec.ts` | low      | required       | optional            |
| `docs/sdlc/changes/**`         | low      | —              | approver named in file |
| everything else                | standard | required       | 1 person            |

## Agentic review checklist
- [ ] Every hunk in the diff maps to a step in the change's approved `plan.md`
- [ ] Every REQ-n touched has a passing test
- [ ] No secrets, no hard-coded env values
- [ ] `plan.md` "Institutional knowledge to update" section is done (or explicitly N/A)
- [ ] On merge, the change's artifacts are set to `status: done`

## Findings format
`[severity] file:line — issue — suggested fix`   (blocker | major | minor | nit)
