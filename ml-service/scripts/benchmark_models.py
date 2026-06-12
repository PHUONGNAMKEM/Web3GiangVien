"""
Benchmark 3 mô hình embedding tiếng Việt cho bài toán "so tiêu chí rubric với đoạn báo cáo".
So sánh: PhoBERT-CLS (cách hệ thống đang dùng) vs 2 Vietnamese-SBERT.

Đo trên bộ dữ liệu có NHÃN VÀNG (gold): mỗi đoạn (chunk) thuộc đúng 1 tiêu chí.
- Separation  = mean_sim(liên quan) - mean_sim(không liên quan)  → càng cao càng phân biệt tốt
- ROC-AUC     = xếp hạng cặp liên quan trên cặp không liên quan   → 1.0 là hoàn hảo
- Top-1 acc   = với mỗi đoạn, model có gán similarity cao nhất cho ĐÚNG tiêu chí của nó không
- Range/Std   = độ giãn của similarity (PhoBERT hay bị dồn cục → range nhỏ)

Xuất: bảng markdown + 2 biểu đồ PNG vào Document/Day11-06-2026/.
"""
import os
import sys
import time
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.metrics import roc_auc_score
from sklearn.metrics.pairwise import cosine_similarity
from underthesea import word_tokenize

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'Document', 'Day11-06-2026')
OUT_DIR = os.path.abspath(OUT_DIR)

# ============ BỘ DỮ LIỆU CÓ NHÃN (domain Blockchain/AI, tiếng Việt) ============
CRITERIA = {
    "C1": "Cơ sở lý thuyết Blockchain và cơ chế đồng thuận",
    "C2": "Phân tích và lập trình Smart Contract bằng Solidity",
    "C3": "Ứng dụng sàn giao dịch phi tập trung DEX",
    "C4": "Bảo mật và kiểm thử hợp đồng thông minh",
    "C5": "Tích hợp AI và xử lý ngôn ngữ tự nhiên tiếng Việt",
}

# (đoạn báo cáo, tiêu chí đúng). None = đoạn lạc đề (không thuộc tiêu chí nào)
CHUNKS = [
    ("Blockchain là sổ cái phân tán, các khối được liên kết bằng hàm băm và xác thực qua cơ chế đồng thuận Proof of Work.", "C1"),
    ("Cơ chế đồng thuận Proof of Stake chọn người xác thực dựa trên lượng token đặt cọc, tiết kiệm năng lượng hơn đào coin.", "C1"),
    ("Hợp đồng thông minh được viết bằng ngôn ngữ Solidity, biên dịch thành bytecode và triển khai lên máy ảo Ethereum EVM.", "C2"),
    ("Hàm trong Solidity có thể khai báo payable để nhận Ether, sử dụng modifier để kiểm soát quyền truy cập.", "C2"),
    ("Sàn giao dịch phi tập trung DEX cho phép người dùng hoán đổi token trực tiếp qua bể thanh khoản mà không cần trung gian.", "C3"),
    ("Cơ chế tạo lập thị trường tự động AMM trên Uniswap dùng công thức tích số không đổi để định giá tài sản trên DEX.", "C3"),
    ("Lỗ hổng reentrancy cho phép kẻ tấn công gọi lại hàm rút tiền nhiều lần, cần dùng mẫu checks-effects-interactions để phòng tránh.", "C4"),
    ("Kiểm thử hợp đồng thông minh bằng Hardhat và Mocha giúp phát hiện lỗi bảo mật trước khi triển khai lên mạng chính.", "C4"),
    ("Mô hình PhoBERT được huấn luyện trên dữ liệu tiếng Việt để phân tích ngữ nghĩa và phân loại văn bản học thuật.", "C5"),
    ("Xử lý ngôn ngữ tự nhiên tiếng Việt cần tách từ chính xác do đặc thù âm tiết, sau đó nhúng câu thành vector để so sánh.", "C5"),
    # các đoạn lạc đề / nhiễu
    ("Em xin chân thành cảm ơn thầy cô đã tận tình hướng dẫn em hoàn thành đồ án này.", None),
    ("Tài liệu tham khảo gồm các sách giáo trình và bài báo khoa học được liệt kê ở phần cuối.", None),
    ("Đồ án được trình bày trong năm chương với bố cục rõ ràng và đầy đủ.", None),
]

