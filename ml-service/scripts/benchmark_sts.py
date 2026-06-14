"""
Benchmark KHÁCH QUAN các model embedding tiếng Việt trên tác vụ STS
(Semantic Textual Similarity) — ĐÚNG cơ chế hệ thống production đang dùng (cosine).

Vì sao STS hợp hơn AES essay-scoring cho dự án này:
- Hệ thống chấm bằng cosine(đoạn báo cáo, tiêu chí). STS đo CHÍNH cái đó:
  cho 2 câu + điểm tương đồng do NGƯỜI gán (0–5) → xem cosine của model có khớp người không.
- Đây là chuẩn vàng để đánh giá Sentence-Embedding (các paper SBERT đều report Spearman trên STS).

Dataset: doanhieung/vi-stsbenchmark (STS Benchmark dịch sang tiếng Việt)
- ~8.628 cặp câu | cột: sentence1, sentence2, score (0–5), split
- Điểm tương đồng là của NGƯỜI THẬT (từ STS-B gốc); câu tiếng Việt là dịch máy.

Quy trình (cho TỪNG model) — KHÔNG train, KHÔNG hồi quy (giống production):
  1. seg()          : tách từ tiếng Việt (underthesea) — các model nền PhoBERT đều cần.
  2. embed(s1), embed(s2)
  3. cosine(s1, s2) cho từng cặp
  4. So cosine với điểm-người bằng:
       - Spearman ↑ : chỉ số CHÍNH của STS (tương quan thứ hạng) — gần 1 là tốt
       - Pearson  ↑ : tương quan tuyến tính
       - MSE/MAE  ↓ : sai số sau khi đưa cosine về thang 0–5 (chỉ để tham khảo)

Output: bảng markdown + biểu đồ PNG vào Document/Day13-06-2026/.

CÁCH DÙNG:
  pip install datasets sentence-transformers underthesea
  python ml-service/scripts/benchmark_sts.py
  # tuỳ chọn: --split test (mặc định 'all' = dùng hết cho ổn định), --limit 2000 (chạy thử nhanh)
  # nếu không có mạng tải HF: --csv duong_dan.csv  (file có cột sentence1, sentence2, score)
"""
import os
import sys
import time
import argparse

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.stats import pearsonr, spearmanr
from sklearn.metrics.pairwise import cosine_similarity
from underthesea import word_tokenize

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Document', 'Day13-06-2026'))
HF_DATASET_CANDIDATES = ["doanhieung/vi-stsbenchmark", "doanhieung/stsbenchmark-sts-vi"]

MODELS = [
    {"key": "TF-IDF (baseline)", "type": "tfidf", "id": None},
    {"key": "PhoBERT-CLS (hiện tại)", "type": "phobert-cls", "id": "vinai/phobert-base"},
    {"key": "vietnamese-sbert", "type": "sbert", "id": "keepitreal/vietnamese-sbert"},
    {"key": "bkai-bi-encoder", "type": "sbert", "id": "bkai-foundation-models/vietnamese-bi-encoder"},
]


def seg(text: str) -> str:
    try:
        return word_tokenize(str(text or ""), format="text")
    except Exception:
        return str(text or "")


