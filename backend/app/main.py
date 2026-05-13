import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import registros

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Índice de Flexibilidad Curricular API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(registros.router, prefix="/api/v1")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    fields = [f"{'.'.join(str(l) for l in e['loc'])} → {e['msg']}" for e in errors]
    logger.warning("422 Validation | %s %s | %s", request.method, request.url.path, " | ".join(fields))
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/health")
async def health():
    return {"status": "ok"}
