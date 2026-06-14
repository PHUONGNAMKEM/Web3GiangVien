"""
================================================================================
ĐÁNH GIÁ SBERT GỢI Ý ĐỀ TÀI — 100 CA — GỌI DOMAIN THẬT (PRODUCTION)
================================================================================
Endpoint thật: https://ai.web3.giangvien.ifanit.io.vn/match-student
Sinh 100 ca (sinh vien <-> de tai) tren 12 linh vuc CNTT, co ca de + ca kho (bien),
goi API that de lay match_score, tinh Accuracy/Precision/Recall/F1, ve chart.

Chay:  python gen_sbert_100_realdomain.py
Output: SBERT_100Cases_RealDomain_Results.csv + charts/*.png
================================================================================
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import requests, csv, os, time, random, sys

API_URL = "https://ai.web3.giangvien.ifanit.io.vn/match-student"
THRESHOLD = 0.75            # nguong phan loai he thong dang dung
BASE = os.path.dirname(os.path.abspath(__file__))
CHART_DIR = os.path.join(BASE, "charts")
os.makedirs(CHART_DIR, exist_ok=True)
random.seed(2026)

# ==============================================================================
# 12 LINH VUC CNTT: ten mon (tieng Viet, dung lam major_scores) + yeu cau de tai
# ==============================================================================
DOMAINS = {
    "Web Fullstack":   (["Lập trình Web","React","NodeJS","Hệ cơ sở dữ liệu","JavaScript","MongoDB"],
                         ["React","NodeJS","Database","Web","MongoDB","Express"]),
    "AI / Computer Vision": (["Trí tuệ nhân tạo","Deep learning","Python","Thị giác máy tính","Học máy"],
                         ["AI","Deep Learning","CNN","Computer Vision","OpenCV","Image Classification"]),
    "NLP":             (["Xử lý ngôn ngữ tự nhiên","Deep learning","Python","Học máy"],
                         ["NLP","Transformer","BERT","Text Classification","Sentiment Analysis"]),
    "Mobile Android":  (["Lập trình di động","Java","Android","Kotlin","Firebase"],
                         ["Android","Java","Mobile App","Kotlin","Firebase"]),
    "iOS Mobile":      (["Lập trình di động","Swift","iOS","Objective-C"],
                         ["Swift","iOS","Mobile","SwiftUI"]),
    "IoT / Embedded":  (["Internet of Things","C++","Arduino","Vi điều khiển","Mạch điện"],
                         ["IoT","Arduino","Embedded","ESP32","Sensor"]),
    "Blockchain / Web3": (["Blockchain","Solidity","Web3","Hợp đồng thông minh","Ethereum"],
                         ["Blockchain","Solidity","Web3","Smart Contract","DApp"]),
    "An toan thong tin": (["Bảo mật máy tính","An toàn mạng máy tính","Linux","Kiểm thử xâm nhập"],
                         ["Security","Network","Penetration Testing","OWASP","Bảo mật"]),
    "Data Science / Big Data": (["Nhập môn Big Data","Khai phá dữ liệu","Python","Hadoop","Spark"],
                         ["Big Data","Data Mining","Hadoop","Spark","ETL"]),
    "Game Development": (["Lập trình game","Unity","C#","Thiết kế game"],
                         ["Unity","C#","Game Design","2D","3D"]),
    "DevOps / Cloud":  (["Lập trình mã nguồn mở","Linux","Docker","Kubernetes","DevOps"],
                         ["Docker","Kubernetes","CI/CD","Cloud","DevOps"]),
    ".NET Enterprise": (["Công nghệ .NET","C#","SQL Server","Phân tích thiết kế hệ thống"],
                         ["C#",".NET","SQL Server","WinForms","Enterprise"]),
}
DOM_NAMES = list(DOMAINS.keys())

# Cap linh vuc "gan nhau" -> ca MISMATCH KHO (de model de nham -> ra so thuc te hon)
HARD_PAIRS = [
    ("AI / Computer Vision", "NLP"),
    ("AI / Computer Vision", "Data Science / Big Data"),
    ("NLP", "Data Science / Big Data"),
    ("Web Fullstack", ".NET Enterprise"),
    ("Mobile Android", "iOS Mobile"),
    ("Web Fullstack", "Blockchain / Web3"),
    ("IoT / Embedded", "DevOps / Cloud"),
    (".NET Enterprise", "Data Science / Big Data"),
    ("DevOps / Cloud", "Web Fullstack"),
    ("Blockchain / Web3", "An toan thong tin"),
]

def make_student(domain, rng):
    """Tao ho so SV tu linh vuc: GPA + 3-4 mon manh."""
    skills_pool, _ = DOMAINS[domain]
    k = rng.randint(3, min(4, len(skills_pool)))
    chosen = rng.sample(skills_pool, k)
    gpa = round(rng.uniform(7.3, 9.5), 1)
    major_scores = {s: round(rng.uniform(7.5, 10.0), 1) for s in chosen}
    return gpa, major_scores

def make_reqs(domain, rng):
    _, reqs_pool = DOMAINS[domain]
    k = rng.randint(3, min(4, len(reqs_pool)))
    return rng.sample(reqs_pool, k)

# ==============================================================================
# SINH 100 CA: 50 MATCH (cung linh vuc) + 50 MISMATCH (khac linh vuc, gom 20 ca kho)
# ==============================================================================
rng = random.Random(2026)
cases = []  # (stt, domain_sv, domain_tai, gpa, major_scores, reqs, label, loai)

# --- 50 MATCH ---
for i in range(50):
    d = DOM_NAMES[i % len(DOM_NAMES)]
    gpa, ms = make_student(d, rng)
    reqs = make_reqs(d, rng)
    cases.append([d, d, gpa, ms, reqs, 1, "Match"])

# --- 20 MISMATCH KHO (linh vuc gan nhau) ---
for i in range(20):
    d1, d2 = HARD_PAIRS[i % len(HARD_PAIRS)]
    gpa, ms = make_student(d1, rng)
    reqs = make_reqs(d2, rng)
    cases.append([d1, d2, gpa, ms, reqs, 0, "Mismatch-Hard"])

# --- 30 MISMATCH DE (linh vuc xa nhau ngau nhien) ---
made = 0
while made < 30:
    d1, d2 = rng.sample(DOM_NAMES, 2)
    if (d1, d2) in HARD_PAIRS or (d2, d1) in HARD_PAIRS:
        continue
    gpa, ms = make_student(d1, rng)
    reqs = make_reqs(d2, rng)
    cases.append([d1, d2, gpa, ms, reqs, 0, "Mismatch-Easy"])
    made += 1

rng.shuffle(cases)
print(f"Tong so ca: {len(cases)} | Match: {sum(1 for c in cases if c[5]==1)} | Mismatch: {sum(1 for c in cases if c[5]==0)}")

# ==============================================================================
# GOI DOMAIN THAT
# ==============================================================================
print(f"\nGoi API that: {API_URL}\n" + "="*60)
rows = []
fails = 0
for idx, (d_sv, d_tai, gpa, ms, reqs, label, loai) in enumerate(cases, 1):
    payload = {"student": {"gpa": gpa, "major_scores": ms},
               "topics": [{"topic_id": f"ca_{idx}", "requirements": reqs}]}
    score = None
    for attempt in range(3):
        try:
            r = requests.post(API_URL, json=payload, timeout=60)
            if r.status_code == 200:
                score = r.json()["recommendations"][0]["match_score"]
                break
            else:
                print(f"  [ca {idx}] HTTP {r.status_code} (thu lai {attempt+1})")
                time.sleep(1.5)
        except Exception as e:
            print(f"  [ca {idx}] LOI: {e} (thu lai {attempt+1})")
            time.sleep(2)
    if score is None:
        fails += 1
        print(f"  [ca {idx}] BO QUA sau 3 lan thu")
        continue
    pred = 1 if score >= THRESHOLD else 0
    ok = "OK" if pred == label else "x"
    rows.append([idx, d_sv, d_tai, gpa, ", ".join(f"{k}={v}" for k,v in ms.items()),
                 ", ".join(reqs), label, score, pred, loai])
    print(f"  [{idx:>3}/{len(cases)}] {loai:<14} {d_sv[:18]:<18} -> {d_tai[:18]:<18} score={score:.4f} pred={pred} truth={label} {ok}")
    time.sleep(0.12)

print("="*60)
print(f"Thanh cong: {len(rows)} | That bai: {fails}")

# ==============================================================================
# TINH METRICS
# ==============================================================================
truth = np.array([r[6] for r in rows])
scores = np.array([r[7] for r in rows])
pred = (scores >= THRESHOLD).astype(int)
TP = int(np.sum((truth==1)&(pred==1))); TN = int(np.sum((truth==0)&(pred==0)))
FP = int(np.sum((truth==0)&(pred==1))); FN = int(np.sum((truth==1)&(pred==0)))
n = len(truth)
acc  = (TP+TN)/n*100
prec = TP/(TP+FP)*100 if (TP+FP) else 0
rec  = TP/(TP+FN)*100 if (TP+FN) else 0
f1   = 2*prec*rec/(prec+rec) if (prec+rec) else 0
print(f"\n=== KET QUA (nguong {THRESHOLD}) ===")
print(f"N={n} TP={TP} TN={TN} FP={FP} FN={FN}")
print(f"Accuracy={acc:.2f}% Precision={prec:.2f}% Recall={rec:.2f}% F1={f1:.2f}%")

# Quet nguong tim diem toi uu
ths = np.arange(0.55, 0.91, 0.01)
acc_sweep, f1_sweep = [], []
for t in ths:
    p = (scores >= t).astype(int)
    tp=np.sum((truth==1)&(p==1)); tn=np.sum((truth==0)&(p==0))
    fp=np.sum((truth==0)&(p==1)); fn=np.sum((truth==1)&(p==0))
    a=(tp+tn)/n*100
    pr=tp/(tp+fp)*100 if (tp+fp) else 0; rc=tp/(tp+fn)*100 if (tp+fn) else 0
    ff=2*pr*rc/(pr+rc) if (pr+rc) else 0
    acc_sweep.append(a); f1_sweep.append(ff)
best_i = int(np.argmax(f1_sweep))
best_t = ths[best_i]
print(f"Nguong toi uu (F1 cao nhat): {best_t:.2f} -> Acc={acc_sweep[best_i]:.1f}% F1={f1_sweep[best_i]:.1f}%")

# ==============================================================================
# GHI CSV
# ==============================================================================
csv_path = os.path.join(BASE, "SBERT_100Cases_RealDomain_Results.csv")
with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["STT","Linh vuc SV","Linh vuc de tai","GPA","Ky nang (mon)","Yeu cau de tai",
                "Nhan thuc te","match_score (domain that)","Du doan (>=0.75)","Loai ca"])
    for r in rows:
        w.writerow([r[0],r[1],r[2],r[3],r[4],r[5],
                    "MATCH" if r[6]==1 else "MISMATCH", f"{r[7]:.4f}",
                    "MATCH" if r[8]==1 else "MISMATCH", r[9]])
    w.writerow([])
    w.writerow(["=== TONG KET (nguong 0.75) ==="])
    for k,v in [("Total",n),("TP",TP),("TN",TN),("FP",FP),("FN",FN),
                ("Accuracy",f"{acc:.2f}%"),("Precision",f"{prec:.2f}%"),
                ("Recall",f"{rec:.2f}%"),("F1-Score",f"{f1:.2f}%"),
                ("Nguong toi uu",f"{best_t:.2f} (F1={f1_sweep[best_i]:.1f}%)")]:
        w.writerow([k,v])
print(f"CSV: {csv_path}")

# ==============================================================================
# CHART 2x2
# ==============================================================================
plt.rcParams['font.size'] = 11
plt.rcParams['figure.dpi'] = 150
fig, axes = plt.subplots(2, 2, figsize=(15, 11))
ax1, ax2, ax3, ax4 = axes.ravel()

# (1) Score distribution
ms_s = scores[truth==1]; mis_s = scores[truth==0]
bins = np.arange(0.4, 1.02, 0.04)
ax1.hist(ms_s, bins=bins, alpha=0.7, color='#4CAF50', label=f'MATCH (n={len(ms_s)})', edgecolor='white')
ax1.hist(mis_s, bins=bins, alpha=0.7, color='#F44336', label=f'MISMATCH (n={len(mis_s)})', edgecolor='white')
ax1.axvline(THRESHOLD, color='orange', linestyle='--', linewidth=2, label=f'Nguong={THRESHOLD}')
ax1.set_xlabel("match_score (domain that)"); ax1.set_ylabel("So ca")
ax1.set_title("Phan bo diem SBERT — domain that", fontweight='bold')
ax1.legend(fontsize=9); ax1.grid(axis='y', alpha=0.3)

# (2) Confusion matrix
cm = np.array([[TP, FN],[FP, TN]])
im = ax2.imshow(cm, cmap='Blues')
ax2.set_xticks([0,1]); ax2.set_yticks([0,1])
ax2.set_xticklabels(['Pred MATCH','Pred MISMATCH']); ax2.set_yticklabels(['Act MATCH','Act MISMATCH'])
for i in range(2):
    for j in range(2):
        lab=[['TP','FN'],['FP','TN']][i][j]
        ax2.text(j,i,f"{lab}\n{cm[i,j]}",ha='center',va='center',fontsize=16,fontweight='bold',
                 color='white' if cm[i,j]>n*0.25 else 'black')
ax2.set_title(f"Confusion Matrix (nguong {THRESHOLD})", fontweight='bold')

# (3) Metrics bar
mt=['Accuracy','Precision','Recall','F1-Score']; vv=[acc,prec,rec,f1]
cols=['#2196F3','#4CAF50','#FF9800','#E91E63']
bb=ax3.bar(mt,vv,color=cols,width=0.6,edgecolor='white')
for b,v in zip(bb,vv):
    ax3.text(b.get_x()+b.get_width()/2,b.get_height()+1,f"{v:.1f}%",ha='center',va='bottom',fontsize=13,fontweight='bold')
ax3.set_ylim(0,112); ax3.set_ylabel("%")
ax3.set_title(f"Hieu suat SBERT — {n} ca (domain that)", fontweight='bold')
ax3.grid(axis='y', alpha=0.3)
for s in ['top','right']: ax3.spines[s].set_visible(False)

# (4) Threshold sweep
ax4.plot(ths, acc_sweep, 'o-', color='#2196F3', label='Accuracy', markersize=3)
ax4.plot(ths, f1_sweep, 's-', color='#E91E63', label='F1-Score', markersize=3)
ax4.axvline(THRESHOLD, color='orange', linestyle='--', linewidth=1.5, label=f'Nguong he thong={THRESHOLD}')
ax4.axvline(best_t, color='green', linestyle=':', linewidth=1.5, label=f'Toi uu={best_t:.2f}')
ax4.set_xlabel("Nguong phan loai"); ax4.set_ylabel("%")
ax4.set_title("Quet nguong: Accuracy & F1", fontweight='bold')
ax4.legend(fontsize=9); ax4.grid(alpha=0.3)

fig.suptitle(f"SBERT MiniLM — Danh gia Goi y De tai tren {n} ca (GOI DOMAIN THAT: ai.web3.giangvien.ifanit.io.vn)",
             fontsize=14, fontweight='bold')
fig.tight_layout(rect=[0,0,1,0.97])
out = os.path.join(CHART_DIR, "sbert_100cases_realdomain.png")
fig.savefig(out, bbox_inches='tight'); plt.close(fig)
print(f"Chart: {out}")
print("\nDONE.")
