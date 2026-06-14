"""
CLO4 — Kiểm thử chức năng, tính ổn định của mô hình PhoBERT
Gọi API production /analyze-report với 100 cases, đo:
  - Accuracy, Precision, Recall, F1-Score
  - Throughput (thời gian phản hồi mỗi request)
"""
import json, csv, time, sys, os, requests

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# === CẤU HÌNH ===
ML_URL = "http://ai.web3.giangvien.ifanit.io.vn/analyze-report"
COLLECTION_PATH = os.path.join(os.path.dirname(__file__),
    "..", "Day03-06-2026", "PhoBERT_100Cases_Collection.json")
OUTPUT_DIR = os.path.dirname(__file__)
CSV_OUT = os.path.join(OUTPUT_DIR, "PhoBERT_100Cases_Results_NEW.csv")
SUMMARY_OUT = os.path.join(OUTPUT_DIR, "PhoBERT_100Cases_Summary_NEW.md")
MATCH_THRESHOLD = 5.0  # score > 5.0 => MATCH (giữ nguyên logic hiện tại)

# === ĐỌC COLLECTION ===
print(f"[*] Đọc collection: {COLLECTION_PATH}")
with open(COLLECTION_PATH, "r", encoding="utf-8") as f:
    collection = json.load(f)

items = collection["item"]
print(f"[*] Tổng số test cases: {len(items)}")

# === CHẠY TEST ===
results = []
tp = tn = fp = fn = 0
total_time = 0
errors = 0

for idx, item in enumerate(items):
    case_name = item["name"]
    # Xác định expected từ tên case: (MATCH) hoặc (MISMATCH)
    if "(MATCH)" in case_name:
        expected = 1  # MATCH
    elif "(MISMATCH)" in case_name:
        expected = 0  # MISMATCH
    else:
        print(f"  [!] Case {idx+1}: Không xác định được expected từ tên -> skip")
        continue

    # Parse body
    try:
        raw_body = item["request"]["body"]["raw"]
        payload = json.loads(raw_body)
    except Exception as e:
        print(f"  [!] Case {idx+1}: Lỗi parse body: {e}")
        errors += 1
        continue

    # Gọi API
    case_num = idx + 1
    print(f"  [{case_num:3d}/100] {case_name[:70]}...", end=" ", flush=True)
    
    try:
        t0 = time.time()
        resp = requests.post(ML_URL, json=payload, timeout=120)
        elapsed_ms = (time.time() - t0) * 1000
        total_time += elapsed_ms
        
        if resp.status_code != 200:
            print(f"HTTP {resp.status_code} ({elapsed_ms:.0f}ms)")
            errors += 1
            continue
        
        data = resp.json()
        score = data.get("score", 0)
        feedback = data.get("feedback", "")
        rep_rate = data.get("repetition_rate", 0)
        security = data.get("security_flags", [])
        
        # Phân loại dự đoán
        predicted = 1 if score > MATCH_THRESHOLD else 0
        
        # Confusion matrix
        if expected == 1 and predicted == 1:
            result_label = "True Positive (TP)"
            tp += 1
        elif expected == 0 and predicted == 0:
            result_label = "True Negative (TN)"
            tn += 1
        elif expected == 0 and predicted == 1:
            result_label = "False Positive (FP)"
            fp += 1
        else:
            result_label = "False Negative (FN)"
            fn += 1
        
        print(f"score={score:5.2f} | {result_label:20s} | {elapsed_ms:7.0f}ms")
        
        results.append({
            "case": f"Ca {case_num}",
            "name": case_name,
            "score": score,
            "expected": "MATCH (1)" if expected == 1 else "MISMATCH (0)",
            "predicted": "MATCH (1)" if predicted == 1 else "MISMATCH (0)",
            "result": result_label,
            "response_ms": round(elapsed_ms, 1),
            "feedback": feedback[:100],
            "repetition_rate": round(rep_rate, 4) if rep_rate else 0,
            "security_flags": len(security),
        })
        
    except requests.exceptions.Timeout:
        print("TIMEOUT (>120s)")
        errors += 1
    except Exception as e:
        print(f"ERROR: {e}")
        errors += 1

# === TÍNH TOÁN CHỈ SỐ ===
total_cases = tp + tn + fp + fn
accuracy = (tp + tn) / total_cases if total_cases else 0
precision = tp / (tp + fp) if (tp + fp) else 0
recall = tp / (tp + fn) if (tp + fn) else 0
f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0

