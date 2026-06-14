# -*- coding: utf-8 -*-
"""
CLO4 — Kiểm thử chức năng & đánh giá hiệu quả MÔ HÌNH AI (luồng production hiện tại).

Replay 100 báo cáo (lấy y nguyên từ Postman collection Day03) qua
phobert_analyzer.analyze() PHIÊN BẢN HIỆN TẠI (sliding-window + chunking),
KHÔNG cần bật uvicorn/Postman → đo đúng "model & logic mới nhất".

Đo:
  - Accuracy, Precision, Recall, F1-Score (phân loại MATCH/MISMATCH)
  - Throughput AI (reports/sec, reports/min)
  - Latency (mean / p50 / p95 / max, ms)

Xuất:
  - CLO4_AI_PhoBERT_Results.csv   (chi tiết 100 ca)
  - CLO4_AI_metrics.json          (số liệu tổng hợp để gộp bảng cuối)
"""
import os
import sys
import csv
import json
import time
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
ML_ROOT = os.path.dirname(HERE)                       # .../ml-service
REPO_ROOT = os.path.dirname(ML_ROOT)                  # .../Web3-GiangVien
sys.path.insert(0, ML_ROOT)                           # để import models / utils

COLLECTION = os.path.join(
    REPO_ROOT, "Document", "Day03-06-2026", "PhoBERT_100Cases_Collection.json"
)
OUT_DIR = os.path.join(REPO_ROOT, "Document", "Day13-06-2026", "CLO4_KiemThu")
os.makedirs(OUT_DIR, exist_ok=True)


def load_cases():
    """Trả về list (name, text, requirements, expected) — expected 1=MATCH, 0=MISMATCH."""
    col = json.load(open(COLLECTION, encoding="utf-8"))
    cases = []
    for it in col["item"]:
        name = it["name"].strip()
        expected = 1 if name.endswith("(MATCH)") else 0
        body = json.loads(it["request"]["body"]["raw"])
        cases.append((name, body.get("text", ""), body.get("topic_requirements", []), expected))
    return cases


