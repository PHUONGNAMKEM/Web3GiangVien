"""Phan tich ket qua PhoBERT 100 cases va xuat CSV"""
import csv, os

# Score va feedback tu Postman (100 cases)
results = [
    (5.88,"đạt"),(7.52,"đạt"),(5.0,"Cần"),(6.13,"đạt"),(5.0,"Cần"),
    (5.18,"Cần"),(6.02,"đạt"),(6.24,"đạt"),(8.5,"đạt"),(5.83,"đạt"),
    (5.0,"Cần"),(4.97,"Cần"),(5.0,"Cần"),(4.78,"Cần"),(5.54,"đạt"),
    (5.0,"Cần"),(4.92,"Cần"),(6.17,"đạt"),(5.0,"Cần"),(5.0,"Cần"),
    # 80 cases moi
    (7.62,"đạt"),(5.88,"đạt"),(6.47,"đạt"),(4.91,"Cần"),(6.12,"đạt"),
    (8.47,"đạt"),(5.0,"Cần"),(6.72,"đạt"),(7.6,"đạt"),(7.53,"đạt"),
    (7.62,"đạt"),(7.62,"đạt"),(7.57,"đạt"),(6.17,"đạt"),(6.64,"đạt"),
    (5.0,"Cần"),(5.79,"đạt"),(7.62,"đạt"),(6.75,"đạt"),(6.75,"đạt"),
    (5.0,"Cần"),(5.0,"Cần"),(5.88,"đạt"),(5.0,"Cần"),(6.17,"đạt"),
    (6.75,"đạt"),(4.95,"Cần"),(5.0,"Cần"),(4.95,"Cần"),(7.62,"đạt"),
    (7.59,"đạt"),(6.68,"đạt"),(6.24,"đạt"),(6.75,"đạt"),(7.62,"đạt"),
    (5.67,"đạt"),(7.62,"đạt"),(7.53,"đạt"),(6.75,"đạt"),(6.67,"đạt"),
    (5.0,"Cần"),(8.4,"đạt"),(8.5,"đạt"),(7.1,"đạt"),(5.0,"Cần"),
    (7.78,"đạt"),(8.47,"đạt"),(4.85,"Cần"),(7.62,"đạt"),(6.14,"đạt"),
    (5.63,"đạt"),(6.75,"đạt"),(6.05,"đạt"),(6.66,"đạt"),(5.88,"đạt"),
    (5.88,"đạt"),(6.64,"đạt"),(4.94,"Cần"),(6.14,"đạt"),(4.97,"Cần"),
    (6.17,"đạt"),(5.84,"đạt"),(6.17,"đạt"),(4.96,"Cần"),(6.17,"đạt"),
    (4.97,"Cần"),(5.84,"đạt"),(5.44,"đạt"),(4.92,"Cần"),(6.17,"đạt"),
    (5.88,"đạt"),(4.94,"Cần"),(6.12,"đạt"),(4.85,"Cần"),(5.88,"đạt"),
    (6.17,"đạt"),(6.11,"đạt"),(5.0,"Cần"),(6.17,"đạt"),(5.0,"Cần"),
]

# Expected: 1=MATCH, 0=MISMATCH (tu gen_postman script)
# 20 cases cu
expected_20 = [1,1,1,1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0,0,0]
# 80 cases moi (theo thu tu trong script)
expected_80 = [
    1,1,1,1,1,1,0,1,1,1,  # file 1-10
    1,1,1,0,1,0,1,1,1,1,  # file 11-20
    0,0,1,1,0,1,0,0,0,1,  # file 21-30
    1,1,1,1,1,1,1,1,1,1,  # file 31-40
    1,1,1,1,0,1,1,0,1,0,  # file 41-50
    1,1,0,1,1,1,1,0,0,0,  # file 51-60
    0,1,0,0,0,0,1,1,0,0,  # file 61-70
    1,0,0,0,1,0,0,0,0,0,  # file 71-80
]
expected = expected_20 + expected_80

