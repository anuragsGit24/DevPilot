import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import artifacts, health, projects
from app.core.config import get_settings
from app.schemas import ErrorBody, ErrorDetail, ErrorResponse


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title=get_settings().app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(artifacts.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "service": get_settings().app_name,
        "status": "ok",
        "docs": "/docs",
        "health": "/api/v1/health/live",
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    details = [
        ErrorDetail(
            field=".".join(str(item) for item in error["loc"]),
            issue=error["msg"],
        )
        for error in exc.errors()
    ]
    response = ErrorResponse(
        error=ErrorBody(
            code="VALIDATION_ERROR",
            message="Request could not be validated.",
            request_id=request_id,
            details=details,
        )
    )
    return JSONResponse(status_code=422, content=response.model_dump(mode="json"))


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = ErrorResponse(
        error=ErrorBody(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            request_id=request_id,
        )
    )
    return JSONResponse(status_code=exc.status_code, content=response.model_dump(mode="json"))
