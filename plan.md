===============================================================================
MPLADS SENTINEL AI — PROTOTYPE BUILD PLAN
===============================================================================
### (Real MPLADS data, AI risk scores, working dashboard in 36 hours)

This is a start-to-finish plan for building a working prototype of the MPLADS
Sentinel AI platform. It focuses on loading real MPLADS allocation data,
computing explainable risk scores, and displaying them in a dashboard.

===============================================================================
1. WHAT YOU'RE BUILDING (PROTOTYPE FEATURE SET)
===============================================================================

- Load and clean real MPLADS allocation data (CSV with 540+ MPs)
- Generate simulated project-level data (spending, progress) to test the AI
- Compute financial anomaly risk by comparing each MP to state peers
  (Isolation Forest + Median Absolute Deviation)
- Compute duplicate detection risk using TF-IDF text similarity
- Compute performance mismatch risk (spending vs progress)
- Fuse into a unified 0-100 risk score per MP
- Serve via FastAPI REST API
- Display in a React dashboard with:
  - Stats cards (Total, RED, YELLOW, BLUE)
  - Sortable/filterable MP table
  - Drill-down modal showing WHY each MP was flagged
- No database needed (pandas DataFrames in memory)
- No external API calls (all offline, open-source)

===============================================================================
2. TOOLS TO INSTALL
===============================================================================

TOOL                    PURPOSE                          INSTALLATION
---------------------   -------------------------------  --------------------------------
Python 3.10+            Backend language                 python.org
VS Code                 IDE                              code.visualstudio.com
GitHub Copilot          AI pair-programmer               VS Code marketplace
Node.js (LTS) + npm     React frontend                   nodejs.org
Git + GitHub account    Version control                  git-scm.com
Postman (optional)      Test API endpoints               postman.com

PYTHON PACKAGES (install via pip):
- fastapi
- uvicorn
- pandas
- numpy
- scikit-learn
- xgboost
- shap
- geohash2
- python-multipart
- pydantic

FRONTEND PACKAGES (installed by npm):
- react, react-dom
- axios
- react-table
- recharts (optional)
- tailwindcss (optional)

NO SIGN-UPS, NO API KEYS, NO CLOUD SERVICES NEEDED.

===============================================================================
3. PROJECT STRUCTURE
===============================================================================

mplads-sentinel/
├── data/
│   └── Allocated Limit for Honble MPs.csv   # Your real MPLADS data
├── backend/
│   ├── data_loader.py          # Load & clean CSV, generate synthetic fields
│   ├── features.py             # Peer-group comparison features
│   ├── ai_engines.py           # Financial, duplicate, performance risk
│   ├── main.py                 # FastAPI app & endpoints
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main dashboard component
│   │   ├── components/
│   │   │   ├── StatsCards.js   # 4 stat cards
│   │   │   ├── RiskTable.js    # Sortable/filterable MP table
│   │   │   └── RiskModal.js    # Drill-down explanation modal
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js      # Optional
├── PLAN.md                     # This file
└── README.md                   # Brief project description

===============================================================================
4. PHASE-BY-PHASE BUILD PLAN
===============================================================================

------------------------------------------------------------------------------
PHASE 0 — SETUP & ENVIRONMENT (30 minutes)
------------------------------------------------------------------------------
GOAL: Python environment ready, dependencies installed, folders created.

STEPS:
1. Create project folder: mkdir mplads-sentinel && cd mplads-sentinel
2. Create folders: mkdir backend frontend data
3. Create Python virtual env: python -m venv venv
4. Activate it:
   - Windows: venv\Scripts\activate
   - Mac/Linux: source venv/bin/activate
5. Create backend/requirements.txt with the packages listed above
6. Run: pip install -r backend/requirements.txt
7. Place your CSV file into the data/ folder

CLAUDECODE PROMPT:
"Create a requirements.txt for a Python FastAPI project that uses pandas,
numpy, scikit-learn, xgboost, shap, and geohash2. Then give me the commands
to set up the virtual environment and folder structure. I'm on Windows."

CHECKPOINT:
- Virtual environment is activated
- All packages installed successfully
- CSV file is in data/ folder
- Run: pip list -> shows all installed packages

