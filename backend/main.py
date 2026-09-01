import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_engines import (
    calculate_duplicate_risk,
    calculate_financial_risk,
    calculate_performance_risk,
    calculate_unified_risk,
)
from data_loader import load_and_clean_data
from features import add_features

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
ENHANCED_PATH = DATA_DIR / "mplads_enhanced.csv"

app = FastAPI(title="MPLADS Sentinel AI API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000").split(",")
    if origin.strip()
]
allow_origin_regex = os.getenv("CORS_ORIGIN_REGEX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

feedback_store: List[Dict[str, Any]] = []
app_df: pd.DataFrame = pd.DataFrame()


def _ensure_app_data():
    global app_df
    if not app_df.empty and "risk_level" in app_df.columns and "risk_score" in app_df.columns:
        return app_df

    try:
        if ENHANCED_PATH.exists():
            app_df = pd.read_csv(ENHANCED_PATH)
        else:
            cleaned = load_and_clean_data()
            app_df = add_features(cleaned)
    except Exception as exc:
        raise RuntimeError(f"Failed to initialize MPLADS data: {exc}") from exc

    if "risk_score" not in app_df.columns or "risk_level" not in app_df.columns:
        app_df = _build_risk_metadata(app_df)

    app_df.to_csv(ENHANCED_PATH, index=False)
    return app_df


def _build_risk_metadata(df: pd.DataFrame) -> pd.DataFrame:
    financial_scores, financial_explanations = calculate_financial_risk(df)
    duplicate_scores, duplicate_pairs = calculate_duplicate_risk(df)
    performance_scores, performance_explanations = calculate_performance_risk(df)
    final_scores, risk_levels, explanation_dicts = calculate_unified_risk(
        financial_scores,
        duplicate_scores,
        performance_scores,
    )

    duplicate_explanations = []
    pair_map = {}
    for left_name, right_name, similarity in duplicate_pairs:
        pair_map.setdefault(left_name, []).append((right_name, similarity))
        pair_map.setdefault(right_name, []).append((left_name, similarity))

    for idx, row in df.iterrows():
        name = str(row["mp_name"])
        matches = pair_map.get(name, [])
        if duplicate_scores[idx] > 0 and matches:
            match_text = ", ".join(
                f"{match_name} ({similarity})" for match_name, similarity in matches[:3]
            )
            duplicate_explanation = f"Duplicate risk detected: similar MP records found ({match_text})."
        else:
            duplicate_explanation = "No duplicate risk signal detected from name/constituency/state similarity."
        duplicate_explanations.append(duplicate_explanation)

    risk_explanations = []
    for i in range(len(df)):
        risk_explanations.append(
            {
                "financial": financial_explanations[i],
                "duplicate": duplicate_explanations[i],
                "performance": performance_explanations[i],
                "combined": (
                    f"Overall risk level {risk_levels[i]} from financial, duplicate, and performance indicators."
                ),
            }
        )

    df = df.copy()
    df["financial_risk"] = financial_scores
    df["duplicate_risk"] = duplicate_scores
    df["performance_risk"] = performance_scores
    df["risk_score"] = final_scores
    df["risk_level"] = risk_levels
    df["risk_explanation"] = risk_explanations
    df["explanation_summary"] = explanation_dicts
    return df


@app.on_event("startup")
def startup_event():
    _ensure_app_data()


class FeedbackPayload(BaseModel):
    mp_name: str
    label: str = Field(..., pattern="^(CONFIRMED|FALSE_ALARM)$")
    notes: Optional[str] = ""


@app.get("/")
def root():
    return {"message": "MPLADS Sentinel AI API"}


@app.get("/api/mps")
def get_mps(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    state: Optional[str] = None,
    risk_level: Optional[str] = None,
):
    _ensure_app_data()
    df = app_df.copy()
    if state:
        df = df[df["state"].str.contains(state, case=False, na=False)]
    if risk_level:
        df = df[df["risk_level"].fillna("GREEN").str.upper() == risk_level.upper()]

    total = len(df)
    page = df.iloc[skip : skip + limit]

    records = [
        {
            "mp_name": row["mp_name"],
            "state": row["state"],
            "constituency": row["constituency"],
            "allocated_amount": float(row["allocated_amount"]),
            "state_median": float(row.get("state_median", 0)),
            "state_mad": float(row.get("state_mad", 1.0)),
            "spent_percentage": float(row.get("spent_percentage", 0)),
            "completion_percentage": float(row.get("completion_percentage", 0)),
            "risk_score": float(row.get("risk_score", 0)),
            "risk_level": row.get("risk_level", "GREEN"),
            "financial_risk": int(row.get("financial_risk", 0)),
            "duplicate_risk": int(row.get("duplicate_risk", 0)),
            "performance_risk": int(row.get("performance_risk", 0)),
            "risk_explanation": row.get("risk_explanation", {}),
        }
        for _, row in page.iterrows()
    ]

    return {"mps": records, "total": total}


@app.get("/api/mps/{mp_name}/risk")
def get_mp_risk(mp_name: str):
    _ensure_app_data()
    normalized = mp_name.replace("%20", " ")
    match = app_df[app_df["mp_name"].astype(str).str.lower() == normalized.lower()]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"MP '{mp_name}' not found.")

    row = match.iloc[0]
    return {
        "mp_name": row["mp_name"],
        "state": row["state"],
        "constituency": row["constituency"],
        "allocated_amount": float(row["allocated_amount"]),
        "state_median": float(row.get("state_median", 0)),
        "state_mad": float(row.get("state_mad", 1.0)),
        "spent_percentage": float(row.get("spent_percentage", 0)),
        "completion_percentage": float(row.get("completion_percentage", 0)),
        "financial_risk": int(row.get("financial_risk", 0)),
        "duplicate_risk": int(row.get("duplicate_risk", 0)),
        "performance_risk": int(row.get("performance_risk", 0)),
        "risk_score": float(row.get("risk_score", 0)),
        "risk_level": row.get("risk_level", "GREEN"),
        "risk_explanation": row.get("risk_explanation", {}),
    }


@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    _ensure_app_data()
    df = app_df.copy()
    counts = df["risk_level"].fillna("GREEN").str.upper().value_counts().to_dict()

    return {
        "total_mp": int(len(df)),
        "red_count": int(counts.get("RED", 0)),
        "yellow_count": int(counts.get("YELLOW", 0)),
        "blue_count": int(counts.get("BLUE", 0)),
        "green_count": int(counts.get("GREEN", 0)),
        "avg_risk": float(df["risk_score"].mean()) if not df.empty else 0.0,
    }


@app.get("/api/states")
def get_states():
    _ensure_app_data()
    df = app_df.copy()
    grouped = (
        df.groupby("state", as_index=False)
        .agg(mp_count=("mp_name", "count"), avg_risk_score=("risk_score", "mean"))
        .sort_values("avg_risk_score", ascending=False)
    )
    return [
        {
            "state": row["state"],
            "mp_count": int(row["mp_count"]),
            "avg_risk_score": float(row["avg_risk_score"]),
        }
        for _, row in grouped.iterrows()
    ]


@app.post("/api/feedback")
def post_feedback(payload: FeedbackPayload):
    feedback_id = str(uuid.uuid4())
    record = {
        "feedback_id": feedback_id,
        "mp_name": payload.mp_name,
        "label": payload.label,
        "notes": payload.notes or "",
    }
    feedback_store.append(record)
    return {"status": "recorded", "feedback_id": feedback_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
