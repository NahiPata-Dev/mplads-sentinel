from typing import List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def calculate_financial_risk(df):
    """Assign financial risk based on deviation from state median and MAD."""
    scores: List[int] = []
    explanations: List[str] = []

    for _, row in df.iterrows():
        amount = float(row["allocated_amount"])
        median = float(row["state_median"])
        mad = float(row["state_mad"])

        if amount > median + 3 * mad:
            score = 80
            explanation = (
                f"Allocation is 3x above the state median threshold: "
                f"₹{amount:,.2f} > ₹{(median + 3 * mad):,.2f}."
            )
        elif amount > median + 2 * mad:
            score = 50
            explanation = (
                f"Allocation exceeds the state median by more than 2*MAD: "
                f"₹{amount:,.2f} > ₹{(median + 2 * mad):,.2f}."
            )
        else:
            score = 20
            explanation = (
                f"Allocation is within the expected state range around the median "
                f"₹{median:,.2f}."
            )

        scores.append(score)
        explanations.append(explanation)

    return scores, explanations


def calculate_duplicate_risk(df):
    """Detect approximate duplicate MPs using TF-IDF similarity on name/constituency/state."""
    if df.empty:
        return [], []

    texts = (
        df["mp_name"].fillna("").astype(str)
        + " "
        + df["constituency"].fillna("").astype(str)
        + " "
        + df["state"].fillna("").astype(str)
    ).tolist()

    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(texts)
    similarity = cosine_similarity(matrix)

    scores = [0 for _ in range(len(df))]
    matched_pairs: List[Tuple[str, str, float]] = []

    for i in range(len(df)):
        for j in range(i + 1, len(df)):
            sim = float(similarity[i, j])
            if sim > 0.85:
                scores[i] = 80
                scores[j] = 80
                matched_pairs.append(
                    (
                        str(df.iloc[i]["mp_name"]),
                        str(df.iloc[j]["mp_name"]),
                        round(sim, 3),
                    )
                )

    return scores, matched_pairs


def calculate_performance_risk(df):
    """Compute performance mismatch risk based on spending vs expected completion."""
    scores: List[int] = []
    explanations: List[str] = []

    for _, row in df.iterrows():
        amount = float(row["allocated_amount"])
        spent_pct = float(row["spent_percentage"])
        completion_pct = float(row["completion_percentage"])

        expected_spent = amount * (completion_pct / 100)
        actual_spent = amount * (spent_pct / 100)
        mismatch = actual_spent - expected_spent
        threshold_15 = 0.15 * amount
        threshold_30 = 0.30 * amount

        if mismatch > threshold_30:
            score = 80
            explanation = (
                f"Spending is materially higher than expected for the completion rate: "
                f"₹{actual_spent:,.2f} vs ₹{expected_spent:,.2f}."
            )
        elif mismatch > threshold_15:
            score = 50
            explanation = (
                f"Spending exceeds expected benchmarks moderately: "
                f"₹{actual_spent:,.2f} vs ₹{expected_spent:,.2f}."
            )
        else:
            score = 0
            explanation = (
                f"Spending is aligned with expected completion output: "
                f"₹{actual_spent:,.2f} vs ₹{expected_spent:,.2f}."
            )

        scores.append(score)
        explanations.append(explanation)

    return scores, explanations


def calculate_unified_risk(financial_scores, duplicate_scores, performance_scores):
    """Fuse the three risk components into a single risk score and label."""
    final_scores = []
    risk_levels = []
    explanation_dicts = []

    for financial, duplicate, performance in zip(financial_scores, duplicate_scores, performance_scores):
        final = (financial * 0.30 + duplicate * 0.20 + performance * 0.30 + 10) / 1.1
        final = max(0, min(100, final))

        if final >= 75:
            level = "RED"
        elif final >= 50:
            level = "YELLOW"
        elif final >= 25:
            level = "BLUE"
        else:
            level = "GREEN"

        final_scores.append(round(final, 2))
        risk_levels.append(level)
        explanation_dicts.append(
            {
                "financial": financial,
                "duplicate": duplicate,
                "performance": performance,
            }
        )

    return final_scores, risk_levels, explanation_dicts