# Filenames
files_20 = [
    "1-nghien-cuu-li-luan-ve-he-thong-quan-li-hoc-tap-truc-tuyen-lms-trong-gd-dh.pdf",
    "2-do-an-2-he-thong-diem-danh-nhan-dien-khuon-mat-voi-rfid.pdf",
    "3-do-an-mon-nhap-mon-ung-dung-di-dong-quan-ly-chi-tieu-ca-nhan-monee-23520088.pdf",
    "4-khoa-luan-tot-nghiep-xay-dung-phan-mem-quan-ly-nhan-su-sua-11213942.pdf",
    "5-de-tai-nhap-mon-khoa-hoc-du-lieu-2024-phan-tich-du-lieu-mang-xa-hoi.pdf",
    "6-tong-hop-de-tai-khoa-luan-tot-nghiep-ve-an-toan-thong-tin-2023.pdf",
    "7-luan-van-tot-nghiep-he-thong-giam-sat-nha-kinh-thong-minh-qua-web-dh-gtvt.pdf",
    "8-do-an-tot-nghiep-k63-nghien-cuu-kien-truc-microservice-voi-docker-kubernetes.pdf",
    "9-bao-cao-chuyen-de-lap-trinh-blockchain-he-thong-dau-gia-web.pdf",
    "10-ap-dung-ai-trong-du-doan-gia-co-phieu-hpg-k23ktb-2022-2023.pdf",
    "11-xay-dung-ung-dung-di-dong-doc-sach-de-tai-d17ht.pdf",
    "12-tieu-luan-big-data-va-ung-dung-trong-phan-tich-hanh-vi-nguoi-tieu-dung-its329.pdf",
    "13-tieu-luan-mon-khoa-hoc-du-lieu-hop-dong-thong-minh-ethereum-va-blockchain.pdf",
    "14-do-an-cuoi-ky-mon-thuong-mai-dien-tu-website-ban-my-pham-oneshop.pdf",
    "15-k44-khoa-luan-tot-nghiep-ke-toan-doanh-thu-va-chi-phi-tai-lasun.pdf",
    "16-do-an-tot-nghiep-nhan-dang-bien-so-xe-nghien-cuu-he-thong-tu-dong.pdf",
    "17-khoa-luan-tot-nghiep-thiet-ke-va-xay-dung-game-2d-11210917.pdf",
    "18-de-tai-nen-tang-dat-va-giao-do-an-truc-tuyen-food-delivery-platform.pdf",
    "19-dinh-huong-va-dieu-khien-robot-di-dong-tren-co-so-gps-va-cam-bien.pdf",
    "10-du-doan-gia-co-phieu-bang-machine-learning-va-deep-learning-tai-lieu-nghien.pdf",
]
files_80 = [
    "1-nghien-cuu-ve-phan-loai-viem-phoi-trong-hinh-anh-x-quang-nguc-pmc.pdf",
    "2-nghien-cuu-ve-phan-loai-viem-phoi-trong-hinh-anh-x-quang-nguc-pmc.pdf",
    "3-de-tai-bai-tap-lon-khai-pha-du-lieu-web-phan-tich-cam-xuc.pdf",
    "4-do-an-iii-ung-dung-he-thong-goi-y-trong-thuong-mai-dien-tu-dh-bk-hn.pdf",
    "5-do-an-iii-ung-dung-he-thong-goi-y-trong-thuong-mai-dien-tu-dh-bk-hn.pdf",
    "6-danh-gia-hieu-nang-he-thong-ai-chuyen-van-ban-thanh-giong-noi-ho-tro-hskt.pdf",
    "7-do-an-cuoi-ky-tong-quan-ve-du-doan-luu-luong-giao-thong-thong-minh.pdf",
    "8-do-an-tot-nghiep-ky-su-cntt-nhan-dang-sau-benh-cay-san-tren-python.pdf",
    "9-do-an-tot-nghiep-phat-trien-he-thong-tom-tat-van-ban-tu-dong-dua-tren-nlp.pdf",
    "10-tieu-luan-nghien-cuu-khoa-hoc-ung-dung-mo-hinh-transformer-trong-phan-tich-cam.pdf",
    "11-de-cuong-khoa-luan-tot-nghiep-xay-dung-website-quan-ly-chung-chi-blockchain.pdf",
    "12-nghien-cuu-ung-dung-smart-contract-trong-giao-dich-dex-tai-viet-nam.pdf",
    "13-thuc-tap-tot-nghiep-xay-dung-website-gay-quy-cong-dong-tren-blockchain.pdf",
    "14-nhan-thuc-ve-ung-dung-blockchain-trong-quan-ly-chuoi-cung-ung-ysc5.pdf",
    "15-do-an-tot-nghiep-ct050119-ung-dung-vi-dien-tu-quan-ly-tai-san-crypto.pdf",
    "16-bai-tap-nhom-1-tiem-nang-phat-trien-nft-tai-viet-nam-elc3019.pdf",
    "17-tieu-luan-phat-trien-ung-dung-iot-cho-bai-do-xe-thong-minh-d15dtktmt.pdf",
    "18-bao-cao-bai-tap-lon-mon-iot-he-thong-thung-rac-tu-dong-su-dung-esp32.pdf",
    "19-he-thong-aiot-quan-trac-va-du-bao-chat-luong-khong-khi-thoi-gian-thuc.pdf",
    "20-do-an-tot-nghiep-thiet-ke-he-thong-nha-thong-minh-dieu-khien-bang-giong-noi.pdf",
    "21-mgt496-n4-tieu-luan-nhom-vong-tay-du-bao-dong-kinh-cap-cuu-khan-cap.pdf",
    "22-de-tai-tieu-luan-mon-y-tuong-khoi-nghiep-ung-dung-gia-su-truc-tuyen.pdf",
    "23-do-an-tot-nghiep-xay-dung-website-chia-se-cong-thuc-nau-an.pdf",
    "24-do-an-quan-ly-phong-kham-da-khoa-22dthqb03.pdf",
    "25-bai-tap-nhom-nghien-cuu-thi-truong-phan-mem-quan-ly-kho-wms.pdf",
    "26-do-an-mon-hoc-lap-trinh-thiet-bi-di-dong-ung-dung-hoc-tieng-anh.pdf",
    "27-bao-cao-quan-tri-du-an-cntt-he-thong-thu-vien-dien-tu.pdf",
    "28-nghien-cuu-ve-giam-sat-thi-truc-tuyen-tac-dong-den-quyen-rieng-tu-va-cam-giac.pdf",
    "29-bao-cao-du-an-to-chuc-su-kien-nho-nhom-sinh-vien.pdf",
    "30-tieu-luan-nhom-31-nghien-cuu-cicd-cho-trien-khai-dich-vu-len-cloud.pdf",
    "31-bao-cao-thuc-tap-doanh-nghiep-giam-sat-he-thong-bang-prometheus-va-grafana.pdf",
    "32-bao-cao-tieu-luan-mon-dien-toan-dam-may-nhom-16-ung-dung-kien-truc-serverless.pdf",
    "33-do-an-tot-nghiep-k63-nghien-cuu-kien-truc-microservice-voi-docker-kubernetes.pdf",
    "34-de-tai-do-an-tot-nghiep-he-thong-phat-hien-xam-nhap-mang-ai-21it203.pdf",
    "35-btl-n3-tim-hieu-10-lo-hong-owasp-cho-bai-tap-lon-co-so-an-toan-thong-tin.pdf",
    "36-bao-cao-chuyen-de-co-so-ve-phat-hien-ma-doc-dua-tren-sieu-du-lieu-metadata-pe.pdf",
    "37-do-an-tot-nghiep-he-thong-nhan-dien-va-dem-phuong-tien-giao-thong.pdf",
    "38-bao-cao-cuoi-ky-impr432446-nhan-dien-cu-chi-tay-va-ung-dung.pdf",
    "39-thiet-ke-game-rpg-2d-bang-unity-tieu-luan-mon-lap-trinh-game-3123123.pdf",
    "40-khoa-luan-tot-nghiep-thiet-ke-va-xay-dung-game-2d-11210917.pdf",
    "41-nghien-cuu-du-doan-khach-hang-roi-bo-dich-vu-vien-thong-khrb.pdf",
    "42-bao-cao-de-tai-nghien-cuu-phat-hien-tin-gia-fake-news-detection.pdf",
    "43-bao-cao-do-an-i-phan-loai-dong-tac-tap-gym-su-dung-mediapipe-rf-754575.pdf",
    "44-b2012144-xay-dung-website-thuong-mai-dien-tu-tich-hop-ai-va-chatbot.pdf",
    "45-crm-ht-bai-toan-phan-nhom-khach-hang-tai-sieu-thi-coopextra-thu-duc.pdf",
    "46-de-tai-xay-dung-he-thong-tro-ly-ao-tu-van-phap-luat-viet-nam-dua-tren-llm-va-ky.pdf",
    "47-bao-cao-do-an-thiet-ke-mo-hinh-cnn-nhan-dien-tai-xe-ngu-gat-20242fe6068001.pdf",
    "48-tieu-luan-giua-ky-243to3501-phan-tich-chuoi-thoi-gian-du-bao-hanh-khach.pdf",
    "49-bao-cao-bai-tap-lon-mo-hinh-dich-may-anh-viet-cse703014.pdf",
    "50-tieu-luan-dat723-241-1-d-ung-dung-hop-dong-thong-minh-trong-bao-hiem-ngan-hang.pdf",
    "51-do-an-tot-nghiep-xay-dung-mang-xa-hoi-chia-se-kien-thuc-sinh-vien-bach-khoa.pdf",
    "52-bao-cao-nckh-ung-dung-blockchain-trong-luu-tru-benh-an-dien-tu-tai-vn.pdf",
    "53-quan-ly-du-an-phat-trien-he-thong-nghe-nhac-truc-tuyen-mon-quan-ly-du-an.pdf",
    "54-de-tai-do-an-nt547-nghien-cuu-va-phat-trien-blockchain.pdf",
    "55-khoa-luan-tot-nghiep-thiet-ke-he-thong-tuoi-tu-dong-trong-nong-nghiep-7480108.pdf",
    "56-do-an-tot-nghiep-he-thong-khoa-cua-thong-minh-ung-dung-ai-nhan-dien-khuon-mat.pdf",
    "57-do-an-tot-nghiep-thiet-ke-he-thong-giam-sat-nhip-tim-va-oxy-btl-dt-y-sinh.pdf",
    "58-19375691-final-exam-mang-cam-bien-khong-day-ung-dung.pdf",
    "59-tong-quan-ve-iot-trong-logistics-truong-dh-giao-thong-van-tai-hcm.pdf",
    "60-nghien-cuu-he-thong-chieu-sang-thong-minh-tiet-kiem-nang-luong.pdf",
    "61-nghien-cuu-thiet-bi-da-nang-ho-tro-nguoi-khiem-thi-1448972.pdf",
    "62-bao-cao-do-an-mon-phan-mem-quan-ly-gara-o-to-22521595.pdf",
    "63-khoa-luan-tot-nghiep-nang-cao-hieu-qua-su-dung-lao-dong-69dcqt22.pdf",
    "64-bao-cao-do-an-csdl-21-he-thong-quan-ly-dat-tiec-cuoi-nha-hang.pdf",
    "65-do-an-1-quan-ly-tour-du-lich-bai-luan-chi-tiet-nghien-cuu.pdf",
    "66-du-an-kinh-doanh-quan-ao-secondhand-tai-thu-duc-lap-du-an-dau-tu.pdf",
    "67-do-an-cs-4-xay-dung-ung-dung-tro-choi-co-vua.pdf",
    "68-do-an-cs353-phan-tich-thiet-ke-he-thong-quan-ly-nha-tro.pdf",
    "69-do-an-nhom-he-thong-quan-ly-thanh-vien-phong-gym-tich-hop-chatbot-cs-464.pdf",
    "70-ke-hoach-phuc-hoi-sau-tham-hoa-drp-cho-he-thong-thong-tin-quan-trong.pdf",
    "71-do-an-tot-nghiep-xay-dung-nen-tang-data-lakehouse-cho-tin-tuc-nguyen-phuc.pdf",
    "72-do-an-mon-hoc-22it-nghien-cuu-mo-hinh-private-cloud-voi-openstack.pdf",
    "73-nt533q13-do-an-mon-hoc-trien-khai-cicd-pipeline-va-iac.pdf",
    "74-do-an-ca-nhan-mon-mang-may-tinh-tim-hieu-ve-ky-thuat-giau-tin-steganography.pdf",
    "75-nghien-cuu-ky-thuat-honeypot-xay-dung-he-thong-bay-tan-cong-va-phan-tich-log.pdf",
    "76-he-thong-chat-bao-mat-ma-hoa-khoa-luan-tot-nghiep-2025.pdf",
    "77-bao-cao-nhap-mon-ky-nang-mem-he-thong-danh-gia-do-manh-mat-khau.pdf",
    "78-giai-phap-nang-cao-hieu-qua-day-hoc-cau-truc-tuan-tu-trong-lap-trinh-scratch-cho.pdf",
    "79-htttql-nhom-4-tieu-luan-cuoi-ky-ve-ung-dung-vr-va-ar-tai-ikea-23c1inf.pdf",
    "80-do-an-tot-nghiep-nghien-cuu-cong-nghe-thuc-te-ao-va-ung-dung-ktpm2-k7.pdf",
]
filenames = files_20 + files_80