MODELS = [
    {"key": "PhoBERT-CLS", "type": "phobert", "id": "vinai/phobert-base"},
    {"key": "vietnamese-sbert", "type": "sbert", "id": "keepitreal/vietnamese-sbert"},
    {"key": "bkai-bi-encoder", "type": "sbert", "id": "bkai-foundation-models/vietnamese-bi-encoder"},
]


def seg(text: str) -> str:
    """Tách từ tiếng Việt (giống tiền xử lý của hệ thống) — các model nền PhoBERT đều cần."""
    try:
        return word_tokenize(text, format="text")
    except Exception:
        return text


def embed_phobert(model_id, texts):
    import torch
    from transformers import AutoModel, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(model_id)
    mdl = AutoModel.from_pretrained(model_id)
    mdl.eval()
    vecs = []
    for t in texts:
        inp = tok(seg(t), return_tensors='pt', padding=True, truncation=True, max_length=256)
        with torch.no_grad():
            out = mdl(**inp)
        vecs.append(out.last_hidden_state[:, 0, :].squeeze(0).numpy())  # [CLS]
    return np.array(vecs)


def embed_sbert(model_id, texts):
    from sentence_transformers import SentenceTransformer
    mdl = SentenceTransformer(model_id)
    return mdl.encode([seg(t) for t in texts], convert_to_numpy=True, normalize_embeddings=False)


