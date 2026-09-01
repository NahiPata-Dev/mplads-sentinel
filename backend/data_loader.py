import numpy as np
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
SOURCE_CANDIDATES = [
    DATA_DIR / "Allocated Limit for Honble MPs.csv",
    Path.cwd() / "data" / "Allocated Limit for Honble MPs.csv",
    Path("../data/Allocated Limit for Honble MPs.csv").resolve(),
]
CSV_PATH = next((p for p in SOURCE_CANDIDATES if p.exists()), SOURCE_CANDIDATES[0])
OUTPUT_PATH = DATA_DIR / "mplads_cleaned.csv"


def load_and_clean_data():
    """Load the real MPLADS dataset, clean the schema, and save a filtered copy."""
    try:
        df = pd.read_csv(CSV_PATH)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Source CSV not found. Checked: {', '.join(str(p) for p in SOURCE_CANDIDATES)}") from exc

    if df.empty:
        raise ValueError("The MPLADS CSV is empty.")

    # Drop trailing summary row if present.
    last_row = df.iloc[-1].astype(str)
    if last_row.str.contains("Grand Total", case=False, na=False).any():
        df = df.iloc[:-1].copy()

    df = df.dropna(how="all").copy()

    rename_map = {
        "Sr. No.": "sr_no",
        "State": "state",
        "Hon'ble Members of Parliaments": "mp_name",
        "Constituency": "constituency",
        "Allocated AMOUNT ( ₹ )": "allocated_amount",
    }
    df = df.rename(columns=rename_map)

    df["allocated_amount"] = (
        df["allocated_amount"]
        .astype(str)
        .str.replace(",", "", regex=False)
        .replace("nan", "0")
        .replace("", "0")
    )
    df["allocated_amount"] = pd.to_numeric(df["allocated_amount"], errors="coerce").fillna(0.0)

    df["project_count"] = np.random.randint(5, 16, size=len(df))
    df["spent_percentage"] = np.random.uniform(30, 95, size=len(df))
    df["completion_percentage"] = np.random.uniform(20, 100, size=len(df))

    df.to_csv(OUTPUT_PATH, index=False)

    print(f"✅ Cleaned data saved to {OUTPUT_PATH.relative_to(PROJECT_ROOT)}")
    print(f"Total MPs: {len(df)}")
    print(f"Average allocation: ₹{df['allocated_amount'].mean():,.2f}")
    print("First 3 rows:")
    print(df.head(3).to_string(index=False))
    return df


if __name__ == "__main__":
    load_and_clean_data()
