from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
def health() -> dict[str, str]:
    return {"status": "ok"}
