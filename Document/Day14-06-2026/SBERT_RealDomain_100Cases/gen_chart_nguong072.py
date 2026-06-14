"""
Ve chart KET QUA tai NGUONG TOI UU 0.72 cho bo 100 ca (domain that).
Doc thang tu SBERT_100Cases_RealDomain_Results.csv (khong hardcode).
Output: charts/sbert_100cases_nguong072.png
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import csv, os

BASE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(BASE, "SBERT_100Cases_RealDomain_Results.csv")
CHART_DIR = os.path.join(BASE, "charts")
os.makedirs(CHART_DIR, exist_ok=True)
T_SYS, T_OPT = 0.75, 0.72

# === DOC DU LIEU ===
truth, scores = [], []
with open(CSV, encoding="utf-8-sig") as f:
    for row in csv.reader(f):
        if not row or not row[0].strip().isdigit():
            continue
        truth.append(1 if row[6].strip() == "MATCH" else 0)   # Nhan thuc te
        scores.append(float(row[7]))                          # match_score
truth = np.array(truth); scores = np.array(scores)
n = len(truth)

def metrics(t):
    p = (scores >= t).astype(int)
    TP = int(np.sum((truth==1)&(p==1))); TN = int(np.sum((truth==0)&(p==0)))
    FP = int(np.sum((truth==0)&(p==1))); FN = int(np.sum((truth==1)&(p==0)))
    acc = (TP+TN)/n*100
    prec = TP/(TP+FP)*100 if (TP+FP) else 0
    rec = TP/(TP+FN)*100 if (TP+FN) else 0
    f1 = 2*prec*rec/(prec+rec) if (prec+rec) else 0
    return dict(TP=TP,TN=TN,FP=FP,FN=FN,acc=acc,prec=prec,rec=rec,f1=f1)

m72 = metrics(T_OPT); m75 = metrics(T_SYS)
print(f"Nguong 0.72 -> TP={m72['TP']} TN={m72['TN']} FP={m72['FP']} FN={m72['FN']} "
      f"| Acc={m72['acc']:.1f}% Prec={m72['prec']:.1f}% Rec={m72['rec']:.1f}% F1={m72['f1']:.1f}%")

plt.rcParams['font.size'] = 11
plt.rcParams['figure.dpi'] = 150
fig, axes = plt.subplots(2, 2, figsize=(15, 11))
ax1, ax2, ax3, ax4 = axes.ravel()

# (1) Confusion matrix @ 0.72
cm = np.array([[m72['TP'], m72['FN']],[m72['FP'], m72['TN']]])
ax1.imshow(cm, cmap='Purples')
ax1.set_xticks([0,1]); ax1.set_yticks([0,1])
ax1.set_xticklabels(['Pred MATCH','Pred MISMATCH']); ax1.set_yticklabels(['Act MATCH','Act MISMATCH'])
for i in range(2):
    for j in range(2):
        lab=[['TP','FN'],['FP','TN']][i][j]
        ax1.text(j,i,f"{lab}\n{cm[i,j]}",ha='center',va='center',fontsize=17,fontweight='bold',
                 color='white' if cm[i,j]>n*0.25 else 'black')
ax1.set_title(f"Confusion Matrix — nguong toi uu {T_OPT}", fontweight='bold')

# (2) Metrics bar @ 0.72
mt=['Accuracy','Precision','Recall','F1-Score']
vv=[m72['acc'],m72['prec'],m72['rec'],m72['f1']]
cols=['#2196F3','#4CAF50','#FF9800','#E91E63']
bb=ax2.bar(mt,vv,color=cols,width=0.6,edgecolor='white')
for b,v in zip(bb,vv):
    ax2.text(b.get_x()+b.get_width()/2,b.get_height()+1,f"{v:.1f}%",ha='center',va='bottom',fontsize=13,fontweight='bold')
ax2.set_ylim(0,112); ax2.set_ylabel("%")
ax2.set_title(f"Hieu suat SBERT — nguong {T_OPT} ({n} ca, domain that)", fontweight='bold')
ax2.grid(axis='y', alpha=0.3)
for s in ['top','right']: ax2.spines[s].set_visible(False)

# (3) So sanh 0.75 vs 0.72
x=np.arange(4); w=0.38
v75=[m75['acc'],m75['prec'],m75['rec'],m75['f1']]
v72=[m72['acc'],m72['prec'],m72['rec'],m72['f1']]
b1=ax3.bar(x-w/2,v75,w,label=f'Nguong he thong {T_SYS}',color='#FF7043',edgecolor='white')
b2=ax3.bar(x+w/2,v72,w,label=f'Nguong toi uu {T_OPT}',color='#42A5F5',edgecolor='white')
for bars in (b1,b2):
    for b in bars:
        ax3.text(b.get_x()+b.get_width()/2,b.get_height()+1,f"{b.get_height():.0f}",ha='center',va='bottom',fontsize=10,fontweight='bold')
ax3.set_xticks(x); ax3.set_xticklabels(mt); ax3.set_ylim(0,112); ax3.set_ylabel("%")
ax3.set_title("So sanh: nguong 0.75 vs 0.72", fontweight='bold')
ax3.legend(fontsize=10); ax3.grid(axis='y',alpha=0.3)
for s in ['top','right']: ax3.spines[s].set_visible(False)

# (4) Phan bo diem + 2 nguong (lam ro phan FN duoc "cuu" khi ha xuong 0.72)
ms_s=scores[truth==1]; mis_s=scores[truth==0]; bins=np.arange(0.5,1.02,0.03)
ax4.hist(ms_s,bins=bins,alpha=0.7,color='#4CAF50',label=f'MATCH (n={len(ms_s)})',edgecolor='white')
ax4.hist(mis_s,bins=bins,alpha=0.7,color='#F44336',label=f'MISMATCH (n={len(mis_s)})',edgecolor='white')
ax4.axvline(T_SYS,color='#FF7043',linestyle='--',linewidth=2,label=f'Nguong he thong {T_SYS}')
ax4.axvline(T_OPT,color='#1565C0',linestyle='-',linewidth=2,label=f'Nguong toi uu {T_OPT}')
ax4.axvspan(T_OPT,T_SYS,alpha=0.15,color='gold')
recovered = int(np.sum((truth==1)&(scores>=T_OPT)&(scores<T_SYS)))
ax4.text((T_OPT+T_SYS)/2,ax4.get_ylim()[1]*0.9,f"+{recovered} ca MATCH\nduoc cuu",ha='center',fontsize=9,color='#8a6d00',fontweight='bold')
ax4.set_xlabel("match_score (domain that)"); ax4.set_ylabel("So ca")
ax4.set_title("Phan bo diem: ha 0.75 -> 0.72 cuu duoc cac ca MATCH bi sot", fontweight='bold')
ax4.legend(fontsize=9); ax4.grid(axis='y',alpha=0.3)

fig.suptitle(f"SBERT — KET QUA TAI NGUONG TOI UU {T_OPT} (100 ca, domain that)\n"
             f"Accuracy {m72['acc']:.0f}%  |  F1 {m72['f1']:.1f}%  |  TP={m72['TP']} TN={m72['TN']} FP={m72['FP']} FN={m72['FN']}",
             fontsize=14, fontweight='bold')
fig.tight_layout(rect=[0,0,1,0.95])
out = os.path.join(CHART_DIR, "sbert_100cases_nguong072.png")
fig.savefig(out, bbox_inches='tight'); plt.close(fig)
print("Chart:", out)