# ------------------- EMBEDDING (mỗi câu -> 1 vector) -------------------
def embed_tfidf(s1, s2):
    """Fit TF-IDF trên TẤT CẢ câu, rồi transform — baseline đếm từ."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    seg1 = [seg(s) for s in s1]
    seg2 = [seg(s) for s in s2]
    vec = TfidfVectorizer(max_features=8000)
    vec.fit(seg1 + seg2)
    return vec.transform(seg1).toarray(), vec.transform(seg2).toarray()


def _pho(model_id):
    import torch
    from transformers import AutoModel, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(model_id)
    mdl = AutoModel.from_pretrained(model_id)
    mdl.eval()
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    return tok, mdl.to(dev), dev


def embed_phobert_cls(model_id, sents):
    """[CLS], cắt 256 token — ĐÚNG cách hệ thống đang dùng. Câu STS ngắn nên 1 forward là đủ."""
    import torch
    tok, mdl, dev = _pho(model_id)
    out = []
    B = 32
    for i in range(0, len(sents), B):
        batch = [seg(s) for s in sents[i:i + B]]
        enc = tok(batch, return_tensors='pt', padding=True, truncation=True, max_length=256).to(dev)
        with torch.no_grad():
            o = mdl(**enc)
        out.append(o.last_hidden_state[:, 0, :].cpu().numpy())
    return np.vstack(out)


def embed_sbert(model_id, sents):
    from sentence_transformers import SentenceTransformer
    mdl = SentenceTransformer(model_id)
    return mdl.encode([seg(s) for s in sents], convert_to_numpy=True,
                      show_progress_bar=False, batch_size=64, normalize_embeddings=False)


def get_pair_embeddings(cfg, s1, s2):
    if cfg["type"] == "tfidf":
        return embed_tfidf(s1, s2)
    if cfg["type"] == "phobert-cls":
        return embed_phobert_cls(cfg["id"], s1), embed_phobert_cls(cfg["id"], s2)
    return embed_sbert(cfg["id"], s1), embed_sbert(cfg["id"], s2)


def row_cosine(a, b):
    """Cosine theo từng hàng (cặp i) — KHÔNG phải ma trận đầy đủ."""
    a = np.asarray(a, dtype=float); b = np.asarray(b, dtype=float)
    num = np.sum(a * b, axis=1)
    den = (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1))
    den[den == 0] = 1e-9
    return num / den


def evaluate(cfg, s1, s2, scores):
    t0 = time.time()
    e1, e2 = get_pair_embeddings(cfg, s1, s2)
    cos = row_cosine(e1, e2)                 # [-1, 1], thường [0, 1] với văn bản
    elapsed = time.time() - t0
    y = np.asarray(scores, dtype=float)

    pear = pearsonr(y, cos)[0]
    spear = spearmanr(y, cos)[0]
    # Đưa cosine về thang 0–5 để báo sai số tham khảo (clip âm về 0)
    pred5 = np.clip(cos, 0, 1) * 5.0
    mae = float(np.mean(np.abs(pred5 - y)))
    rmse = float(np.sqrt(np.mean((pred5 - y) ** 2)))
    return {"model": cfg["key"], "spearman": float(spear), "pearson": float(pear),
            "mae": mae, "rmse": rmse,
            "cos_mean": float(cos.mean()), "cos_std": float(cos.std()),
            "dim": e1.shape[1], "time": elapsed}


# ------------------- NẠP DỮ LIỆU -------------------
def load_from_hf(split, limit):
    from datasets import load_dataset
    last_err = None
    for ds_id in HF_DATASET_CANDIDATES:
        try:
            ds = load_dataset(ds_id, split="train")
            cols = ds.column_names
            sc = 'score' if 'score' in cols else ('similarity_score' if 'similarity_score' in cols else None)
            if sc is None:
                raise ValueError(f"Không thấy cột điểm trong {cols}")
            s1 = ds['sentence1']; s2 = ds['sentence2']; y = ds[sc]
            sp = ds['split'] if 'split' in cols else None
            if split != 'all' and sp is not None:
                idx = [i for i, v in enumerate(sp) if str(v).lower() == split]
                s1 = [s1[i] for i in idx]; s2 = [s2[i] for i in idx]; y = [y[i] for i in idx]
            print(f"[DATA] HF {ds_id} | split={split} | n={len(s1)} | "
                  f"score[min={min(y):g}, max={max(y):g}]")
            if limit and limit > 0:
                s1, s2, y = s1[:limit], s2[:limit], y[:limit]
            return list(s1), list(s2), list(y)
        except Exception as e:
            last_err = e
    raise SystemExit(f"Không tải được dataset từ HF ({last_err}).\n"
                     f"Cách khác: tải file CSV (cột sentence1,sentence2,score) rồi chạy --csv <file>.")


def load_from_csv(path, limit):
    import pandas as pd
    df = pd.read_csv(path)
    sc = 'score' if 'score' in df.columns else 'similarity_score'
    df = df[['sentence1', 'sentence2', sc]].dropna()
    if limit and limit > 0:
        df = df.head(limit)
    print(f"[DATA] CSV {os.path.basename(path)} | n={len(df)} | "
          f"score[min={df[sc].min():g}, max={df[sc].max():g}]")
    return df['sentence1'].tolist(), df['sentence2'].tolist(), df[sc].tolist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--split', default='all', choices=['all', 'train', 'dev', 'test'])
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--csv', default='')
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    if args.csv:
        s1, s2, y = load_from_csv(args.csv, args.limit)
    else:
        s1, s2, y = load_from_hf(args.split, args.limit)

    results = []
    for m in MODELS:
        print(f"\n=== {m['key']} ===")
        try:
            r = evaluate(m, s1, s2, y)
            results.append(r)
            print(f"  Spearman={r['spearman']:.4f} | Pearson={r['pearson']:.4f} | "
                  f"MAE={r['mae']:.3f} | RMSE={r['rmse']:.3f} | "
                  f"cos(mean={r['cos_mean']:.3f},std={r['cos_std']:.3f}) | {r['time']:.1f}s")
        except Exception as e:
            print(f"  LỖI {m['key']}: {e}")

    if not results:
        raise SystemExit("Không có kết quả.")

    # Spearman ×100 là cách report quen thuộc trong tài liệu STS
    lines = [
        "# Benchmark STS tiếng Việt — so sánh model trên điểm tương đồng do người gán",
        "",
        f"- Dataset: `vi-stsbenchmark` | split: **{args.split}** | số cặp: **{len(s1)}** | thang điểm: 0–5",
        "- Quy trình: embed 2 câu → cosine → so với điểm người (KHÔNG train — giống production).",
        "- **Spearman** là chỉ số chính của STS (đo model xếp hạng độ giống có khớp người không).",
        "",
        "| Mô hình | Spearman ↑ | Pearson ↑ | MAE ↓ | RMSE ↓ | cos mean | cos std | Chiều | Thời gian (s) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(f"| {r['model']} | {r['spearman']:.4f} | {r['pearson']:.4f} | "
                     f"{r['mae']:.3f} | {r['rmse']:.3f} | {r['cos_mean']:.3f} | {r['cos_std']:.3f} | "
                     f"{r['dim']} | {r['time']:.1f} |")
    best = max(results, key=lambda r: r['spearman'])
    lines += ["", f"**Model hiệu quả nhất (Spearman cao nhất): `{best['model']}`** "
                  f"(Spearman={best['spearman']:.4f} = {best['spearman']*100:.1f}/100, "
                  f"Pearson={best['pearson']:.4f}).", ""]
    table_md = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "benchmark_sts_table.md"), "w", encoding="utf-8") as f:
        f.write(table_md + "\n")
    print("\n" + table_md)

    # ===== Biểu đồ: Spearman + Pearson (cao = tốt) =====
    names = [r['model'] for r in results]
    x = np.arange(len(names))
    w = 0.38
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.bar(x - w / 2, [r['spearman'] for r in results], w, label='Spearman', color='#34A853')
    ax.bar(x + w / 2, [r['pearson'] for r in results], w, label='Pearson', color='#4285F4')
    ax.set_xticks(x); ax.set_xticklabels(names, rotation=12, ha='right')
    ax.set_ylim(0, 1.0)
    ax.set_title('Tương quan cosine ↔ điểm người (STS tiếng Việt) — cao = chấm sát người')
    ax.legend(); ax.grid(axis='y', alpha=0.3)
    for i, r in enumerate(results):
        ax.text(i - w / 2, max(r['spearman'], 0) + 0.01, f"{r['spearman']:.2f}", ha='center', fontsize=8)
        ax.text(i + w / 2, max(r['pearson'], 0) + 0.01, f"{r['pearson']:.2f}", ha='center', fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "benchmark_sts_correlation.png"), dpi=130)

    print(f"\nĐã lưu: benchmark_sts_table.md, benchmark_sts_correlation.png trong {OUT_DIR}")


if __name__ == "__main__":
    main()
