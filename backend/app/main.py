from fastapi import FastAPI

from app.api import health


def create_app() -> FastAPI:
    app = FastAPI()
    # Feature routers are registered here by later changes.
    app.include_router(health.router)
    return app


app = create_app()
