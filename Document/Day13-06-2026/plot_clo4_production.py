import matplotlib.pyplot as plt
import numpy as np
import os

output_dir = os.path.dirname(__file__)

# 1. Bar chart for Metrics
labels = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
values = [62.00, 61.05, 98.31, 75.32]
colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B']

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(labels, values, color=colors)

for bar in bars:
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, yval + 1, f'{yval}%', ha='center', va='bottom', fontweight='bold')

ax.set_ylim(0, 110)
ax.set_ylabel('Percentage (%)')
ax.set_title('AI Model Metrics (Production Server) - Threshold > 5.0', pad=20)
ax.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'clo4_metrics_prod.png'), dpi=300)
plt.close()

# 2. Confusion Matrix
fig, ax = plt.subplots(figsize=(6, 5))
cax = ax.matshow([[58, 1], [37, 4]], cmap='Blues')
plt.colorbar(cax)

for (i, j), z in np.ndenumerate([[58, 1], [37, 4]]):
    ax.text(j, i, f'{z}', ha='center', va='center', fontsize=14, fontweight='bold',
            color='white' if z > 20 else 'black')

ax.set_xticklabels(['', 'Pred MATCH', 'Pred MISMATCH'])
ax.set_yticklabels(['', 'True MATCH', 'True MISMATCH'])
ax.set_title('Confusion Matrix (Threshold 5.0)', pad=20)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'clo4_confusion_prod.png'), dpi=300)
plt.close()

# 3. Response Time
labels = ['Min', 'Median (P50)', 'Average', 'P95', 'Max']
times = [5.9, 11.8, 12.0, 16.4, 20.5]

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(labels, times, marker='o', linestyle='-', color='#8B572A', linewidth=2, markersize=8)

for i, txt in enumerate(times):
    ax.annotate(f'{txt}s', (labels[i], times[i]), textcoords="offset points", xytext=(0,10), ha='center', fontweight='bold')

ax.set_ylim(0, 25)
ax.set_ylabel('Response Time (Seconds)')
ax.set_title('API Response Time on Production (100 Cases)', pad=20)
ax.grid(True, linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'clo4_throughput_prod.png'), dpi=300)
plt.close()

print("Charts generated successfully.")
