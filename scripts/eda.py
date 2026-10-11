"""Phase 2: exploratory data analysis. Run from project root: python scripts/eda.py"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "07_smart_campus_digital_twin.csv"
OUT = ROOT / "reports" / "eda"
TARGET = "Electricity_Consumption"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"])
    num = df.select_dtypes("number")

    print(f"Shape: {df.shape}\n\nDtypes:\n{df.dtypes.to_string()}")
    print(f"\nMissing values: {int(df.isna().sum().sum())} | Duplicates: {int(df.duplicated().sum())}")
    print(f"Unique Building_ID values: {df['Building_ID'].nunique()} (one per record)")
    print(f"\nSummary:\n{num.describe().T.round(2).to_string()}")
    by_type = df.groupby("Building_Type")[TARGET].agg(["count", "mean", "min", "max"]).round(1)
    by_hour = df.groupby("Hour")[TARGET].agg(["count", "mean"]).round(1)
    corr = num.corr()[TARGET].drop(TARGET).sort_values(ascending=False).round(3)
    print(f"\nBy building type:\n{by_type.to_string()}\n\nBy hour:\n{by_hour.to_string()}\n\nCorrelation with target:\n{corr.to_string()}")

    summary = {
        "shape": list(df.shape), "missing_values": int(df.isna().sum().sum()),
        "duplicates": int(df.duplicated().sum()),
        "by_building_type": by_type.reset_index().to_dict("records"),
        "by_hour": by_hour.reset_index().to_dict("records"),
        "correlation_with_target": corr.to_dict(),
    }
    (OUT / "eda_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    plt.figure(figsize=(6, 4)); df[TARGET].hist(bins=30)
    plt.title("Electricity consumption distribution (kWh, assumed)"); plt.xlabel(TARGET)
    plt.tight_layout(); plt.savefig(OUT / "distribution.png", dpi=120); plt.close()

    ax = by_type["mean"].plot.bar(figsize=(6, 4), rot=20, title="Mean consumption by building type")
    ax.set_ylabel("Mean " + TARGET); plt.tight_layout(); plt.savefig(OUT / "by_building_type.png", dpi=120); plt.close()

    ax = by_hour["mean"].plot(marker="o", figsize=(6, 4), title="Mean consumption by hour")
    ax.set_xlabel("Hour"); ax.set_ylabel("Mean " + TARGET); plt.tight_layout()
    plt.savefig(OUT / "by_hour.png", dpi=120); plt.close()

    plt.figure(figsize=(7, 6)); c = num.corr()
    plt.imshow(c, cmap="coolwarm", vmin=-1, vmax=1); plt.colorbar()
    plt.xticks(range(len(c)), c.columns, rotation=90); plt.yticks(range(len(c)), c.columns)
    plt.title("Correlation matrix"); plt.tight_layout(); plt.savefig(OUT / "correlation.png", dpi=120); plt.close()
    print(f"\nSaved summary + 4 charts to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