def main():
    from models.phobert_analyzer import PhoBertAnalyzer

    print("[CLO4-AI] Loading model PhoBERT (production analyzer)...")
    t_load = time.time()
    analyzer = PhoBertAnalyzer()
    load_ms = int((time.time() - t_load) * 1000)
    print(f"[CLO4-AI] Model loaded in {load_ms} ms | model={analyzer.model_name} | device={analyzer.device}")

    cases = load_cases()
    print(f"[CLO4-AI] Loaded {len(cases)} test cases from Postman collection")

    rows = []
    latencies = []
    TP = TN = FP = FN = 0

    wall_start = time.time()
    for i, (name, text, reqs, expected) in enumerate(cases, 1):
        t0 = time.time()
        res = analyzer.analyze(text=text, topic_requirements=reqs, job_id=None)
        dt_ms = (time.time() - t0) * 1000.0
        latencies.append(dt_ms)

        score = res.get("score", 0.0)
        feedback = res.get("feedback", "")
        # Quy ước phân loại (giống pipeline production / báo cáo Day03):
        # feedback "Nội dung đạt yêu cầu." -> MATCH(1); "Cần cải thiện..." -> MISMATCH(0)
        pred = 1 if feedback.startswith("Nội dung đạt") else 0

        if expected == 1 and pred == 1:
            res_label = "TP"; TP += 1
        elif expected == 0 and pred == 0:
            res_label = "TN"; TN += 1
        elif expected == 0 and pred == 1:
            res_label = "FP"; FP += 1
        else:
            res_label = "FN"; FN += 1

        rows.append({
            "case": f"Ca {i}",
            "name": name,
            "score": score,
            "expected": "MATCH" if expected else "MISMATCH",
            "predicted": "MATCH" if pred else "MISMATCH",
            "result": res_label,
            "latency_ms": round(dt_ms, 1),
        })
        if i % 10 == 0:
            print(f"[CLO4-AI] {i}/{len(cases)} done | last score={score} | {dt_ms:.0f} ms")

    wall = time.time() - wall_start

    total = len(cases)
    accuracy = (TP + TN) / total
    precision = TP / (TP + FP) if (TP + FP) else 0.0
    recall = TP / (TP + FN) if (TP + FN) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    lat_sorted = sorted(latencies)
    def pct(p):
        k = max(0, min(len(lat_sorted) - 1, int(round(p / 100 * (len(lat_sorted) - 1)))))
        return lat_sorted[k]

    metrics = {
        "model": analyzer.model_name,
        "device": analyzer.device,
        "total_cases": total,
        "match_cases": sum(1 for r in rows if r["expected"] == "MATCH"),
        "mismatch_cases": sum(1 for r in rows if r["expected"] == "MISMATCH"),
        "confusion": {"TP": TP, "TN": TN, "FP": FP, "FN": FN},
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "latency_ms": {
            "mean": round(statistics.mean(latencies), 1),
            "p50": round(pct(50), 1),
            "p95": round(pct(95), 1),
            "max": round(max(latencies), 1),
            "min": round(min(latencies), 1),
        },
        "wall_seconds": round(wall, 2),
        "throughput_reports_per_sec": round(total / wall, 3),
        "throughput_reports_per_min": round(total / wall * 60, 1),
        "model_load_ms": load_ms,
    }

    # === CSV chi tiết ===
    csv_path = os.path.join(OUT_DIR, "CLO4_AI_PhoBERT_Results.csv")
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["Test Case", "Report (Postman item)", "AI Score",
                    "Expected", "Predicted", "Result", "Latency (ms)"])
        for r in rows:
            w.writerow([r["case"], r["name"], r["score"], r["expected"],
                        r["predicted"], r["result"], r["latency_ms"]])
        w.writerow([])
        w.writerow(["=== TONG KET (mo hinh hien tai) ==="])
        w.writerow(["Model", metrics["model"]])
        w.writerow(["Device", metrics["device"]])
        w.writerow(["Total Cases", total])
        w.writerow(["TP", TP]); w.writerow(["TN", TN])
        w.writerow(["FP", FP]); w.writerow(["FN", FN])
        w.writerow(["Accuracy", f"{accuracy:.4f}", f"{accuracy*100:.2f}%"])
        w.writerow(["Precision", f"{precision:.4f}", f"{precision*100:.2f}%"])
        w.writerow(["Recall", f"{recall:.4f}", f"{recall*100:.2f}%"])
        w.writerow(["F1-Score", f"{f1:.4f}", f"{f1*100:.2f}%"])
        w.writerow(["Throughput (reports/min)", metrics["throughput_reports_per_min"]])
        w.writerow(["Latency mean (ms)", metrics["latency_ms"]["mean"]])
        w.writerow(["Latency p95 (ms)", metrics["latency_ms"]["p95"]])

    json_path = os.path.join(OUT_DIR, "CLO4_AI_metrics.json")
    json.dump(metrics, open(json_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print("CLO4 — KET QUA MO HINH AI (PhoBERT, logic hien tai)")
    print("=" * 50)
    print(f"TP={TP} TN={TN} FP={FP} FN={FN}")
    print(f"Accuracy : {accuracy*100:.2f}%")
    print(f"Precision: {precision*100:.2f}%")
    print(f"Recall   : {recall*100:.2f}%")
    print(f"F1-Score : {f1*100:.2f}%")
    print(f"Throughput: {metrics['throughput_reports_per_min']} reports/min "
          f"({metrics['throughput_reports_per_sec']} rps)")
    print(f"Latency  : mean={metrics['latency_ms']['mean']}ms  "
          f"p95={metrics['latency_ms']['p95']}ms  max={metrics['latency_ms']['max']}ms")
    print(f"\nCSV  -> {csv_path}")
    print(f"JSON -> {json_path}")


if __name__ == "__main__":
    main()
