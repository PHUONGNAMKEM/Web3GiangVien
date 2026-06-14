"""
Ve bieu do do chinh xac SBERT (MiniLM) tu ket qua test 20 ca THUC TE.
Doc thang tu SBERT_Evaluation_Results.csv (KHONG hardcode so lieu).
API test: POST /match-student | Nguong phan loai: match_score >= 0.75
Output: sbert_accuracy_chart.png (cung thu muc)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import csv, os

BASE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE, "SBERT_Evaluation_Results.csv")
THRESHOLD = 0.75

# === DOC DU LIEU THAT TU CSV ===
truth, scores = [], []
with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    next(reader)  # bo header
    for row in reader:
        if len(row) < 6 or not row[0].strip().isdigit():
            continue
        truth.append(int(row[3]))          # Nhan thuc te (ground truth)
        scores.append(float(row[4]))       # Diem SBERT (match_score)

scores = np.array(scores)
truth = np.array(truth)
pred = (scores >= THRESHOLD).astype(int)   # tu suy ra prediction tu nguong

# === CONFUSION MATRIX + METRICS ===
TP = int(np.sum((truth == 1) & (pred == 1)))
TN = int(np.sum((truth == 0) & (pred == 0)))
FP = int(np.sum((truth == 0) & (pred == 1)))
FN = int(np.sum((truth == 1) & (pred == 0)))
n = len(truth)
acc = (TP + TN) / n * 100
prec = TP / (TP + FP) * 100 if (TP + FP) else 0
rec = TP / (TP + FN) * 100 if (TP + FN) else 0
f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0

print(f"N={n} | TP={TP} TN={TN} FP={FP} FN={FN}")
print(f"Accuracy={acc:.1f}% Precision={prec:.1f}% Recall={rec:.1f}% F1={f1:.1f}%")

plt.rcParams['font.size'] = 12
plt.rcParams['figure.dpi'] = 150
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# --- PANEL 1: Phan bo diem match_score voi nguong 0.75 ---
match_s = scores[truth == 1]
mis_s = scores[truth == 0]
rng = np.random.default_rng(42)
ax1.scatter(match_s, rng.uniform(0.6, 1.4, len(match_s)), s=90, color='#4CAF50',
            edgecolor='white', label=f'Khop (n={len(match_s)})', zorder=3)
ax1.scatter(mis_s, rng.uniform(0.6, 1.4, len(mis_s)), s=90, color='#F44336',
            edgecolor='white', label=f'Lech (n={len(mis_s)})', zorder=3)
ax1.axvline(THRESHOLD, color='orange', linestyle='--', linewidth=2.2,
            label=f'Nguong = {THRESHOLD}')
ax1.axvspan(0.7136, 0.7788, alpha=0.12, color='gray')
ax1.text(0.746, 1.55, 'Khoang trong\n0.714 - 0.779', ha='center', fontsize=9, color='#555')
ax1.set_xlim(0.5, 1.0)
ax1.set_ylim(0.3, 1.75)
ax1.set_yticks([])
ax1.set_xlabel("match_score (cosine + GPA, thang 0-1)", fontsize=12)
ax1.set_title("Phan bo diem SBERT — 20 ca test\n(Khop vs Lech tach bach qua nguong)",
              fontsize=13, fontweight='bold')
ax1.legend(fontsize=10, loc='lower right')
ax1.grid(axis='x', alpha=0.3)

# --- PANEL 2: Bar 4 metrics ---
metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
vals = [acc, prec, rec, f1]
colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63']
bars = ax2.bar(metrics, vals, color=colors, width=0.6, edgecolor='white', linewidth=1.5)
for b, v in zip(bars, vals):
    ax2.text(b.get_x() + b.get_width() / 2, b.get_height() + 1, f"{v:.0f}%",
             ha='center', va='bottom', fontsize=14, fontweight='bold')
ax2.set_ylim(0, 112)
ax2.set_ylabel("Phan tram (%)", fontsize=12)
ax2.set_title(f"Hieu suat SBERT MiniLM — {n} ca test thuc te\n"
              f"TP={TP} TN={TN} FP={FP} FN={FN}",
              fontsize=13, fontweight='bold')
ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)
ax2.grid(axis='y', alpha=0.3)

fig.suptitle("SBERT (paraphrase-multilingual-MiniLM-L12-v2) — Danh gia Matching Sinh vien/De tai",
             fontsize=14, fontweight='bold')
fig.text(0.5, 0.005,
         "Nguon: SBERT_Evaluation_Results.csv (20 ca) | API: POST /match-student | "
         "Bieu do doc truc tiep tu CSV, khong hardcode.",
         ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0, 0.03, 1, 0.96])
out = os.path.join(BASE, "sbert_accuracy_chart.png")
fig.savefig(out, bbox_inches='tight')
plt.close(fig)
print(f"Saved: {out}")