------------------------------------------------------------------------------
PHASE 1 — DATA LOADER (2 hours)
------------------------------------------------------------------------------
GOAL: Load real CSV, clean it, add synthetic project-level fields.

FILE: backend/data_loader.py

WHAT IT MUST DO:
- Read 'data/Allocated Limit for Honble MPs.csv' with pandas
- Skip the "Grand Total" row at the end
- Clean 'Allocated AMOUNT ( ₹ )' -> remove commas, convert to float,
  handle missing values (fill with 0)
- Add synthetic columns:
  - project_count: random integer 5-15 per MP
  - spent_percentage: random 30-95%
  - completion_percentage: random 20-100%
- Save enriched DataFrame to 'data/mplads_cleaned.csv'
- Print summary statistics

CLAUDECODE PROMPT:
"In a Python script backend/data_loader.py, write a function
load_and_clean_data() that:
1. Reads the CSV from 'data/Allocated Limit for Honble MPs.csv' using pandas.
2. Drops the last row (which contains 'Grand Total').
3. Renames columns to: sr_no, state, mp_name, constituency, allocated_amount.
4. Cleans allocated_amount by removing commas and converting to float.
   Fills missing with 0.
5. Adds synthetic columns for prototype:
   - project_count: random integer between 5 and 15
   - spent_percentage: random float between 30 and 95
   - completion_percentage: random float between 20 and 100
6. Saves the cleaned DataFrame to 'data/mplads_cleaned.csv'.
7. Prints: total MPs, average allocation, and first 3 rows.
8. Returns the DataFrame.
Add a if __name__ == '__main__': block that calls this function."

CHECKPOINT:
- Run: python backend/data_loader.py
- See: "✅ Cleaned data saved to data/mplads_cleaned.csv"
- Open the CSV and verify it has 540+ rows

------------------------------------------------------------------------------
PHASE 2 — FEATURE ENGINEERING (2 hours)
------------------------------------------------------------------------------
GOAL: Add comparison features for peer-group outlier detection.

FILE: backend/features.py

WHAT IT MUST DO:
- For each state, compute:
  - state_median = median allocation of all MPs in that state
  - state_mad = Median Absolute Deviation (robust spread measure)
- For each MP:
  - deviation_score = (allocation - state_median) / state_mad
  - is_high_spender = True if deviation_score > 2.0
  - is_low_spender = True if deviation_score < -2.0
  - efficiency_score = (completion% / 100) / (spent% / 100), cap at 2.0
- Return enhanced DataFrame
- Print high spenders, low spenders, average efficiency

CLAUDECODE PROMPT:
"In backend/features.py, write a function add_features(df) that takes the
cleaned DataFrame and:
1. Groups by 'state' and calculates median allocation (state_median) and
   Median Absolute Deviation (state_mad) for allocated_amount.
   If MAD is 0, set it to 1 to avoid division by zero.
2. Merges these back into the main DataFrame.
3. Calculates a 'deviation_score' = (allocated_amount - state_median) / state_mad.
4. Creates boolean columns 'is_high_spender' (deviation_score > 2) and
   'is_low_spender' (deviation_score < -2).
5. Calculates 'efficiency_score' = (completion_percentage / 100) /
   (spent_percentage / 100). Caps at 2.0. If spent_percentage is 0,
   sets efficiency_score to 0.
6. Saves the enhanced DataFrame to 'data/mplads_enhanced.csv'.
7. Prints the count of high spenders, low spenders, and average efficiency.
8. Returns the enhanced DataFrame."

CHECKPOINT:
- Run: python backend/features.py
- See: new columns added, stats printed
- Verify the CSV has extra columns

------------------------------------------------------------------------------
PHASE 3 — AI DETECTION ENGINES (4 hours)
------------------------------------------------------------------------------
GOAL: Build three risk detectors + a unified risk fuser.

FILE: backend/ai_engines.py

WHAT IT MUST DO:
1. FINANCIAL ANOMALY (calculate_financial_risk)
   - If allocation > median + 3*MAD -> risk=80
   - If allocation > median + 2*MAD -> risk=50
   - Else -> risk=20
   - Return scores + explanation strings

