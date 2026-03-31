from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyze import router as analyze_router
from routes.match import router as match_router


app = FastAPI(title="Web3 GiangVien ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(match_router)


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "models_loaded": True,
    }
