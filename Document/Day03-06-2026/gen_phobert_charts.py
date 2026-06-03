"""
Sinh cac chart phan tich PhoBERT Chunking 100 Cases
Output vao: Day03-06-2026/charts/
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import os

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Day03-06-2026", "charts")
os.makedirs(out_dir, exist_ok=True)

plt.rcParams['font.size'] = 13
plt.rcParams['figure.dpi'] = 150

# === DATA ===
TP, TN, FP, FN = 53, 26, 15, 6
accuracy = 79.0
precision = 77.94
recall = 89.83
f1 = 83.46

scores_match = [5.88,7.52,5.0,6.13,5.0,5.18,6.02,6.24,8.5,5.83,
    7.62,5.88,6.47,4.91,6.12,8.47,6.72,7.6,7.53,7.62,7.62,7.57,
    6.64,5.79,7.62,6.75,6.75,5.88,5.0,6.17,6.75,7.62,7.59,6.68,
    6.24,6.75,7.62,5.67,7.62,7.53,6.75,6.67,5.0,8.4,8.5,7.1,7.78,
    8.47,7.62,5.63,6.75,6.66,5.88,5.88,6.64,5.88,5.84,5.84,5.44]

scores_mismatch = [5.0,4.97,5.0,4.78,5.54,5.0,4.92,6.17,5.0,5.0,
    5.0,6.17,5.0,5.0,4.95,5.0,4.95,6.17,6.14,4.97,6.17,6.17,4.96,
    6.17,4.97,4.92,6.17,4.94,6.12,4.85,6.17,6.17,6.11,5.0,6.14,
    4.85,6.05,4.94,6.14,4.97,5.0]

# ==============================
# CHART 1: Confusion Matrix Heatmap
# ==============================
fig, ax = plt.subplots(figsize=(7,6))
cm = np.array([[TP, FN],[FP, TN]])
im = ax.imshow(cm, cmap='Blues', aspect='auto')
ax.set_xticks([0,1]); ax.set_yticks([0,1])
ax.set_xticklabels(['Predicted\nMATCH', 'Predicted\nMISMATCH'], fontsize=12)
ax.set_yticklabels(['Actual\nMATCH', 'Actual\nMISMATCH'], fontsize=12)
for i in range(2):
    for j in range(2):
        val = cm[i,j]
        label = [['TP','FN'],['FP','TN']][i][j]
        color = 'white' if val > 20 else 'black'
        ax.text(j,i,f"{label}\n{val}",ha='center',va='center',fontsize=18,fontweight='bold',color=color)
ax.set_title("Confusion Matrix — PhoBERT Chunking\n(100 Cases)", fontsize=15, fontweight='bold', pad=15)
fig.colorbar(im, ax=ax, shrink=0.8)
fig.tight_layout()
fig.savefig(os.path.join(out_dir, "chart_confusion_matrix.png"), bbox_inches='tight')
plt.close(fig)
print("1/5 chart_confusion_matrix.png")

# ==============================
# CHART 2: Accuracy/Precision/Recall/F1 Bar
# ==============================
fig, ax = plt.subplots(figsize=(8,6))
metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
values = [accuracy, precision, recall, f1]
colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63']
bars = ax.bar(metrics, values, color=colors, width=0.55, edgecolor='white', linewidth=1.5)
for bar, v in zip(bars, values):
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+1, f"{v:.1f}%",
            ha='center', va='bottom', fontsize=14, fontweight='bold')
ax.set_ylim(0,105)
ax.set_ylabel("Phần trăm (%)", fontsize=13)
ax.set_title("Hiệu suất PhoBERT Chunking — 100 Cases\n(Accuracy / Precision / Recall / F1)", fontsize=14, fontweight='bold', pad=15)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(out_dir, "chart_metrics_bar.png"), bbox_inches='tight')
plt.close(fig)
print("2/5 chart_metrics_bar.png")

# ==============================
# CHART 3: Score Distribution (Histogram)
# ==============================
fig, ax = plt.subplots(figsize=(9,6))
bins = np.arange(4.5, 9.5, 0.5)
ax.hist(scores_match, bins=bins, alpha=0.7, color='#4CAF50', label=f'MATCH (n={len(scores_match)})', edgecolor='white')
ax.hist(scores_mismatch, bins=bins, alpha=0.7, color='#F44336', label=f'MISMATCH (n={len(scores_mismatch)})', edgecolor='white')
ax.axvline(x=5.2, color='orange', linestyle='--', linewidth=2, label='Ngưỡng phân loại (~5.2)')
ax.set_xlabel("PhoBERT Score", fontsize=13)
ax.set_ylabel("Số lượng báo cáo", fontsize=13)
ax.set_title("Phân bố điểm PhoBERT — MATCH vs MISMATCH\n(100 Cases, Chunking)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=11, loc='upper right')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(out_dir, "chart_score_distribution.png"), bbox_inches='tight')
plt.close(fig)
print("3/5 chart_score_distribution.png")

# ==============================
# CHART 4: TP/TN/FP/FN Pie Chart
# ==============================
fig, ax = plt.subplots(figsize=(7,7))
labels = [f'TP (True Positive)\n{TP} cases', f'TN (True Negative)\n{TN} cases',
          f'FP (False Positive)\n{FP} cases', f'FN (False Negative)\n{FN} cases']
sizes = [TP, TN, FP, FN]
colors_pie = ['#4CAF50', '#2196F3', '#FF9800', '#F44336']
explode = (0.03, 0.03, 0.08, 0.08)
wedges, texts, autotexts = ax.pie(sizes, labels=labels, colors=colors_pie, explode=explode,
    autopct='%1.1f%%', startangle=90, textprops={'fontsize':11})
for at in autotexts:
    at.set_fontweight('bold')
    at.set_fontsize(13)
ax.set_title("Phân bố kết quả phân loại — PhoBERT Chunking\n(100 Cases)", fontsize=14, fontweight='bold', pad=15)
fig.tight_layout()
fig.savefig(os.path.join(out_dir, "chart_classification_pie.png"), bbox_inches='tight')
plt.close(fig)
print("4/5 chart_classification_pie.png")

# ==============================
# CHART 5: So sanh PhoBERT cu vs moi (20 cases vs 100 cases)
# ==============================
fig, ax = plt.subplots(figsize=(9,6))
x = np.arange(4)
width = 0.3

# Old (20 cases, 256 tokens only)
old_acc, old_prec, old_rec, old_f1 = 85.0, 81.8, 90.0, 85.7
# New (100 cases, chunking)
new_acc, new_prec, new_rec, new_f1 = 79.0, 77.94, 89.83, 83.46

bars1 = ax.bar(x - width/2, [old_acc, old_prec, old_rec, old_f1], width,
               label='Cũ: 256 tokens (20 cases)', color='#FF7043', edgecolor='white')
bars2 = ax.bar(x + width/2, [new_acc, new_prec, new_rec, new_f1], width,
               label='Mới: Chunking (100 cases)', color='#42A5F5', edgecolor='white')

for bar in bars1:
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.8,
            f"{bar.get_height():.1f}%", ha='center', va='bottom', fontsize=11, fontweight='bold', color='#D84315')
for bar in bars2:
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.8,
            f"{bar.get_height():.1f}%", ha='center', va='bottom', fontsize=11, fontweight='bold', color='#1565C0')

ax.set_xticks(x)
ax.set_xticklabels(['Accuracy', 'Precision', 'Recall', 'F1-Score'], fontsize=12)
ax.set_ylim(0, 105)
ax.set_ylabel("Phần trăm (%)", fontsize=13)
ax.set_title("So sánh PhoBERT: 256 tokens vs Chunking\n(20 Cases cũ vs 100 Cases mới)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=11, loc='upper right')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(out_dir, "chart_old_vs_new_comparison.png"), bbox_inches='tight')
plt.close(fig)
print("5/5 chart_old_vs_new_comparison.png")

print(f"\nDone! Charts saved to: {out_dir}")
