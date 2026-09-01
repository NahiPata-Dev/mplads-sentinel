from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
ENHANCED_PATH = DATA_DIR / "mplads_enhanced.csv"


def add_features(df):
    """Calculate peer-group median/MAD features and efficiency for each MP."""
    df = df.copy()

    state_stats = (
        df.groupby("state", as_index=False)["allocated_amount"]
        .agg(
            state_median="median",
            state_mad=lambda s: (s - s.median()).abs().median() or 1.0,
        )
    )

    df = df.merge(state_stats, on="state", how="left")
    df["state_mad"] = df["state_mad"].replace(0, 1.0)

    df["deviation_score"] = (df["allocated_amount"] - df["state_median"]) / df["state_mad"]
    df["is_high_spender"] = df["deviation_score"] > 2.0
    df["is_low_spender"] = df["deviation_score"] < -2.0

    spent = df["spent_percentage"].fillna(0)
    efficiency = np.where(
        spent > 0,
        (df["completion_percentage"] / 100) / (spent / 100),
        0,
    )
    df["efficiency_score"] = pd.Series(efficiency, index=df.index).clip(upper=2.0).fillna(0)

    df.to_csv(ENHANCED_PATH, index=False)

    print(f"High spenders: {int(df['is_high_spender'].sum())}")
    print(f"Low spenders: {int(df['is_low_spender'].sum())}")
    print(f"Average efficiency: {df['efficiency_score'].mean():.2f}")
    return df


if __name__ == "__main__":
    from data_loader import load_and_clean_data

    cleaned = load_and_clean_data()
    add_features(cleaned)