# Predict: "đạt" = MATCH(1), "Cần" = MISMATCH(0)
predictions = [1 if fb == "đạt" else 0 for _, fb in results]
scores = [s for s, _ in results]

# Confusion matrix
TP = sum(1 for e,p in zip(expected,predictions) if e==1 and p==1)
TN = sum(1 for e,p in zip(expected,predictions) if e==0 and p==0)
FP = sum(1 for e,p in zip(expected,predictions) if e==0 and p==1)
FN = sum(1 for e,p in zip(expected,predictions) if e==1 and p==0)

accuracy = (TP+TN) / len(expected)
precision = TP/(TP+FP) if (TP+FP)>0 else 0
recall = TP/(TP+FN) if (TP+FN)>0 else 0
f1 = 2*precision*recall/(precision+recall) if (precision+recall)>0 else 0

# Result labels
def get_result(e, p):
    if e==1 and p==1: return "True Positive (TP)"
    if e==0 and p==0: return "True Negative (TN)"
    if e==0 and p==1: return "False Positive (FP)"
    return "False Negative (FN)"

# Output folder
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Day03-06-2026")
os.makedirs(out_dir, exist_ok=True)

# Write CSV
csv_path = os.path.join(out_dir, "PhoBERT_Chunking_100Cases_Results.csv")
with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Test Case","Report Source","PhoBERT Score","Expected (Ground Truth)","PhoBERT Prediction","Result"])
    for i in range(len(expected)):
        e_label = f"MATCH (1)" if expected[i]==1 else f"MISMATCH (0)"
        p_label = f"MATCH (1)" if predictions[i]==1 else f"MISMATCH (0)"
        result = get_result(expected[i], predictions[i])
        w.writerow([f"Ca {i+1}", filenames[i], scores[i], e_label, p_label, result])
    # Summary rows
    w.writerow([])
    w.writerow(["=== TONG KET ==="])
    w.writerow(["Total Cases", len(expected)])
    w.writerow(["MATCH cases", sum(expected)])
    w.writerow(["MISMATCH cases", len(expected)-sum(expected)])
    w.writerow(["TP", TP])
    w.writerow(["TN", TN])
    w.writerow(["FP", FP])
    w.writerow(["FN", FN])
    w.writerow(["Accuracy", f"{accuracy:.4f}", f"{accuracy*100:.2f}%"])
    w.writerow(["Precision", f"{precision:.4f}", f"{precision*100:.2f}%"])
    w.writerow(["Recall", f"{recall:.4f}", f"{recall*100:.2f}%"])
    w.writerow(["F1-Score", f"{f1:.4f}", f"{f1*100:.2f}%"])

print(f"CSV saved: {csv_path}")
print(f"\n{'='*40}")
print(f"TONG KET PhoBERT Chunking (100 cases)")
print(f"{'='*40}")
print(f"MATCH cases:    {sum(expected)}")
print(f"MISMATCH cases: {len(expected)-sum(expected)}")
print(f"TP={TP}  TN={TN}  FP={FP}  FN={FN}")
print(f"Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
print(f"Precision: {precision:.4f} ({precision*100:.2f}%)")
print(f"Recall:    {recall:.4f} ({recall*100:.2f}%)")
print(f"F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