def evaluate(model_cfg):
    crit_keys = list(CRITERIA.keys())
    crit_texts = [CRITERIA[k] for k in crit_keys]
    chunk_texts = [c[0] for c in CHUNKS]
    chunk_gold = [c[1] for c in CHUNKS]

    t0 = time.time()
    if model_cfg["type"] == "phobert":
        crit_emb = embed_phobert(model_cfg["id"], crit_texts)
        chunk_emb = embed_phobert(model_cfg["id"], chunk_texts)
    else:
        crit_emb = embed_sbert(model_cfg["id"], crit_texts)
        chunk_emb = embed_sbert(model_cfg["id"], chunk_texts)
    elapsed = time.time() - t0

    # Ma trận similarity [criteria x chunks]
    sim = cosine_similarity(crit_emb, chunk_emb)

    pair_sims, pair_labels = [], []
    correct_top1, total_top1 = 0, 0
    for ci, ck in enumerate(crit_keys):
        for hj, gold in enumerate(chunk_gold):
            label = 1 if gold == ck else 0
            pair_sims.append(sim[ci, hj])
            pair_labels.append(label)

    # Top-1: với mỗi chunk có nhãn, tiêu chí nào similarity cao nhất
    for hj, gold in enumerate(chunk_gold):
        if gold is None:
            continue
        total_top1 += 1
        best_ci = int(np.argmax(sim[:, hj]))
        if crit_keys[best_ci] == gold:
            correct_top1 += 1

    pair_sims = np.array(pair_sims)
    pair_labels = np.array(pair_labels)
    rel = pair_sims[pair_labels == 1]
    irr = pair_sims[pair_labels == 0]

    return {
        "model": model_cfg["key"],
        "mean_rel": float(rel.mean()),
        "mean_irr": float(irr.mean()),
        "separation": float(rel.mean() - irr.mean()),
        "auc": float(roc_auc_score(pair_labels, pair_sims)),
        "top1": correct_top1 / max(1, total_top1),
        "range": float(pair_sims.max() - pair_sims.min()),
        "std": float(pair_sims.std()),
        "time": elapsed,
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []
    for m in MODELS:
        print(f"\n=== {m['key']} ({m['id']}) ===")
        try:
            r = evaluate(m)
            results.append(r)
            print(r)
        except Exception as e:
            print(f"LỖI {m['key']}: {e}")

    # ===== Bảng markdown =====
    lines = []
    lines.append("| Mô hình | Mean(liên quan) | Mean(không LQ) | Separation ↑ | ROC-AUC ↑ | Top-1 ↑ | Range ↑ | Std ↑ | Thời gian (s) |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for r in results:
        lines.append(f"| {r['model']} | {r['mean_rel']:.3f} | {r['mean_irr']:.3f} | "
                     f"{r['separation']:.3f} | {r['auc']:.3f} | {r['top1']:.2f} | "
                     f"{r['range']:.3f} | {r['std']:.3f} | {r['time']:.1f} |")
    table_md = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "benchmark_table.md"), "w", encoding="utf-8") as f:
        f.write("# Kết quả Benchmark 3 mô hình\n\n" + table_md + "\n")
    print("\n" + table_md)

    names = [r['model'] for r in results]
    colors = ['#EA4335', '#34A853', '#4285F4']

    # ===== Biểu đồ 1: AUC + Top-1 + Separation =====
    fig, ax = plt.subplots(figsize=(9, 5))
    x = np.arange(len(names))
    w = 0.25
    ax.bar(x - w, [r['auc'] for r in results], w, label='ROC-AUC', color='#4285F4')
    ax.bar(x, [r['top1'] for r in results], w, label='Top-1 Accuracy', color='#34A853')
    ax.bar(x + w, [r['separation'] for r in results], w, label='Separation', color='#FBBC05')
    ax.set_xticks(x); ax.set_xticklabels(names)
    ax.set_ylim(0, 1.05)
    ax.set_title('Hiệu quả phân biệt tiêu chí ↔ đoạn báo cáo (cao = tốt)')
    ax.legend(); ax.grid(axis='y', alpha=0.3)
    for i, r in enumerate(results):
        ax.text(i - w, r['auc'] + 0.02, f"{r['auc']:.2f}", ha='center', fontsize=8)
        ax.text(i, r['top1'] + 0.02, f"{r['top1']:.2f}", ha='center', fontsize=8)
        ax.text(i + w, r['separation'] + 0.02, f"{r['separation']:.2f}", ha='center', fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "benchmark_effectiveness.png"), dpi=130)

    # ===== Biểu đồ 2: Mean similarity liên quan vs không liên quan =====
    fig2, ax2 = plt.subplots(figsize=(9, 5))
    ax2.bar(x - 0.2, [r['mean_rel'] for r in results], 0.4, label='Cặp LIÊN QUAN', color='#34A853')
    ax2.bar(x + 0.2, [r['mean_irr'] for r in results], 0.4, label='Cặp KHÔNG liên quan', color='#EA4335')
    ax2.set_xticks(x); ax2.set_xticklabels(names)
    ax2.set_title('Similarity trung bình: cặp liên quan vs không liên quan\n(khoảng cách càng lớn càng phân biệt tốt)')
    ax2.legend(); ax2.grid(axis='y', alpha=0.3)
    for i, r in enumerate(results):
        ax2.text(i - 0.2, r['mean_rel'] + 0.01, f"{r['mean_rel']:.2f}", ha='center', fontsize=8)
        ax2.text(i + 0.2, r['mean_irr'] + 0.01, f"{r['mean_irr']:.2f}", ha='center', fontsize=8)
    fig2.tight_layout()
    fig2.savefig(os.path.join(OUT_DIR, "benchmark_similarity_gap.png"), dpi=130)

    print(f"\nĐã lưu: benchmark_table.md, benchmark_effectiveness.png, benchmark_similarity_gap.png trong {OUT_DIR}")


if __name__ == "__main__":
    main()
