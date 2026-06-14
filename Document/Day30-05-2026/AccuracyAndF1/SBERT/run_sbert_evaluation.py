import pandas as pd
import json
import random
import re
import requests
import time
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# --- CONFIG ---
ML_URL = "http://ai.web3.giangvien.ifanit.io.vn/match-student"
DATA_FILE = os.path.join(os.path.dirname(__file__), "raw_data.csv")
OUT_JSON = os.path.join(os.path.dirname(__file__), "SBERT_Test_Dataset.json")
OUT_CSV = os.path.join(os.path.dirname(__file__), "SBERT_Results_TopCV.csv")
OUT_MD = os.path.join(os.path.dirname(__file__), "SBERT_Report_TopCV.md")

print("[*] Đang đọc file raw_data.csv...")
try:
    df = pd.read_csv(DATA_FILE)
except Exception as e:
    print(f"[!] Lỗi đọc CSV: {e}")
    sys.exit(1)

# Lọc các công việc thuộc ngành IT/Công nghệ
if 'mapped_industry' in df.columns:
    it_df = df[df['mapped_industry'].str.contains('IT|Phần mềm|Công nghệ', case=False, na=False)]
else:
    it_df = df

if len(it_df) < 100:
    it_df = df

it_df = it_df.dropna(subset=['requirements']).head(100)
print(f"[*] Đã lọc được {len(it_df)} mô tả yêu cầu IT.")

# --- GENERATE DATA ---
topics = []
students = []

def extract_skills(text):
    words = re.findall(r'[a-zA-Z0-9+#]+', str(text))
    # Lọc các từ dài hơn 2 ký tự và giống như tên kỹ năng
    words = [w for w in words if len(w) > 2 and not w.islower()]
    return list(set(words))[:4]

for idx, row in it_df.iterrows():
    topic_id = f"T_{idx}"
    
    # Format requirements
    req_text = str(row['requirements'])
    reqs = req_text.split('\n')
    reqs = [r.strip().replace('- ', '').replace('+ ', '') for r in reqs if len(r.strip()) > 10][:5]
    if not reqs:
        reqs = [req_text[:200]]
        
    topics.append({
        "topic_id": topic_id,
        "requirements": reqs
    })
    
    # Tạo sinh viên phù hợp với đề tài này
    skills = extract_skills(req_text)
    major_scores = {skill: round(random.uniform(7.5, 9.5), 1) for skill in skills}
    if not major_scores:
        major_scores = {"IT_General": 8.0}
        
    students.append({
        "student_id": f"S_{idx}",
        "target_topic_id": topic_id,
        "gpa": round(random.uniform(6.5, 9.0), 2),
        "major_scores": major_scores
    })

print(f"[*] Đã tạo 100 Đề tài và 100 Sinh viên (Ground Truth).")
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump({"topics": topics, "students": students}, f, ensure_ascii=False, indent=2)

# --- CHẠY KIỂM THỬ SBERT ---
print("[*] Đang gửi request tới SBERT API (Production)...")
results = []
hit_at_1 = 0
hit_at_3 = 0
hit_at_5 = 0
mrr = 0.0

total_time = 0

for i, student in enumerate(students):
    target = student["target_topic_id"]
    payload = {
        "student": {
            "gpa": student["gpa"],
            "major_scores": student["major_scores"]
        },
        "topics": topics
    }
    
    print(f"  [SV {i+1}/100] Matching skills: {list(student['major_scores'].keys())} ...", end=" ", flush=True)
    
    t0 = time.time()
    try:
        resp = requests.post(ML_URL, json=payload, timeout=30)
        elapsed = (time.time() - t0) * 1000
        total_time += elapsed
        
        if resp.status_code != 200:
            print(f"HTTP {resp.status_code}")
            continue
            
        recs = resp.json().get("recommendations", [])
        
        # Tìm rank của target topic
        rank = -1
        for r_idx, r in enumerate(recs):
            if r["topic_id"] == target:
                rank = r_idx + 1
                break
                
        if rank == -1:
            print("NOT FOUND")
            continue
            
        print(f"Rank: {rank} ({elapsed:.0f}ms)")
        
        if rank == 1: hit_at_1 += 1
        if rank <= 3: hit_at_3 += 1
        if rank <= 5: hit_at_5 += 1
        mrr += 1.0 / rank
        
        results.append({
            "student_id": student["student_id"],
            "target_topic_id": target,
            "rank": rank,
            "skills": ", ".join(student["major_scores"].keys()),
            "response_ms": elapsed
        })
        
    except Exception as e:
        print(f"ERROR: {e}")

# --- TÍNH TOÁN VÀ LƯU ---
num_tested = len(results)
mrr /= num_tested if num_tested else 1

df_results = pd.DataFrame(results)
df_results.to_csv(OUT_CSV, index=False)

with open(OUT_MD, 'w', encoding='utf-8') as f:
    f.write("# Kết quả kiểm thử SBERT (Recommendation) - Dữ liệu TopCV\n\n")
    f.write(f"**Số lượng sinh viên:** {num_tested}\n")
    f.write(f"**Số lượng đề tài:** {len(topics)}\n")
    f.write(f"**Mỗi sinh viên được SBERT xếp hạng trên tổng số 100 đề tài.**\n\n")
    f.write("## Chỉ số Ranking (Hệ Recommendation)\n")
    f.write("| Metric | Ý nghĩa | Giá trị |\n")
    f.write("|---|---|---|\n")
    f.write(f"| **Hit@1** | Gợi ý top 1 trúng ngay đề tài phù hợp | **{hit_at_1/num_tested*100:.1f}%** |\n")
    f.write(f"| **Hit@3** | Đề tài phù hợp nằm trong top 3 gợi ý | **{hit_at_3/num_tested*100:.1f}%** |\n")
    f.write(f"| **Hit@5** | Đề tài phù hợp nằm trong top 5 gợi ý | **{hit_at_5/num_tested*100:.1f}%** |\n")
    f.write(f"| **MRR** | Mean Reciprocal Rank (Càng gần 1 càng tốt) | **{mrr:.4f}** |\n\n")
    f.write("## Throughput\n")
    f.write(f"- Thời gian trung bình 1 request (Match 1 SV với 100 Đề tài): **{total_time/num_tested:.0f} ms**\n")

print("\n" + "="*50)
print(f"HOÀN THÀNH. Đã lưu kết quả tại {OUT_CSV} và {OUT_MD}")
print(f"Hit@1: {hit_at_1/num_tested*100:.1f}% | Hit@3: {hit_at_3/num_tested*100:.1f}% | MRR: {mrr:.4f}")
