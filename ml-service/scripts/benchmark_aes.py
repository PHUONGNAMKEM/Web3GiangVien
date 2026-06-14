"""
Benchmark khách quan các mô hình embedding tiếng Việt cho bài toán CHẤM ĐIỂM
(Automated Essay Scoring), đo trên bộ dữ liệu CÓ ĐIỂM NGƯỜI CHẤM công khai.

Vì sao cách này đáng tin hơn benchmark cũ:
- benchmark cũ (match/mismatch) chỉ phân loại nhị phân do MÌNH tự dán nhãn → chủ quan.
- benchmark này dùng ĐIỂM NGƯỜI THẬT (gold score) có sẵn trong dataset → khách quan.
- Đo đúng cái cần: "embedding của model nào DỰ ĐOÁN SÁT điểm người nhất".

Quy trình (cho TỪNG model):
  1. seg()  : tách từ tiếng Việt (underthesea) — giống tiền xử lý production.
  2. embed(): biến mỗi bài văn -> 1 vector.
       - tfidf          : TF-IDF (baseline, không dùng deep learning)
       - phobert-cls    : vinai/phobert-base, lấy [CLS]  (ĐÚNG cách production đang dùng)
       - phobert-window : phobert-base + trượt cửa sổ 254 token rồi mean-pool
                          (ĐÚNG hàm _get_embedding trong phobert_analyzer.py)
       - sbert / bkai   : SentenceTransformer (đề xuất thay thế)
  3. Ridge regression + K-Fold cross-validation -> dự đoán điểm out-of-fold.
       (CV để không "học thuộc" — train 1 phần, đoán phần chưa thấy, lặp lại.)
  4. So điểm-DỰ-ĐOÁN với điểm-NGƯỜI bằng các chỉ số chuẩn AES:
       - QWK (Quadratic Weighted Kappa): chỉ số chính của AES, càng gần 1 càng tốt
       - Pearson / Spearman           : tương quan tuyến tính / thứ hạng
       - MAE / RMSE                   : sai số điểm trung bình (càng nhỏ càng tốt)

Output: bảng markdown + biểu đồ PNG vào Document/Day11-06-2026/.

CÁCH DÙNG:
  1. Tải dataset AES tiếng Việt (vd từ Kaggle) ra 1 file .csv
  2. Đặt đường dẫn vào CSV_PATH bên dưới (hoặc truyền --csv khi chạy)
  3. python ml-service/scripts/benchmark_aes.py --csv duong_dan.csv
  4. Nếu script không tự nhận ra cột, chỉ rõ: --text-col cot_bai_van --score-col cot_diem
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
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from scipy.stats import pearsonr, spearmanr
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.metrics import mean_absolute_error, mean_squared_error, cohen_kappa_score
from sklearn.feature_extraction.text import TfidfVectorizer
from underthesea import word_tokenize

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Document', 'Day11-06-2026'))

# ====== CẤU HÌNH (sửa ở đây HOẶC truyền qua tham số dòng lệnh) ======
CSV_PATH = ""            # đường dẫn file csv dataset (bắt buộc)
TEXT_COL = ""            # tên cột chứa bài văn (để trống = tự dò)
SCORE_COL = ""           # tên cột chứa điểm người chấm (để trống = tự dò)
SAMPLE_LIMIT = 0         # >0 để giới hạn số mẫu cho chạy thử nhanh (0 = dùng hết)
N_FOLDS = 5              # số fold cross-validation

# Các tên cột thường gặp để TỰ DÒ nếu người dùng không chỉ định
TEXT_COL_CANDIDATES = ['essay', 'text', 'content', 'bai_van', 'baiviet', 'noi_dung',
                       'noidung', 'body', 'document', 'van_ban', 'vanban', 'cau_tra_loi']
SCORE_COL_CANDIDATES = ['score', 'diem', 'label', 'target', 'rating', 'grade',
                        'final_score', 'diem_so', 'point', 'y']

MODELS = [
    {"key": "TF-IDF (baseline)", "type": "tfidf", "id": None},
    {"key": "PhoBERT-CLS (hiện tại)", "type": "phobert-cls", "id": "vinai/phobert-base"},
    {"key": "PhoBERT-window (production)", "type": "phobert-window", "id": "vinai/phobert-base"},
    {"key": "vietnamese-sbert", "type": "sbert", "id": "keepitreal/vietnamese-sbert"},
    {"key": "bkai-bi-encoder", "type": "sbert", "id": "bkai-foundation-models/vietnamese-bi-encoder"},
]


def seg(text: str) -> str:
    """Tách từ tiếng Việt — giống tiền xử lý của hệ thống thật."""
    try:
        return word_tokenize(str(text or ""), format="text")
    except Exception:
        return str(text or "")


# ------------------- CÁC HÀM EMBEDDING -------------------
def embed_tfidf(texts):
    """Baseline: vector hoá theo tần suất từ, không deep learning."""
    vec = TfidfVectorizer(max_features=5000)
    return vec.fit_transform([seg(t) for t in texts]).toarray()


def _load_phobert(model_id):
    import torch
    from transformers import AutoModel, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(model_id)
    mdl = AutoModel.from_pretrained(model_id)
    mdl.eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    mdl.to(device)
    return tok, mdl, device


def embed_phobert_cls(model_id, texts):
    """Lấy vector [CLS], cắt cứng 256 token — ĐÚNG cách hệ thống đang dùng."""
    import torch
    tok, mdl, device = _load_phobert(model_id)
    vecs = []
    for t in texts:
        inp = tok(seg(t), return_tensors='pt', padding=True, truncation=True, max_length=256).to(device)
        with torch.no_grad():
            out = mdl(**inp)
        vecs.append(out.last_hidden_state[:, 0, :].squeeze(0).cpu().numpy())
    return np.array(vecs)


def embed_phobert_window(model_id, texts, max_windows=12):
    """
    Trượt cửa sổ 254 token + mean-pool — ĐÚNG hàm _get_embedding của production
    (đọc hết bài văn dài thay vì cắt ở 256 token đầu).
    """
    import torch
    tok, mdl, device = _load_phobert(model_id)
    bos = tok.bos_token_id if tok.bos_token_id is not None else tok.cls_token_id
    eos = tok.eos_token_id if tok.eos_token_id is not None else tok.sep_token_id
    window = 254
    vecs = []
    for t in texts:
        ids = tok.encode(seg(t), add_special_tokens=False) or [tok.unk_token_id or 3]
        win_embs = []
        for start in range(0, len(ids), window):
            if len(win_embs) >= max_windows:
                break
            piece = [bos] + ids[start:start + window] + [eos]
            input_ids = torch.tensor([piece], device=device)
            attn = torch.ones_like(input_ids)
            with torch.no_grad():
                out = mdl(input_ids=input_ids, attention_mask=attn)
            win_embs.append(out.last_hidden_state[:, 0, :])
        vecs.append(torch.mean(torch.stack(win_embs, dim=0), dim=0).squeeze(0).cpu().numpy())
    return np.array(vecs)


def embed_sbert(model_id, texts):
    from sentence_transformers import SentenceTransformer
    mdl = SentenceTransformer(model_id)
    return mdl.encode([seg(t) for t in texts], convert_to_numpy=True,
                      show_progress_bar=False, normalize_embeddings=False)


def get_embeddings(cfg, texts):
    if cfg["type"] == "tfidf":
        return embed_tfidf(texts)
    if cfg["type"] == "phobert-cls":
        return embed_phobert_cls(cfg["id"], texts)
    if cfg["type"] == "phobert-window":
        return embed_phobert_window(cfg["id"], texts)
    return embed_sbert(cfg["id"], texts)


# ------------------- ĐO LƯỜNG -------------------
def quadratic_weighted_kappa(y_true, y_pred, min_r, max_r):
    """QWK — chỉ số chuẩn của AES. Làm tròn điểm về số nguyên trong [min,max]."""
    yt = np.clip(np.round(y_true), min_r, max_r).astype(int)
    yp = np.clip(np.round(y_pred), min_r, max_r).astype(int)
    labels = list(range(int(min_r), int(max_r) + 1))
    try:
        return cohen_kappa_score(yt, yp, weights='quadratic', labels=labels)
    except Exception:
        return float('nan')


def evaluate(cfg, texts, scores, min_r, max_r, n_folds):
    """Embed -> CV Ridge -> đoán điểm out-of-fold -> đo so với điểm người."""
    t0 = time.time()
    X = get_embeddings(cfg, texts)
    y = np.asarray(scores, dtype=float)

    # StandardScaler trước Ridge giúp ổn định với embedding nhiều chiều
    pipe = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
    kf = KFold(n_splits=n_folds, shuffle=True, random_state=42)
    y_pred = cross_val_predict(pipe, X, y, cv=kf)
    elapsed = time.time() - t0

    pear = pearsonr(y, y_pred)[0]
    spear = spearmanr(y, y_pred)[0]
    qwk = quadratic_weighted_kappa(y, y_pred, min_r, max_r)
    mae = mean_absolute_error(y, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
    return {
        "model": cfg["key"], "dim": X.shape[1],
        "pearson": float(pear), "spearman": float(spear), "qwk": float(qwk),
        "mae": float(mae), "rmse": float(rmse), "time": elapsed,
    }


# ------------------- NẠP DỮ LIỆU -------------------
def autodetect_col(df, candidates, kind):
    lower_map = {c.lower(): c for c in df.columns}
    for cand in candidates:
        if cand in lower_map:
            return lower_map[cand]
    # với cột điểm: thử cột số đầu tiên
    if kind == 'score':
        for c in df.columns:
            if pd.api.types.is_numeric_dtype(df[c]):
                return c
    # với cột text: thử cột chuỗi dài nhất trung bình
    if kind == 'text':
        best, best_len = None, -1
        for c in df.columns:
            if df[c].dtype == object:
                avg = df[c].astype(str).str.len().mean()
                if avg > best_len:
                    best, best_len = c, avg
        return best
    return None


def load_data(csv_path, text_col, score_col, limit):
    df = pd.read_csv(csv_path)
    if not text_col:
        text_col = autodetect_col(df, TEXT_COL_CANDIDATES, 'text')
    if not score_col:
        score_col = autodetect_col(df, SCORE_COL_CANDIDATES, 'score')
    if not text_col or not score_col:
        raise SystemExit(
            f"Không tự nhận ra cột. Các cột có trong file: {list(df.columns)}\n"
            f"Hãy chạy lại với --text-col <ten_cot_bai_van> --score-col <ten_cot_diem>"
        )
    df = df[[text_col, score_col]].dropna()
    df = df[df[text_col].astype(str).str.len() > 20]   # bỏ bài rỗng/quá ngắn
    df[score_col] = pd.to_numeric(df[score_col], errors='coerce')
    df = df.dropna()
    if limit and limit > 0:
        df = df.sample(n=min(limit, len(df)), random_state=42)
    print(f"[DATA] file={os.path.basename(csv_path)} | text_col='{text_col}' | "
          f"score_col='{score_col}' | n={len(df)} | "
          f"score[min={df[score_col].min()}, max={df[score_col].max()}]")
    return df[text_col].tolist(), df[score_col].tolist()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', default=CSV_PATH)
    ap.add_argument('--text-col', default=TEXT_COL)
    ap.add_argument('--score-col', default=SCORE_COL)
    ap.add_argument('--limit', type=int, default=SAMPLE_LIMIT)
    ap.add_argument('--folds', type=int, default=N_FOLDS)
    args = ap.parse_args()

    if not args.csv:
        raise SystemExit("Thiếu đường dẫn dataset. Dùng: --csv <file.csv> "
                         "(hoặc sửa CSV_PATH trong file).")

    os.makedirs(OUT_DIR, exist_ok=True)
    texts, scores = load_data(args.csv, args.text_col, args.score_col, args.limit)
    min_r, max_r = float(np.min(scores)), float(np.max(scores))

    results = []
    for m in MODELS:
        print(f"\n=== {m['key']} ===")
        try:
            r = evaluate(m, texts, scores, min_r, max_r, args.folds)
            results.append(r)
            print(f"  Pearson={r['pearson']:.3f} | Spearman={r['spearman']:.3f} | "
                  f"QWK={r['qwk']:.3f} | MAE={r['mae']:.3f} | RMSE={r['rmse']:.3f} | "
                  f"dim={r['dim']} | {r['time']:.1f}s")
        except Exception as e:
            print(f"  LỖI {m['key']}: {e}")

    if not results:
        raise SystemExit("Không có kết quả nào — kiểm tra dataset/model.")

    # ===== Bảng markdown =====
    lines = [
        f"# Benchmark AES — so sánh model trên điểm người chấm",
        "",
        f"- Dataset: `{os.path.basename(args.csv)}` | số mẫu: **{len(texts)}** | "
        f"thang điểm: {min_r:g}–{max_r:g} | CV: {args.folds}-fold",
        "- Quy trình: embedding → Ridge regression (cross-validation) → so với điểm người.",
        "",
        "| Mô hình | Pearson ↑ | Spearman ↑ | QWK ↑ | MAE ↓ | RMSE ↓ | Chiều | Thời gian (s) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(f"| {r['model']} | {r['pearson']:.3f} | {r['spearman']:.3f} | "
                     f"{r['qwk']:.3f} | {r['mae']:.3f} | {r['rmse']:.3f} | {r['dim']} | {r['time']:.1f} |")
    best = max(results, key=lambda r: (r['qwk'] if not np.isnan(r['qwk']) else -1, r['pearson']))
    lines += ["", f"**Model hiệu quả nhất (QWK cao nhất): `{best['model']}`** "
                  f"(QWK={best['qwk']:.3f}, Pearson={best['pearson']:.3f}, MAE={best['mae']:.3f}).", ""]
    table_md = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "benchmark_aes_table.md"), "w", encoding="utf-8") as f:
        f.write(table_md + "\n")
    print("\n" + table_md)

    # ===== Biểu đồ 1: Pearson + QWK (cao = tốt) =====
    names = [r['model'] for r in results]
    x = np.arange(len(names))
    w = 0.38
    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.bar(x - w / 2, [r['pearson'] for r in results], w, label='Pearson', color='#4285F4')
    ax.bar(x + w / 2, [r['qwk'] for r in results], w, label='QWK', color='#34A853')
    ax.set_xticks(x); ax.set_xticklabels(names, rotation=15, ha='right')
    ax.set_ylim(0, 1.0)
    ax.set_title('Độ tương quan với điểm người chấm (cao = chấm sát người hơn)')
    ax.legend(); ax.grid(axis='y', alpha=0.3)
    for i, r in enumerate(results):
        ax.text(i - w / 2, r['pearson'] + 0.01, f"{r['pearson']:.2f}", ha='center', fontsize=8)
        ax.text(i + w / 2, max(r['qwk'], 0) + 0.01, f"{r['qwk']:.2f}", ha='center', fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "benchmark_aes_correlation.png"), dpi=130)

    # ===== Biểu đồ 2: sai số MAE/RMSE (thấp = tốt) =====
    fig2, ax2 = plt.subplots(figsize=(11, 5.5))
    ax2.bar(x - w / 2, [r['mae'] for r in results], w, label='MAE', color='#FBBC05')
    ax2.bar(x + w / 2, [r['rmse'] for r in results], w, label='RMSE', color='#EA4335')
    ax2.set_xticks(x); ax2.set_xticklabels(names, rotation=15, ha='right')
    ax2.set_title('Sai số điểm so với người chấm (thấp = chính xác hơn)')
    ax2.legend(); ax2.grid(axis='y', alpha=0.3)
    for i, r in enumerate(results):
        ax2.text(i - w / 2, r['mae'], f"{r['mae']:.2f}", ha='center', va='bottom', fontsize=8)
        ax2.text(i + w / 2, r['rmse'], f"{r['rmse']:.2f}", ha='center', va='bottom', fontsize=8)
    fig2.tight_layout()
    fig2.savefig(os.path.join(OUT_DIR, "benchmark_aes_error.png"), dpi=130)

    print(f"\nĐã lưu: benchmark_aes_table.md, benchmark_aes_correlation.png, "
          f"benchmark_aes_error.png trong {OUT_DIR}")


if __name__ == "__main__":
    main()