# Throughput stats
times = [r["response_ms"] for r in results]
avg_time = sum(times) / len(times) if times else 0
min_time = min(times) if times else 0
max_time = max(times) if times else 0
p50 = sorted(times)[len(times)//2] if times else 0
p95 = sorted(times)[int(len(times)*0.95)] if times else 0

match_cases = sum(1 for r in results if "MATCH (1)" in r["expected"])
mismatch_cases = sum(1 for r in results if "MISMATCH (0)" in r["expected"])

# === GHI CSV ===
print(f"\n[*] Ghi kết quả CSV: {CSV_OUT}")
with open(CSV_OUT, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "case", "name", "score", "expected", "predicted", "result",
        "response_ms", "feedback", "repetition_rate", "security_flags"
    ])
    writer.writeheader()
    writer.writerows(results)
    
    # Dòng trống + tổng kết
    f.write("\n")
    f.write(f"=== TONG KET ===\n")
    f.write(f"Total Cases,{total_cases}\n")
    f.write(f"MATCH cases,{match_cases}\n")
    f.write(f"MISMATCH cases,{mismatch_cases}\n")
    f.write(f"TP,{tp}\n")
    f.write(f"TN,{tn}\n")
    f.write(f"FP,{fp}\n")
    f.write(f"FN,{fn}\n")
    f.write(f"Accuracy,{accuracy:.4f},{accuracy*100:.2f}%\n")
    f.write(f"Precision,{precision:.4f},{precision*100:.2f}%\n")
    f.write(f"Recall,{recall:.4f},{recall*100:.2f}%\n")
    f.write(f"F1-Score,{f1:.4f},{f1*100:.2f}%\n")
    f.write(f"Avg Response (ms),{avg_time:.1f}\n")
    f.write(f"Min Response (ms),{min_time:.1f}\n")
    f.write(f"Max Response (ms),{max_time:.1f}\n")
    f.write(f"P50 Response (ms),{p50:.1f}\n")
    f.write(f"P95 Response (ms),{p95:.1f}\n")
    f.write(f"Errors,{errors}\n")

# === GHI SUMMARY MD ===
print(f"[*] Ghi summary: {SUMMARY_OUT}")
with open(SUMMARY_OUT, "w", encoding="utf-8") as f:
    f.write("# Kết quả kiểm thử 100 Cases — PhoBERT Analyze Report (Production)\n\n")
    f.write(f"**Ngày chạy:** {time.strftime('%d/%m/%Y %H:%M:%S')}\n")
    f.write(f"**API:** `{ML_URL}`\n")
    f.write(f"**Threshold MATCH:** score > {MATCH_THRESHOLD}\n")
    f.write(f"**Công thức:** Base 5.0 + Keyword 1.5 + Semantic 2.5 - Repetition 3.0\n\n")
    f.write("---\n\n")
    
    f.write("## 1. Độ chính xác (Accuracy / F1-Score)\n\n")
    f.write("| Chỉ số | Giá trị | Phần trăm |\n")
    f.write("|---|---|---|\n")
    f.write(f"| **Tổng test cases** | {total_cases} | — |\n")
    f.write(f"| MATCH cases | {match_cases} | — |\n")
    f.write(f"| MISMATCH cases | {mismatch_cases} | — |\n")
    f.write(f"| True Positive (TP) | {tp} | — |\n")
    f.write(f"| True Negative (TN) | {tn} | — |\n")
    f.write(f"| False Positive (FP) | {fp} | — |\n")
    f.write(f"| False Negative (FN) | {fn} | — |\n")
    f.write(f"| **Accuracy** | **{accuracy:.4f}** | **{accuracy*100:.2f}%** |\n")
    f.write(f"| **Precision** | **{precision:.4f}** | **{precision*100:.2f}%** |\n")
    f.write(f"| **Recall** | **{recall:.4f}** | **{recall*100:.2f}%** |\n")
    f.write(f"| **F1-Score** | **{f1:.4f}** | **{f1*100:.2f}%** |\n\n")
    
    f.write("## 2. Throughput (Thời gian phản hồi)\n\n")
    f.write("| Chỉ số | Giá trị |\n")
    f.write("|---|---|\n")
    f.write(f"| **Trung bình** | **{avg_time:.0f} ms** ({avg_time/1000:.1f}s) |\n")
    f.write(f"| Nhanh nhất (Min) | {min_time:.0f} ms |\n")
    f.write(f"| Chậm nhất (Max) | {max_time:.0f} ms |\n")
    f.write(f"| P50 (Median) | {p50:.0f} ms |\n")
    f.write(f"| P95 | {p95:.0f} ms |\n")
    f.write(f"| Tổng thời gian | {total_time/1000:.1f}s ({total_time/60000:.1f} phút) |\n")
    f.write(f"| Throughput ước tính | ~{60000/avg_time:.1f} req/phút |\n\n") if avg_time > 0 else None
    
    f.write("## 3. Lỗi / Cảnh báo\n\n")
    f.write(f"| Chỉ số | Giá trị |\n")
    f.write(f"|---|---|\n")
    f.write(f"| Errors (timeout/HTTP) | {errors} |\n")
    sec_flagged = sum(1 for r in results if r["security_flags"] > 0)
    f.write(f"| Security flags triggered | {sec_flagged}/{total_cases} |\n")
    high_rep = sum(1 for r in results if r["repetition_rate"] > 0.2)
    f.write(f"| Repetition rate > 20% | {high_rep}/{total_cases} |\n\n")
    
    f.write("## 4. Chi tiết từng case\n\n")
    f.write("| Case | Score | Expected | Predicted | Result | Time (ms) |\n")
    f.write("|---|---|---|---|---|---|\n")
    for r in results:
        short_name = r["case"]
        f.write(f"| {short_name} | {r['score']} | {r['expected']} | {r['predicted']} | {r['result']} | {r['response_ms']:.0f} |\n")

print(f"\n{'='*60}")
print(f"  TỔNG KẾT")
print(f"{'='*60}")
print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
print(f"  Precision: {precision:.4f} ({precision*100:.2f}%)")
print(f"  Recall:    {recall:.4f} ({recall*100:.2f}%)")
print(f"  F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
print(f"  Avg Time:  {avg_time:.0f}ms")
print(f"  P95 Time:  {p95:.0f}ms")
print(f"  Errors:    {errors}")
print(f"{'='*60}")
