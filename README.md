# MPLADS Sentinel AI – Prototype

## Overview
A prototype that loads real MPLADS allocation data, computes explainable financial and performance risk scores for each MP, and shows the results in a dashboard.

## Tech Stack
- Backend: Python, FastAPI, Pandas, NumPy, scikit-learn
- Frontend: React + Vite
- Data: CSV-based offline processing in memory

## How it works
1. Load and clean the CSV data.
2. Add synthetic project-level spending and completion metrics.
3. Compare each MP to state peers using median/MAD thresholds.
4. Detect duplicate records with TF-IDF similarity.
5. Fuse three risk signals into a single score.
6. Expose the data through the FastAPI API.
7. Display the results on a React dashboard.

## Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python data_loader.py
python features.py
uvicorn main:app --reload
```

## Frontend setup
```bash
cd frontend
npm install
npm run dev
```

Then open the app at http://localhost:5173.

## API
- GET /api/mps
- GET /api/mps/{mp_name}/risk
- GET /api/dashboard/stats
- GET /api/states
- POST /api/feedback
