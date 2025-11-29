import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
try:
    from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
    _motor_ok = True
    _motor_err = None
except Exception as _e:
    AsyncIOMotorClient = None  # type: ignore
    _motor_ok = False
    _motor_err = str(_e)

try:
    from bson import ObjectId  # type: ignore
    _bson_ok = True
except Exception:
    ObjectId = None  # type: ignore
    _bson_ok = False

def load_root_env():
    p = Path(__file__).resolve()
    for parent in [p.parent, *p.parents]:
        env = parent / ".env"
        if env.exists():
            load_dotenv(env)
            return str(env)
    return None


load_root_env()

app = FastAPI(title="resources-fastapi")
origins = [o.strip() for o in (os.getenv("CORS_ORIGIN") or "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/schoolreg")
if _motor_ok and AsyncIOMotorClient is not None:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.get_default_database()
else:
    client = None
    db = None
modules_coll = db.get_collection("learning_modules") if db is not None else None
PORT = int(os.getenv("RESOURCES_PORT", "5001"))


@app.get("/health")
async def health():
    try:
        if db is None:
            return {"status": "ok", "service": "resources-fastapi", "db": "not_connected", "motor_error": _motor_err}
        await db.command("ping")
        return {"status": "ok", "service": "resources-fastapi"}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}


@app.get("/resources")
async def list_resources():
    # TODO: implémenter requêtes MongoDB
    return []


def _serialize_module(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = str(doc.get("_id"))
    return d


@app.get("/modules")
async def list_modules(subject: Optional[str] = None, level: Optional[str] = None, isPublished: Optional[bool] = None):
    if modules_coll is None:
        return []
    filt: dict = {}
    if subject:
        filt["subject"] = subject
    if level:
        filt["level"] = level
    if isPublished is not None:
        filt["isPublished"] = isPublished
    cursor = modules_coll.find(filt).sort("createdAt", -1)
    docs = await cursor.to_list(length=200)
    return [_serialize_module(doc) for doc in docs]


@app.get("/modules/{module_id}")
async def get_module(module_id: str):
    if modules_coll is None or not _bson_ok:
        raise HTTPException(status_code=404, detail="Module not found")
    try:
        oid = ObjectId(module_id)  # type: ignore
    except Exception:
        raise HTTPException(status_code=404, detail="Module not found")
    doc = await modules_coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Module not found")
    return _serialize_module(doc)


def _validate_module_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")
    required = ["title", "description", "subject", "level", "duration"]
    for k in required:
        if k not in payload or payload[k] in (None, ""):
            raise HTTPException(status_code=400, detail=f"Missing field: {k}")
    try:
        payload["duration"] = int(payload["duration"])  # type: ignore
        if payload["duration"] < 0:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid duration")
    # Defaults
    if "objectives" not in payload or payload["objectives"] is None:
        payload["objectives"] = []
    if "prerequisites" not in payload or payload["prerequisites"] is None:
        payload["prerequisites"] = []
    if "resources" not in payload or payload["resources"] is None:
        payload["resources"] = []
    if "assessments" not in payload or payload["assessments"] is None:
        payload["assessments"] = []
    if "createdBy" not in payload or payload["createdBy"] in (None, ""):
        payload["createdBy"] = "system"
    if "isPublished" not in payload:
        payload["isPublished"] = False
    return payload


@app.post("/modules")
async def create_module(payload: dict = Body(...)):
    if modules_coll is None:
        raise HTTPException(status_code=503, detail="Database not available")
    data = _validate_module_payload(payload)
    from datetime import datetime
    now = datetime.utcnow()
    data["createdAt"], data["updatedAt"] = now, now
    res = await modules_coll.insert_one(data)
    doc = await modules_coll.find_one({"_id": res.inserted_id})
    return _serialize_module(doc)


@app.put("/modules/{module_id}")
async def update_module(module_id: str, payload: dict = Body(...)):
    if modules_coll is None or not _bson_ok:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        oid = ObjectId(module_id)  # type: ignore
    except Exception:
        raise HTTPException(status_code=404, detail="Module not found")
    allowed_keys = {"title","description","subject","level","duration","objectives","prerequisites","resources","assessments","createdBy","isPublished"}
    update_data = {k: v for k, v in (payload or {}).items() if k in allowed_keys}
    if "duration" in update_data:
        try:
            update_data["duration"] = int(update_data["duration"])  # type: ignore
            if update_data["duration"] < 0:
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid duration")
    from datetime import datetime
    update_data["updatedAt"] = datetime.utcnow()
    r = await modules_coll.update_one({"_id": oid}, {"$set": update_data})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    doc = await modules_coll.find_one({"_id": oid})
    return _serialize_module(doc)


@app.delete("/modules/{module_id}")
async def delete_module(module_id: str):
    if modules_coll is None or not _bson_ok:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        oid = ObjectId(module_id)  # type: ignore
    except Exception:
        raise HTTPException(status_code=404, detail="Module not found")
    r = await modules_coll.delete_one({"_id": oid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"deleted": True}


# Lancement recommandé:
#   uvicorn app.main:app --port %RESOURCES_PORT%

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("RESOURCES_PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
