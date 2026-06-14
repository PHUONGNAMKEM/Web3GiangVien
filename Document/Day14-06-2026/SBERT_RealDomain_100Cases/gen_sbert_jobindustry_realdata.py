"""
================================================================================
TEST BO SUNG: SBERT tren DU LIEU THAT (tin tuyen dung -> nganh nghe)
================================================================================
Nguon: Document/Day30-05-2026/AccuracyAndF1/SBERT/raw_data.csv (40.097 dong that)
Muc dich: Danh gia kha nang TONG QUAT HOA cua engine SBERT tren van ban tieng Viet
          THUC TE (bo tro cho test student<->topic CNTT).
Reframe: requirements (yeu cau cong viec) <-> nganh nghe.
         MATCH = nganh dung | MISMATCH = nganh sai.
Goi DOMAIN THAT: https://ai.web3.giangvien.ifanit.io.vn/match-student
Chay: python gen_sbert_jobindustry_realdata.py
================================================================================
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import requests, csv, os, time, random, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

API_URL = "https://ai.web3.giangvien.ifanit.io.vn/match-student"
THRESHOLD = 0.75
BASE = os.path.dirname(os.path.abspath(__file__))
CHART_DIR = os.path.join(BASE, "charts")
os.makedirs(CHART_DIR, exist_ok=True)
RAW = os.path.join(BASE, "..", "..", "Day30-05-2026", "AccuracyAndF1", "SBERT", "raw_data.csv")

# 15 nganh dai dien (du dong nhan sach, gom ca IT)
TARGET_INDUSTRIES = [
    "Kinh doanh","Marketing","Quản lý điều hành","IT Phần mềm","Kế toán",
    "Chăm sóc khách hàng","Giáo dục - Đào tạo","Thiết kế - Sáng tạo nghệ thuật",
    "Ngân hàng","Nhân sự","Cơ khí","Xây dựng","Điện - Điện tử",
    "IT Phần cứng - Mạng - Viễn Thông","Kiểm toán",
]
PER_INDUSTRY = 5     # 15 x 5 = 75 MATCH + 75 MISMATCH = 150 ca
random.seed(2026)

# === DOC + LOC DONG NHAN SACH (chi 1 nganh) ===
buckets = {ind: [] for ind in TARGET_INDUSTRIES}
with open(RAW, encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        labels = [x.strip() for x in (row.get("mapped_industry") or "").split(",") if x.strip()]
        req = (row.get("requirements") or "").strip()
        if len(labels) == 1 and labels[0] in buckets and len(req) >= 60:
            buckets[labels[0]].append(req[:600])   # cat ngan ~600 ky tu

for ind in TARGET_INDUSTRIES:
    random.shuffle(buckets[ind])
    print(f"  {ind}: {len(buckets[ind])} dong nhan sach")

# === SINH 150 CA ===
cases = []  # (req_text, industry_true, industry_topic, label)
for ind in TARGET_INDUSTRIES:
    picked = buckets[ind][:PER_INDUSTRY]
    for req in picked:
        # MATCH: nganh dung
        cases.append((req, ind, ind, 1))
        # MISMATCH: nganh sai (khac han)
        wrong = random.choice([x for x in TARGET_INDUSTRIES if x != ind])
        cases.append((req, ind, wrong, 0))
random.shuffle(cases)
print(f"\nTong so ca: {len(cases)} | Match: {sum(c[3] for c in cases)} | Mismatch: {sum(1-c[3] for c in cases)}")

# === GOI DOMAIN THAT ===
print(f"\nGoi API that: {API_URL}\n" + "="*60)
rows = []; fails = 0
for idx, (req, ind_true, ind_topic, label) in enumerate(cases, 1):
    payload = {"student": {"gpa": 8.0, "major_scores": {req: 8.0}},
               "topics": [{"topic_id": f"job_{idx}", "requirements": [ind_topic]}]}
    score = None
    for attempt in range(3):
        try:
            r = requests.post(API_URL, json=payload, timeout=60)
            if r.status_code == 200:
                score = r.json()["recommendations"][0]["match_score"]; break
            time.sleep(1.5)
        except Exception as e:
            print(f"  [ca {idx}] LOI: {e}"); time.sleep(2)
    if score is None:
        fails += 1; continue
    pred = 1 if score >= THRESHOLD else 0
    rows.append([idx, ind_true, ind_topic, label, score, pred])
    if idx % 15 == 0:
        print(f"  [{idx:>3}/{len(cases)}] ...dang chay (score moi nhat={score:.3f})")
    time.sleep(0.1)
print("="*60); print(f"Thanh cong: {len(rows)} | That bai: {fails}")

# === METRICS ===
truth = np.array([r[3] for r in rows]); scores = np.array([r[4] for r in rows])
pred = (scores >= THRESHOLD).astype(int)
TP=int(np.sum((truth==1)&(pred==1))); TN=int(np.sum((truth==0)&(pred==0)))
FP=int(np.sum((truth==0)&(pred==1))); FN=int(np.sum((truth==1)&(pred==0)))
n=len(truth); acc=(TP+TN)/n*100
prec=TP/(TP+FP)*100 if (TP+FP) else 0; rec=TP/(TP+FN)*100 if (TP+FN) else 0
f1=2*prec*rec/(prec+rec) if (prec+rec) else 0
print(f"\n=== KET QUA (nguong {THRESHOLD}) ===")
print(f"N={n} TP={TP} TN={TN} FP={FP} FN={FN}")
print(f"Accuracy={acc:.2f}% Precision={prec:.2f}% Recall={rec:.2f}% F1={f1:.2f}%")

ths=np.arange(0.55,0.91,0.01); acc_s=[]; f1_s=[]
for t in ths:
    p=(scores>=t).astype(int)
    tp=np.sum((truth==1)&(p==1));tn=np.sum((truth==0)&(p==0))
    fp=np.sum((truth==0)&(p==1));fn=np.sum((truth==1)&(p==0))
    a=(tp+tn)/n*100; pr=tp/(tp+fp)*100 if (tp+fp) else 0; rc=tp/(tp+fn)*100 if (tp+fn) else 0
    acc_s.append(a); f1_s.append(2*pr*rc/(pr+rc) if (pr+rc) else 0)
bi=int(np.argmax(f1_s)); bt=ths[bi]
print(f"Nguong toi uu (F1 max): {bt:.2f} -> Acc={acc_s[bi]:.1f}% F1={f1_s[bi]:.1f}%")

# === CSV ===
csv_path = os.path.join(BASE, "SBERT_JobIndustry_RealData_Results.csv")
with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
    w=csv.writer(f)
    w.writerow(["STT","Nganh that (job)","Nganh dem so khop","Nhan","match_score (domain that)","Du doan (>=0.75)"])
    for r in rows:
        w.writerow([r[0],r[1],r[2],"MATCH" if r[3]==1 else "MISMATCH",f"{r[4]:.4f}","MATCH" if r[5]==1 else "MISMATCH"])
    w.writerow([]); w.writerow(["=== TONG KET (nguong 0.75) ==="])
    for k,v in [("Total",n),("TP",TP),("TN",TN),("FP",FP),("FN",FN),
                ("Accuracy",f"{acc:.2f}%"),("Precision",f"{prec:.2f}%"),
                ("Recall",f"{rec:.2f}%"),("F1-Score",f"{f1:.2f}%"),
                ("Nguong toi uu",f"{bt:.2f} (F1={f1_s[bi]:.1f}%)")]:
        w.writerow([k,v])
print("CSV:", csv_path)

# === CHART 2x2 ===
plt.rcParams['font.size']=11; plt.rcParams['figure.dpi']=150
fig,axes=plt.subplots(2,2,figsize=(15,11)); ax1,ax2,ax3,ax4=axes.ravel()
ms_s=scores[truth==1]; mis_s=scores[truth==0]; bins=np.arange(0.4,1.02,0.04)
ax1.hist(ms_s,bins=bins,alpha=0.7,color='#4CAF50',label=f'MATCH (n={len(ms_s)})',edgecolor='white')
ax1.hist(mis_s,bins=bins,alpha=0.7,color='#F44336',label=f'MISMATCH (n={len(mis_s)})',edgecolor='white')
ax1.axvline(THRESHOLD,color='orange',linestyle='--',linewidth=2,label=f'Nguong={THRESHOLD}')
ax1.set_xlabel("match_score (domain that)"); ax1.set_ylabel("So ca")
ax1.set_title("Phan bo diem — du lieu THAT (job->nganh)",fontweight='bold'); ax1.legend(fontsize=9); ax1.grid(axis='y',alpha=0.3)
cm=np.array([[TP,FN],[FP,TN]]); ax2.imshow(cm,cmap='Greens')
ax2.set_xticks([0,1]);ax2.set_yticks([0,1]);ax2.set_xticklabels(['Pred MATCH','Pred MISMATCH']);ax2.set_yticklabels(['Act MATCH','Act MISMATCH'])
for i in range(2):
    for j in range(2):
        lab=[['TP','FN'],['FP','TN']][i][j]
        ax2.text(j,i,f"{lab}\n{cm[i,j]}",ha='center',va='center',fontsize=16,fontweight='bold',color='white' if cm[i,j]>n*0.25 else 'black')
ax2.set_title(f"Confusion Matrix (nguong {THRESHOLD})",fontweight='bold')
mt=['Accuracy','Precision','Recall','F1-Score']; vv=[acc,prec,rec,f1]; cols=['#2196F3','#4CAF50','#FF9800','#E91E63']
bb=ax3.bar(mt,vv,color=cols,width=0.6,edgecolor='white')
for b,v in zip(bb,vv): ax3.text(b.get_x()+b.get_width()/2,b.get_height()+1,f"{v:.1f}%",ha='center',va='bottom',fontsize=13,fontweight='bold')
ax3.set_ylim(0,112);ax3.set_ylabel("%");ax3.set_title(f"Hieu suat SBERT — {n} ca DU LIEU THAT",fontweight='bold');ax3.grid(axis='y',alpha=0.3)
for s in ['top','right']: ax3.spines[s].set_visible(False)
ax4.plot(ths,acc_s,'o-',color='#2196F3',label='Accuracy',markersize=3)
ax4.plot(ths,f1_s,'s-',color='#E91E63',label='F1-Score',markersize=3)
ax4.axvline(THRESHOLD,color='orange',linestyle='--',linewidth=1.5,label=f'Nguong he thong={THRESHOLD}')
ax4.axvline(bt,color='green',linestyle=':',linewidth=1.5,label=f'Toi uu={bt:.2f}')
ax4.set_xlabel("Nguong");ax4.set_ylabel("%");ax4.set_title("Quet nguong: Accuracy & F1",fontweight='bold');ax4.legend(fontsize=9);ax4.grid(alpha=0.3)
fig.suptitle(f"SBERT tren DU LIEU THAT (40k tin tuyen dung) — {n} ca qua domain that",fontsize=14,fontweight='bold')
fig.tight_layout(rect=[0,0,1,0.97])
out=os.path.join(CHART_DIR,"sbert_jobindustry_realdata.png"); fig.savefig(out,bbox_inches='tight'); plt.close(fig)
print("Chart:", out); print("\nDONE.")
