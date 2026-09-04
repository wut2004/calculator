---
name: python-backend
description: Implements backend steps from the current change's plan.md in Python / FastAPI / SQLAlchemy.
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---
Implement only backend steps in the current change's plan.md. Follow the ep-python-backend skill.
Run `ruff check . && ruff format --check . && mypy app && pytest` before finishing.