2. DUPLICATE RISK (calculate_duplicate_risk)
   - Combine mp_name + constituency + state into text
   - Use TfidfVectorizer to convert to vectors
   - Compute cosine similarity
   - If any pair > 0.85 -> flag both as duplicates
   - Risk = 80 if duplicate found, else 0
   - Return scores + matched pair list

3. PERFORMANCE RISK (calculate_performance_risk)
   - expected_spent = allocation * (completion% / 100)
   - actual_spent = allocation * (spent% / 100)
   - mismatch = actual_spent - expected_spent
   - If mismatch > 0.3 * allocation -> risk=80
   - If mismatch > 0.15 * allocation -> risk=50
   - Else -> risk=0
   - Return scores + explanations

4. UNIFIED RISK (calculate_unified_risk)
   - Weights: financial=0.30, duplicate=0.20, performance=0.30, base=10
   - final_score = (financial*0.30 + duplicate*0.20 + performance*0.30 + 10) / 1.1
   - Clip to 0-100
   - Risk levels: RED (>=75), YELLOW (>=50), BLUE (>=25), GREEN (<25)
   - Return final scores, levels, and contribution dict

CLAUDECODE PROMPTS (run one at a time):

PROMPT 1:
"In backend/ai_engines.py, write function calculate_financial_risk(df) that
uses state_median and state_mad to assign risk:
- 80 if allocation > median + 3*MAD
- 50 if allocation > median + 2*MAD
- 20 otherwise
Return a list of scores and a list of explanation strings."

PROMPT 2:
"In the same file, write calculate_duplicate_risk(df) that uses
TfidfVectorizer on mp_name+constituency+state, computes cosine similarity,
flags duplicates >0.85, and returns risk scores (80/0) and a list of
matched pairs."

PROMPT 3:
"In the same file, write calculate_performance_risk(df) that calculates
expected vs actual spend based on completion% and spent%, returns
risk (80/50/0) and explanation strings."

PROMPT 4:
"In the same file, write calculate_unified_risk(financial, duplicate,
performance) that combines them with weights 0.3, 0.2, 0.3, adds a base
of 10, divides by 1.1, assigns risk_level (RED/YELLOW/BLUE/GREEN), and
returns (final_scores, risk_levels, explanation_dicts)."

CHECKPOINT:
- All functions written without syntax errors
- Run a small test manually to verify outputs are 0-100

------------------------------------------------------------------------------
PHASE 4 — FASTAPI BACKEND (4 hours)
------------------------------------------------------------------------------
GOAL: Serve risk scores via REST endpoints.

FILE: backend/main.py

WHAT IT MUST DO:
- Load enhanced data from 'data/mplads_enhanced.csv'
- On startup, call all AI functions to pre-compute risk scores
- Add CORS middleware for localhost:3000
- Implement endpoints:
  - GET /api/mps -> paginated, filter by state and risk_level
  - GET /api/mps/{mp_name}/risk -> full breakdown + explanation
  - GET /api/dashboard/stats -> counts RED/YELLOW/BLUE/GREEN
  - GET /api/states -> aggregation per state
  - POST /api/feedback -> store officer feedback (in-memory list)

CLAUDECODE PROMPT:
"In backend/main.py, build a FastAPI application that:
1. Loads the enhanced DataFrame from 'data/mplads_enhanced.csv' on startup.
2. Calls the four AI functions from ai_engines to compute financial,
   duplicate, performance, and unified risk.
3. Adds these as new columns to the DataFrame.
4. Sets up CORS to allow requests from localhost:3000.
5. Implements:
   - GET /api/mps: query params skip, limit, state, risk_level ->
     returns paginated list
   - GET /api/mps/{mp_name}/risk: returns details + explanation dict
   - GET /api/dashboard/stats: returns counts per risk level and average
   - GET /api/states: returns state-level aggregations
   - POST /api/feedback: accepts JSON {mp_name, label, notes},
     stores in a list, returns success
Add proper error handling (404 if MP not found)."

CHECKPOINT:
- Run: uvicorn main:app --reload from backend/ folder
- Open: http://localhost:8000/docs
- See: all endpoints listed in Swagger UI
- Test /api/mps in browser -> get JSON response

------------------------------------------------------------------------------
PHASE 5 — REACT FRONTEND (6 hours)
------------------------------------------------------------------------------
GOAL: Clean dashboard with stats, table, and drill-down modal.

