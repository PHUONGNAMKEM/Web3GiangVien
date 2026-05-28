import os
from fastapi import FastAPI, Request
from dotenv import load_dotenv

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from utils.log_config import setup_logging
from routes.analyze import router as analyze_router
from routes.match import router as match_router
from routes.compare_code import router as compare_code_router
from routes.extract_pdf import router as extract_pdf_router

# Khởi tạo logging cho ML Service
logger = setup_logging()

# Khởi tạo slowapi Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Web3 GiangVien ML Service", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration (whitelist origins from env)
ALLOWED_ORIGINS = os.getenv('BACKEND_URL', 'http://localhost:5000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-Internal-Token"],
)

# Internal Token verification middleware
INTERNAL_TOKEN = os.getenv('INTERNAL_TOKEN')

@app.middleware("http")
async def verify_internal_token(request: Request, call_next):
    path = request.url.path
    if path.startswith('/analyze') or path.startswith('/extract') or path.startswith('/match') or path.startswith('/compare-code'):
        token = request.headers.get('X-Internal-Token')
        if INTERNAL_TOKEN and token != INTERNAL_TOKEN:
            token_preview = (token[:4] + '****') if token else 'NONE'
            logger.warning(f"[SECURITY] Unauthorized access blocked | path={path} | token_preview={token_preview}")
            return JSONResponse(status_code=403, content={'detail': 'Unauthorized'})
    return await call_next(request)

app.include_router(analyze_router)
app.include_router(match_router)
app.include_router(compare_code_router)
app.include_router(extract_pdf_router)

logger.info("[SERVER] ML Service started | FastAPI ready with Rate Limiting & Auth")


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "models_loaded": True,
    }
