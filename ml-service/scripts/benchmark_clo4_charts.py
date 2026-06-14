# -*- coding: utf-8 -*-
"""
CLO4 — Sinh biểu đồ tổng hợp 4 chỉ số (Accuracy, Gas Fee, F1-Score, Throughput).
Đọc CLO4_AI_metrics.json + CLO4_Gas_metrics.json (đã đo thật) rồi vẽ PNG.
"""
import os, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO_ROOT, "Document", "Day13-06-2026", "CLO4_KiemThu")

ai = json.load(open(os.path.join(OUT, "CLO4_AI_metrics.json"), encoding="utf-8"))
gas = json.load(open(os.path.join(OUT, "CLO4_Gas_metrics.json"), encoding="utf-8"))

plt.rcParams.update({"font.size": 11, "axes.grid": True, "grid.alpha": 0.3})

# === 1. AI classification metrics ===
fig, ax = plt.subplots(figsize=(7, 4.5))
names = ["Accuracy", "Precision", "Recall", "F1-Score"]
vals = [ai["accuracy"]*100, ai["precision"]*100, ai["recall"]*100, ai["f1_score"]*100]
colors = ["#2563eb", "#7c3aed", "#059669", "#dc2626"]
bars = ax.bar(names, vals, color=colors)
for b, v in zip(bars, vals):
    ax.text(b.get_x()+b.get_width()/2, v+1, f"{v:.1f}%", ha="center", fontweight="bold")
ax.set_ylim(0, 105); ax.set_ylabel("%")
ax.set_title(f"CLO4 — Chỉ số phân loại mô hình AI ({ai['model'].split('/')[-1]}, n={ai['total_cases']})")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "clo4_ai_metrics.png"), dpi=130); plt.close(fig)

# === 2. Confusion matrix ===
c = ai["confusion"]
fig, ax = plt.subplots(figsize=(4.8, 4.2))
mat = np.array([[c["TP"], c["FN"]], [c["FP"], c["TN"]]])
im = ax.imshow(mat, cmap="Blues")
ax.set_xticks([0,1]); ax.set_xticklabels(["Pred MATCH","Pred MISMATCH"])
ax.set_yticks([0,1]); ax.set_yticklabels(["True MATCH","True MISMATCH"])
labels = [["TP","FN"],["FP","TN"]]
for i in range(2):
    for j in range(2):
        ax.text(j, i, f"{labels[i][j]}\n{mat[i,j]}", ha="center", va="center",
                fontsize=13, fontweight="bold",
                color="white" if mat[i,j] > mat.max()/2 else "black")
ax.set_title(f"Confusion Matrix (Acc={ai['accuracy']*100:.1f}%)")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "clo4_confusion.png"), dpi=130); plt.close(fig)

# === 3. Gas per function ===
fns = gas["functions"]
fig, ax = plt.subplots(figsize=(8.5, 4.6))
xn = [f["fn"] for f in fns]
gv = [f["gas_mean"] for f in fns]
bars = ax.bar(xn, gv, color="#0891b2")
for b, f in zip(bars, fns):
    ax.text(b.get_x()+b.get_width()/2, f["gas_mean"]+4000,
            f"{f['gas_mean']:,}\n~{round(f['fee_vnd_at_headline']):,}đ", ha="center", fontsize=8)
ax.set_ylabel("Gas units"); ax.set_ylim(0, max(gv)*1.25)
hg = gas["assumptions"]["headline_gas_price_gwei"]
ax.set_title(f"CLO4 — Gas Fee mỗi giao dịch on-chain (ThesisManagementV2) @ {hg} gwei")
plt.xticks(rotation=12, ha="right")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "clo4_gas.png"), dpi=130); plt.close(fig)

# === 4. Throughput (AI reports/min vs on-chain tx/s) ===
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.4))
ax1.bar(["AI chấm báo cáo"], [ai["throughput_reports_per_min"]], color="#16a34a", width=0.5)
ax1.text(0, ai["throughput_reports_per_min"], f"{ai['throughput_reports_per_min']}\nreports/phút",
         ha="center", va="bottom", fontweight="bold")
ax1.set_ylabel("reports / phút"); ax1.set_title("Throughput AI (PhoBERT, CPU)")
ax1.set_ylim(0, ai["throughput_reports_per_min"]*1.3)

tps = [f["tx_per_sec_onchain"] for f in fns]
ax2.bar([f["fn"] for f in fns], tps, color="#d97706")
for i, v in enumerate(tps):
    ax2.text(i, v, f"{v}", ha="center", va="bottom", fontsize=8)
bt = gas["assumptions"]["block_time_sec"]; bl = gas["assumptions"]["block_gas_limit"]
ax2.set_ylabel("tx / giây"); ax2.set_title(f"Throughput on-chain (block {bl//10**6}M gas / {bt}s)")
plt.setp(ax2.get_xticklabels(), rotation=15, ha="right", fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(OUT, "clo4_throughput.png"), dpi=130); plt.close(fig)

print("Charts saved to", OUT)
for p in ["clo4_ai_metrics.png","clo4_confusion.png","clo4_gas.png","clo4_throughput.png"]:
    print(" -", p)