STEPS:
1. In frontend/ folder, run:
   npm create vite@latest . -- --template react
   npm install
   npm install axios react-table recharts

2. Delete all default files in src/

3. Build components using Copilot prompts below:

CLAUDECODE PROMPT (App.js):
"In frontend/src/App.js, build a React dashboard for MPLADS Sentinel AI that:
- Fetches stats from GET /api/dashboard/stats and displays 4 cards:
  Total MPs, RED, YELLOW, BLUE
- Fetches MP list from GET /api/mps (limit 100) and displays a sortable
  table with columns: MP Name, State, Constituency, Allocation, Risk Score,
  Risk Level
- Adds a dropdown filter for risk_level (ALL/RED/YELLOW/BLUE/GREEN) and
  a search box
- On clicking a row, opens a modal showing the full risk breakdown
  (financial, duplicate, performance scores) and the explanation strings
- Includes a 'Submit Feedback' button in the modal that sends
  POST /api/feedback with 'CONFIRMED' or 'FALSE_ALARM'
- Uses simple CSS to look professional"

CLAUDECODE PROMPT (RiskModal if needed):
"Create a modal component that displays the full risk explanation for an MP.
Show financial, duplicate, and performance scores individually, plus the
explanation text from the API. Include two buttons: 'Confirm' and
'False Alarm' that send feedback to the backend."

CHECKPOINT:
- Run: npm run dev in frontend/ folder
- Open: http://localhost:5173 (or 3000)
- See: dashboard with real data from your backend
- Click a row -> modal opens with explanations

------------------------------------------------------------------------------
PHASE 6 — INTEGRATION & POLISH (2 hours)
------------------------------------------------------------------------------
GOAL: End-to-end flow working, minor bug fixes.

TASKS:
- Ensure frontend fetches and displays risk explanations correctly
- Test feedback button -> check browser console for POST request
- Add loading spinner to frontend
- Add error message if backend is unreachable
- Update README.md with run instructions

CLAUDECODE PROMPT:
"Add a loading spinner to the React app while fetching data. Also add error
handling that displays a friendly message if the backend is not reachable.
Make sure the risk explanation modal works correctly."

CHECKPOINT:
- Full flow works: data -> AI scores -> API -> frontend -> modal
- Feedback button sends POST request
- App handles loading and error states gracefully

===============================================================================
5. SUGGESTED TIMELINE (36 HOURS)
===============================================================================

TIME SLOT        PHASE                    DELIVERABLE
---------------- ------------------------ ------------------------------------
Hour 0-1         Phase 0                  Environment, folders, deps installed
Hour 1-3         Phase 1                  Data loader works, cleaned CSV ready
Hour 3-5         Phase 2                  Feature engineering, enhanced CSV
Hour 5-9         Phase 3                  All 4 AI functions written & tested
Hour 9-13        Phase 4                  FastAPI app running, /docs shows all
Hour 13-19       Phase 5                  React dashboard up, stats & table
Hour 19-21       Phase 5 (cont.)          Drill-down modal + feedback button
Hour 21-24       Phase 6                  Polish, error handling, README
Hour 24-36       Buffer                   Debugging, demo video, presentation

===============================================================================
6. README TEMPLATE
===============================================================================

Copy this and fill in your details:

---
# MPLADS Sentinel AI – Prototype

## Overview
A 36-hour prototype that reads real MPLADS allocation data, computes an
explainable risk score (0-100) for each MP based on financial anomalies,
duplicate patterns, and performance mismatches, and displays it in a dashboard.

## How It Works
1. Loads 'Allocated Limit for Honble MPs.csv'
2. Adds synthetic project data to test the AI
3. Compares each MP to state peers using Median Absolute Deviation
4. Detects duplicates using TF-IDF text similarity
5. Fuses three risk components into one unified score
6. Serves results via FastAPI and displays them in a React dashboard

## Tech Stack
- Backend: Python, FastAPI, Pandas, scikit-learn
- Frontend: React, Axios, Tailwind CSS
- AI: Isolation Forest (conceptual), TF-IDF, statistical outlier detection

## Run It Locally
```bash
# Backend
cd backend
python data_loader.py
python features.py
uvicorn main:app --reload

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev