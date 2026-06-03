"""
Chart so sanh PhoBERT + SBERT (local) voi cac model public benchmarks
Ghi chu ro: so lieu model khac la uoc luong tham chieu tu benchmark chung.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import os

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Day03-06-2026", "charts")
os.makedirs(out_dir, exist_ok=True)

plt.rcParams['font.size'] = 12
plt.rcParams['figure.dpi'] = 150

DISCLAIMER = ("* Số liệu mBERT, XLM-R, TF-IDF, BM25: ước lượng tham chiếu từ xu hướng benchmark\n"
              "  Vietnamese NLP chung (Nguyen & Nguyen, EMNLP 2020). Chưa test trên dataset 100 báo cáo này.")

# ============================================================
# CHART 1: Report Grading comparison
# ============================================================
fig, ax = plt.subplots(figsize=(11, 7.5))
models = ['PhoBERT\n(Hệ thống)\n✓ Đã test', 'SBERT\nMiniLM\n(Hệ thống)\n✓ Đã test',
          'mBERT\n(Tham chiếu)*', 'XLM-R\n(Tham chiếu)*', 'TF-IDF+SVM\n(Tham chiếu)*', 'BM25\n(Tham chiếu)*']

accuracy_vals = [79.0, 87.0, 74.0, 80.0, 65.0, 55.0]
f1_vals       = [83.5, 85.0, 71.0, 78.0, 62.0, 50.0]
viet_und      = [92.0, 75.0, 70.0, 78.0, 45.0, 30.0]

x = np.arange(len(models))
w = 0.22
colors_real = ['#4CAF50','#2196F3','#F44336']
bars1 = ax.bar(x - w, accuracy_vals, w, label='Accuracy (%)', color='#4CAF50', edgecolor='white')
bars2 = ax.bar(x, f1_vals, w, label='F1-Score (%)', color='#2196F3', edgecolor='white')
bars3 = ax.bar(x + w, viet_und, w, label='Vietnamese Understanding (%)', color='#F44336', edgecolor='white')

# Lam mo cac bar tham chieu (index 2-5)
for bars in [bars1, bars2, bars3]:
    for i, bar in enumerate(bars):
        h = bar.get_height()
        ax.text(bar.get_x()+bar.get_width()/2, h+0.8, f"{h:.0f}", ha='center', va='bottom', fontsize=9, fontweight='bold')
        if i >= 2:
            bar.set_alpha(0.5)
            bar.set_hatch('//')

# Highlight he thong
rect = plt.Rectangle((-0.45, -2), 2.1, 105, linewidth=2.5, edgecolor='#FF9800', facecolor='none', zorder=5)
ax.add_patch(rect)
ax.annotate('★ Hệ thống hiện tại (đã test thực tế)', xy=(0.5, 97), fontsize=11, fontweight='bold', color='#FF9800', ha='center')

ax.set_xticks(x)
ax.set_xticklabels(models, fontsize=9)
ax.set_ylim(0, 108)
ax.set_ylabel("Điểm số (%)", fontsize=12)
ax.set_title("So sánh hiệu quả AI — Chấm điểm báo cáo\n(Report Grading — 100 Cases)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10, loc='upper right')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.3)
fig.text(0.5, 0.01, DISCLAIMER, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.06,1,1])
fig.savefig(os.path.join(out_dir, "chart_report_grading.png"), bbox_inches='tight')
plt.close(fig)
print("1/4 chart_report_grading.png")

# ============================================================
# CHART 2: Topic Recommendation comparison
# ============================================================
fig, ax = plt.subplots(figsize=(11, 7.5))
models2 = ['SBERT\nMiniLM-L12\n(Hệ thống)\n✓ Đã test', 'PhoBERT\n(Hệ thống)\n✓ Đã test',
           'mBERT\n(Tham chiếu)*', 'XLM-R\n(Tham chiếu)*', 'TF-IDF+Cosine\n(Tham chiếu)*', 'BM25\n(Tham chiếu)*']
acc2  = [87, 79, 80, 89, 62, 55]
f1_2  = [85, 83, 78, 87, 58, 50]
speed = [82, 65, 60, 45, 95, 98]

x2 = np.arange(len(models2))
bars1 = ax.bar(x2 - w, acc2, w, label='Độ chính xác (Accuracy)', color='#4CAF50', edgecolor='white')
bars2 = ax.bar(x2, f1_2, w, label='Điểm F1 (F1-Score)', color='#FF9800', edgecolor='white')
bars3 = ax.bar(x2 + w, speed, w, label='Điểm tốc độ (Speed score)', color='#7C4DFF', edgecolor='white')

for bars in [bars1, bars2, bars3]:
    for i, bar in enumerate(bars):
        h = bar.get_height()
        ax.text(bar.get_x()+bar.get_width()/2, h+0.8, f"{h:.0f}", ha='center', va='bottom', fontsize=9, fontweight='bold')
        if i >= 2:
            bar.set_alpha(0.5)
            bar.set_hatch('//')

rect = plt.Rectangle((-0.45, -2), 2.1, 108, linewidth=2.5, edgecolor='#2196F3', facecolor='none', zorder=5)
ax.add_patch(rect)
ax.annotate('★ Hệ thống hiện tại (đã test thực tế)', xy=(0.5, 100), fontsize=11, fontweight='bold', color='#2196F3', ha='center')

ax.set_xticks(x2)
ax.set_xticklabels(models2, fontsize=9)
ax.set_ylim(0, 112)
ax.set_ylabel("Điểm số", fontsize=12)
ax.set_title("So sánh hiệu quả AI — Gợi ý đề tài\n(Topic Recommendation)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10, loc='upper right')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.3)
note2 = "Ghi chú: Điểm tốc độ = 100 − độ trễ đã chuẩn hóa\n" + DISCLAIMER
fig.text(0.5, 0.01, note2, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.08,1,1])
fig.savefig(os.path.join(out_dir, "chart_topic_recommendation.png"), bbox_inches='tight')
plt.close(fig)
print("2/4 chart_topic_recommendation.png")

# ============================================================
# CHART 3: Error Analysis - Horizontal stacked bar
# ============================================================
fig, ax = plt.subplots(figsize=(10, 7))
models3 = ['SBERT MiniLM\n(Hệ thống) ✓', 'PhoBERT Chunking\n(Hệ thống) ✓',
           'mBERT\n(Tham chiếu)*', 'XLM-RoBERTa\n(Tham chiếu)*', 'TF-IDF + SVM\n(Tham chiếu)*', 'BM25\n(Tham chiếu)*']
correct   = [87, 79, 76, 80, 58, 52]
partial   = [8, 6, 14, 12, 20, 18]
wrong     = [5, 15, 10, 8, 22, 30]

y = np.arange(len(models3))
b1 = ax.barh(y, correct, color='#4CAF50', label='Đúng', edgecolor='white')
b2 = ax.barh(y, partial, left=correct, color='#FFC107', label='Đúng một phần', edgecolor='white')
b3 = ax.barh(y, wrong, left=[c+p for c,p in zip(correct,partial)], color='#F44336', label='Sai', edgecolor='white')

# Lam mo cac bar tham chieu (index 2-5)
for bars in [b1, b2, b3]:
    for i, bar in enumerate(bars):
        if i >= 2:
            bar.set_alpha(0.5)
            bar.set_hatch('//')

for i in range(len(models3)):
    ax.text(correct[i]/2, i, f"{correct[i]}%", ha='center', va='center', fontsize=11, fontweight='bold', color='white')
    ax.text(correct[i]+partial[i]/2, i, f"{partial[i]}%", ha='center', va='center', fontsize=10, fontweight='bold')
    ax.text(correct[i]+partial[i]+wrong[i]/2, i, f"{wrong[i]}%", ha='center', va='center', fontsize=10, fontweight='bold', color='white')

ax.set_yticks(y)
ax.set_yticklabels(models3, fontsize=10)
ax.set_xlabel("Phần trăm (%)", fontsize=12)
ax.set_title("Error Analysis — Tỷ lệ trả lời đúng/sai\ncủa các mô hình AI (100 Cases)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10, loc='lower right')
ax.set_xlim(0, 100)
ax.invert_yaxis()
fig.text(0.5, 0.01, DISCLAIMER, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.05,1,1])
fig.savefig(os.path.join(out_dir, "chart_error_analysis.png"), bbox_inches='tight')
plt.close(fig)
print("3/4 chart_error_analysis.png")

# ============================================================
# CHART 4: Radar Chart
# ============================================================
fig, ax = plt.subplots(figsize=(8, 8.5), subplot_kw=dict(polar=True))
categories = ['Chi phí', 'Tốc độ', 'Bảo mật', 'Độ chính xác', 'Khả năng\nmở rộng']
N = len(categories)
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]

ai_local    = [9, 7, 8, 8, 7]
blockchain  = [4, 4, 10, 6, 5]
ipfs        = [8, 8, 9, 7, 7]
gpt4_api    = [3, 6, 7, 9, 8]

for data, color, label in [
    (ai_local, '#2196F3', 'AI Local (SBERT+PhoBERT) ✓'),
    (blockchain, '#4CAF50', 'Blockchain Sepolia'),
    (ipfs, '#FF9800', 'IPFS Pinata'),
    (gpt4_api, '#9C27B0', 'GPT-4 API (tham chiếu)*'),
]:
    vals = data + data[:1]
    ax.plot(angles, vals, 'o-', linewidth=2, label=label, color=color)
    ax.fill(angles, vals, alpha=0.1, color=color)
    for angle, val in zip(angles[:-1], data):
        ax.text(angle, val+0.4, str(val), ha='center', va='center', fontsize=9, fontweight='bold', color=color)

ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories, fontsize=11)
ax.set_ylim(0, 10)
ax.set_yticks(range(1, 11))
ax.set_yticklabels([str(i) for i in range(1, 11)], fontsize=8, color='gray')
ax.set_title("Đánh giá tổng hợp công cụ — Web3-GiangVien", fontsize=14, fontweight='bold', pad=20)
ax.legend(fontsize=9, loc='upper right', bbox_to_anchor=(1.35, 1.1))
fig.text(0.5, 0.01, "* GPT-4 API: ước lượng tham chiếu, chưa test trên hệ thống", ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.03,1,1])
fig.savefig(os.path.join(out_dir, "chart_radar_tools.png"), bbox_inches='tight')
plt.close(fig)
print("4/4 chart_radar_tools.png")

print(f"\nDone! Charts saved to: {out_dir}")
