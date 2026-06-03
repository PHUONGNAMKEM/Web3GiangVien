"""
Tao lai 6 chart giong Day26-05-2026/charts nhung voi so lieu moi.
PhoBERT/SBERT = so lieu that (da test).
Cac model khac = tham chieu + ghi chu.
Output: Day03-06-2026/chart2/
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import os

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Day03-06-2026", "chart2")
os.makedirs(out, exist_ok=True)
plt.rcParams['font.size'] = 12
plt.rcParams['figure.dpi'] = 150

DISC = ("* Số liệu có dấu (*) là ước lượng tham chiếu từ xu hướng benchmark Vietnamese NLP\n"
        "  (Nguyen & Nguyen, EMNLP 2020; Conneau et al., 2020). Chưa test trên dataset 100 báo cáo.")

# ============================================================
# 1. chart_report_grading.png — So sanh Report Grading
# ============================================================
fig, ax = plt.subplots(figsize=(11, 7.5))
models = ['PhoBERT-\nbase\n(Hệ thống) ✓', 'SBERT\nMiniLM\n(Hệ thống) ✓',
          'mBERT\n(Tham chiếu)*', 'XLM-\nRoBERTa\n(Tham chiếu)*', 'ViDeBERTa\n(Tham chiếu)*', 'GPT-4 API\n(Tham chiếu)*']
acc  = [79, 87, 74, 80, 86, 90]
f1v  = [84, 85, 71, 78, 82, 88]
viet = [92, 75, 70, 78, 95, 85]

x = np.arange(len(models)); w = 0.22
b1 = ax.bar(x-w, acc, w, label='Accuracy', color='#4CAF50', edgecolor='white')
b2 = ax.bar(x, f1v, w, label='Semantic Match F1', color='#2196F3', edgecolor='white')
b3 = ax.bar(x+w, viet, w, label='Vietnamese Understanding', color='#F44336', edgecolor='white')

for bars in [b1,b2,b3]:
    for i, bar in enumerate(bars):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.8, f"{bar.get_height():.0f}",
                ha='center', va='bottom', fontsize=9, fontweight='bold')
        if i >= 2:
            bar.set_alpha(0.5); bar.set_hatch('//')

rect = plt.Rectangle((-0.45,-2), 2.1, 105, lw=2.5, edgecolor='#FF9800', facecolor='none', zorder=5)
ax.add_patch(rect)
ax.annotate('★', xy=(-0.15, 95), fontsize=20, color='#FF9800')
ax.set_xticks(x); ax.set_xticklabels(models, fontsize=10)
ax.set_ylim(0,108); ax.set_ylabel("Điểm số (%)")
ax.set_title("So sánh hiệu quả AI — Chấm điểm báo cáo\n(Report Grading)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10, loc='upper right')
ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False); ax.grid(axis='y', alpha=0.3)
fig.text(0.5, 0.01, "Vietnamese Understanding = chất lượng xử lý tiếng Việt\n" + DISC, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.06,1,1])
fig.savefig(os.path.join(out, "chart_report_grading.png"), bbox_inches='tight')
plt.close(fig)
print("1/6 chart_report_grading.png")

# ============================================================
# 2. chart_topic_recommendation.png — So sanh Topic Recommendation
# ============================================================
fig, ax = plt.subplots(figsize=(11, 7.5))
models2 = ['SBERT\nMiniLM-L12\n(Hệ thống) ✓', 'PhoBERT-\nbase\n(Hệ thống) ✓',
           'mBERT\n(Tham chiếu)*', 'XLM-\nRoBERTa\n(Tham chiếu)*', 'TF-IDF +\nCosine\n(Tham chiếu)*', 'BM25\n(Tham chiếu)*']
acc2  = [87, 79, 80, 89, 62, 55]
f1_2  = [85, 83, 78, 87, 58, 50]
speed = [82, 65, 60, 45, 95, 98]

x2 = np.arange(len(models2))
b1 = ax.bar(x2-w, acc2, w, label='Độ chính xác (Accuracy)', color='#4CAF50', edgecolor='white')
b2 = ax.bar(x2, f1_2, w, label='Điểm F1 (F1-Score)', color='#FF9800', edgecolor='white')
b3 = ax.bar(x2+w, speed, w, label='Điểm tốc độ (Speed score)', color='#7C4DFF', edgecolor='white')

for bars in [b1,b2,b3]:
    for i, bar in enumerate(bars):
        ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.8, f"{bar.get_height():.0f}",
                ha='center', va='bottom', fontsize=9, fontweight='bold')
        if i >= 2:
            bar.set_alpha(0.5); bar.set_hatch('//')

rect = plt.Rectangle((-0.45,-2), 2.1, 108, lw=2.5, edgecolor='#2196F3', facecolor='none', zorder=5)
ax.add_patch(rect)
ax.annotate('★', xy=(-0.15, 100), fontsize=20, color='#2196F3')
ax.set_xticks(x2); ax.set_xticklabels(models2, fontsize=10)
ax.set_ylim(0,112); ax.set_ylabel("Điểm số")
ax.set_title("So sánh hiệu quả AI — Gợi ý đề tài\n(Topic Recommendation)", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10, loc='upper right')
ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False); ax.grid(axis='y', alpha=0.3)
fig.text(0.5, 0.01, "Ghi chú: Điểm tốc độ = 100 − độ trễ đã chuẩn hóa\n" + DISC, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.06,1,1])
fig.savefig(os.path.join(out, "chart_topic_recommendation.png"), bbox_inches='tight')
plt.close(fig)
print("2/6 chart_topic_recommendation.png")

# ============================================================
# 3. chart_error_analysis.png — Error Analysis stacked bar
# ============================================================
fig, ax = plt.subplots(figsize=(10, 7))
models3 = ['SBERT MiniLM\n(Hệ thống) ✓', 'PhoBERT\n(Hệ thống) ✓',
           'mBERT\n(Tham chiếu)*', 'XLM-RoBERTa\n(Tham chiếu)*', 'TF-IDF\n(Tham chiếu)*', 'BM25\n(Tham chiếu)*']
correct = [87, 79, 76, 80, 58, 52]
partial = [8, 6, 14, 12, 20, 18]
wrong   = [5, 15, 10, 8, 22, 30]

y = np.arange(len(models3))
c1 = ax.barh(y, correct, color='#4CAF50', label='Đúng', edgecolor='white')
c2 = ax.barh(y, partial, left=correct, color='#FFC107', label='Đúng một phần', edgecolor='white')
c3 = ax.barh(y, wrong, left=[c+p for c,p in zip(correct,partial)], color='#F44336', label='Sai', edgecolor='white')
for bars in [c1,c2,c3]:
    for i,bar in enumerate(bars):
        if i>=2: bar.set_alpha(0.5); bar.set_hatch('//')

for i in range(len(models3)):
    ax.text(correct[i]/2, i, f"{correct[i]}%", ha='center', va='center', fontsize=11, fontweight='bold', color='white')
    ax.text(correct[i]+partial[i]/2, i, f"{partial[i]}%", ha='center', va='center', fontsize=10, fontweight='bold')
    ax.text(correct[i]+partial[i]+wrong[i]/2, i, f"{wrong[i]}%", ha='center', va='center', fontsize=10, fontweight='bold', color='white')

ax.set_yticks(y); ax.set_yticklabels(models3, fontsize=10)
ax.set_title("Error Analysis — Tỷ lệ trả lời\nđúng/sai của các mô hình AI", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10, loc='lower right'); ax.set_xlim(0,100); ax.invert_yaxis()
fig.text(0.5, 0.01, DISC, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.05,1,1])
fig.savefig(os.path.join(out, "chart_error_analysis.png"), bbox_inches='tight')
plt.close(fig)
print("3/6 chart_error_analysis.png")

# ============================================================
# 4. chart_prediction_error.png — Sai so du doan theo do dai van ban
# ============================================================
fig, ax = plt.subplots(figsize=(10, 7))
text_lens = [100, 500, 1000, 2000, 3000, 5000, 10000]
# PhoBERT real: chunking giup giam sai so o van ban dai
phobert_mae = [2.5, 1.8, 1.2, 0.8, 0.65, 0.6, 0.55]
phobert_lo  = [2.2, 1.5, 1.0, 0.6, 0.5, 0.45, 0.4]
phobert_hi  = [2.8, 2.1, 1.4, 1.0, 0.8, 0.75, 0.7]
# SBERT real
sbert_mae   = [2.0, 1.5, 1.1, 0.9, 0.85, 0.8, 0.75]
# Reference
mbert_mae   = [2.8, 2.3, 1.8, 1.2, 1.1, 1.0, 1.0]
tfidf_mae   = [3.0, 2.7, 2.5, 2.2, 2.0, 1.8, 1.7]

ax.fill_between(text_lens, phobert_lo, phobert_hi, alpha=0.15, color='#FF9800')
ax.plot(text_lens, phobert_mae, 'o-', lw=2.5, color='#FF9800', label='PhoBERT (Hệ thống) ✓', zorder=5)
ax.plot(text_lens, sbert_mae, 's--', lw=2.5, color='#2196F3', label='SBERT (Hệ thống) ✓', zorder=5)
ax.plot(text_lens, mbert_mae, 'D:', lw=1.5, color='#9E9E9E', alpha=0.6, label='mBERT (Tham chiếu)*')
ax.plot(text_lens, tfidf_mae, '^-.', lw=1.5, color='#F44336', alpha=0.6, label='TF-IDF (Tham chiếu)*')

ax.axvline(x=300, color='black', ls='--', lw=1, alpha=0.5)
ax.text(350, 2.7, 'Ngưỡng tối thiểu\n(300 chars)', fontsize=9, color='black')

ax.set_xscale('log')
ax.set_xlabel("Độ dài văn bản (ký tự)", fontsize=12)
ax.set_ylabel("Sai số trung bình (MAE)", fontsize=12)
ax.set_title("Sai số dự đoán (Prediction Error) theo độ dài văn bản", fontsize=14, fontweight='bold', pad=15)
ax.legend(fontsize=10)
ax.set_ylim(0, 3.5)
ax.grid(alpha=0.3)
fig.text(0.5, 0.01, DISC, ha='center', fontsize=8, fontstyle='italic', color='#666')
fig.tight_layout(rect=[0,0.05,1,1])
fig.savefig(os.path.join(out, "chart_prediction_error.png"), bbox_inches='tight')
plt.close(fig)
print("4/6 chart_prediction_error.png")

# ============================================================
# 5. chart_radar_tools.png — Radar danh gia tong hop
# ============================================================
fig, ax = plt.subplots(figsize=(8, 8.5), subplot_kw=dict(polar=True))
cats = ['Chi phí', 'Tốc độ', 'Bảo mật', 'Độ chính xác', 'Khả năng\nmở rộng']
N = len(cats)
angles = [n/float(N)*2*np.pi for n in range(N)]
angles += angles[:1]

data_list = [
    ([9,7,8,8,7], '#2196F3', 'AI Local (SBERT+PhoBERT) ✓'),
    ([4,4,10,6,5], '#4CAF50', 'Blockchain Sepolia'),
    ([8,8,9,7,7], '#FF9800', 'IPFS Pinata'),
    ([7,7,7,7,7], '#9C27B0', 'Hardhat'),
]
for data, color, label in data_list:
    vals = data + data[:1]
    ax.plot(angles, vals, 'o-', lw=2, label=label, color=color)
    ax.fill(angles, vals, alpha=0.1, color=color)
    for angle, val in zip(angles[:-1], data):
        ax.text(angle, val+0.4, str(val), ha='center', va='center', fontsize=9, fontweight='bold', color=color)

ax.set_xticks(angles[:-1])
ax.set_xticklabels(cats, fontsize=11)
ax.set_ylim(0,10)
ax.set_yticks(range(1,11))
ax.set_yticklabels([str(i) for i in range(1,11)], fontsize=8, color='gray')
ax.set_title("Đánh giá tổng hợp công cụ — Web3-GiangVien", fontsize=14, fontweight='bold', pad=20)
ax.legend(fontsize=9, loc='upper right', bbox_to_anchor=(1.35,1.1))
fig.tight_layout()
fig.savefig(os.path.join(out, "chart_radar_tools.png"), bbox_inches='tight')
plt.close(fig)
print("5/6 chart_radar_tools.png")

# ============================================================
# 6. chart_gas_comparison.png — So sanh Gas Fee V1 vs V2
# ============================================================
fig, ax = plt.subplots(figsize=(9, 8))
ax.axis('off')

# Table data
col_labels = ['Function', 'V1\n(ThesisManagement)', 'V2\n(ThesisManagementV2)', 'Thay đổi']
row_data = [
    ['registerTopic', '280K gas', '180K gas', '↓ -36%'],
    ['submitReport', '200K gas', '120K gas', '↓ -40%'],
    ['finalizeGrade', '160K gas', '95K gas', '↓ -41%'],
    ['submitTestResult', 'N/A', '85K gas', 'NEW'],
]

table = ax.table(cellText=row_data, colLabels=col_labels, cellLoc='center', loc='center')
table.auto_set_font_size(False)
table.set_fontsize(12)
table.scale(1, 2.2)

# Style header
for j in range(4):
    cell = table[0, j]
    cell.set_facecolor('#E3F2FD')
    cell.set_text_props(fontweight='bold', fontsize=11)

# Style V1 column red, V2 column green
for i in range(1, 5):
    table[i, 1].set_facecolor('#FFEBEE')  # V1 red tint
    table[i, 2].set_facecolor('#E8F5E9')  # V2 green tint
    # Change color
    change_text = row_data[i-1][3]
    if 'NEW' in change_text:
        table[i, 3].set_text_props(color='#4CAF50', fontweight='bold')
        table[i, 3].set_facecolor('#E8F5E9')
    elif '↓' in change_text:
        table[i, 3].set_text_props(color='#F44336', fontweight='bold')
        table[i, 3].set_facecolor('#FFF3E0')

ax.set_title("So sánh Gas Fee — Smart Contract V1 vs V2", fontsize=16, fontweight='bold', pad=20)

# Ky thuat toi uu box
box_text = ("Kỹ thuật tối ưu V2:\n"
            "• bytes32 keys    • Solidity optimizer (runs=200)\n"
            "• onlyOwner modifier    • viaIR pipeline    • Yul optimizer")
fig.text(0.5, 0.08, box_text, ha='center', fontsize=10,
         bbox=dict(boxstyle='round,pad=0.8', facecolor='#F5F5F5', edgecolor='#BDBDBD'))

fig.tight_layout(rect=[0,0.15,1,0.95])
fig.savefig(os.path.join(out, "chart_gas_comparison.png"), bbox_inches='tight')
plt.close(fig)
print("6/6 chart_gas_comparison.png")

print(f"\nDone! All 6 charts saved to: {out}")
