.PHONY: install run test lint typecheck
install:   ; pip install -e ".[dev]"
run:       ; uvicorn app.main:app --reload --port 8080
test:      ; pytest -q
lint:      ; ruff check . && ruff format --check .
typecheck: ; mypy app
