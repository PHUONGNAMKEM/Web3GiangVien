"""
Script sinh Postman Collection JSON de test PhoBERT accuracy voi 100 PDF.
Yeu cau: ml-service dang chay tai http://127.0.0.1:8001
Cach chay: python gen_postman_phobert100.py
Output: PhoBERT_100Cases_Collection.json
"""
import os, json, requests, uuid, sys

ML_URL = "http://127.0.0.1:8001"

# === DANH SACH FILE + GROUND TRUTH + REQUIREMENTS ===
# Moi entry: (folder, filename, expected_label, topic_requirements)
# expected_label: "MATCH" = bao cao CNTT ky thuat, "MISMATCH" = khong dung linh vuc yeu cau

cases = []

# --- 20 file cu (Day30-05-2026) ---
DIR20 = r"Day30-05-2026\20DetaiTestAccuracyPhoBERT"
cases += [
    (DIR20, "1-nghien-cuu-li-luan-ve-he-thong-quan-li-hoc-tap-truc-tuyen-lms-trong-gd-dh.pdf", "MATCH", ["React","NodeJS","Database","LMS"]),
    (DIR20, "2-do-an-2-he-thong-diem-danh-nhan-dien-khuon-mat-voi-rfid.pdf", "MATCH", ["AI","Python","Deep Learning","RFID"]),
    (DIR20, "3-do-an-mon-nhap-mon-ung-dung-di-dong-quan-ly-chi-tieu-ca-nhan-monee-23520088.pdf", "MATCH", ["Android","Java","Mobile App"]),
    (DIR20, "4-khoa-luan-tot-nghiep-xay-dung-phan-mem-quan-ly-nhan-su-sua-11213942.pdf", "MATCH", ["C#",".NET","SQL Server"]),
    (DIR20, "5-de-tai-nhap-mon-khoa-hoc-du-lieu-2024-phan-tich-du-lieu-mang-xa-hoi.pdf", "MATCH", ["Big Data","Data Mining","Python"]),
    (DIR20, "6-tong-hop-de-tai-khoa-luan-tot-nghiep-ve-an-toan-thong-tin-2023.pdf", "MATCH", ["Security","Network","Bảo mật"]),
    (DIR20, "7-luan-van-tot-nghiep-he-thong-giam-sat-nha-kinh-thong-minh-qua-web-dh-gtvt.pdf", "MATCH", ["IoT","C++","Arduino"]),
    (DIR20, "8-do-an-tot-nghiep-k63-nghien-cuu-kien-truc-microservice-voi-docker-kubernetes.pdf", "MATCH", ["Linux","Docker","Kubernetes","Microservices"]),
    (DIR20, "9-bao-cao-chuyen-de-lap-trinh-blockchain-he-thong-dau-gia-web.pdf", "MATCH", ["Blockchain","Solidity","Web3"]),
    (DIR20, "10-ap-dung-ai-trong-du-doan-gia-co-phieu-hpg-k23ktb-2022-2023.pdf", "MATCH", ["Python","Deep Learning","AI","Machine Learning"]),
    (DIR20, "11-xay-dung-ung-dung-di-dong-doc-sach-de-tai-d17ht.pdf", "MISMATCH", ["Blockchain","Solidity","Web3"]),
    (DIR20, "12-tieu-luan-big-data-va-ung-dung-trong-phan-tich-hanh-vi-nguoi-tieu-dung-its329.pdf", "MISMATCH", ["Swift","iOS","Mobile"]),
    (DIR20, "13-tieu-luan-mon-khoa-hoc-du-lieu-hop-dong-thong-minh-ethereum-va-blockchain.pdf", "MISMATCH", ["Unity","C#","Game Design"]),
    (DIR20, "14-do-an-cuoi-ky-mon-thuong-mai-dien-tu-website-ban-my-pham-oneshop.pdf", "MISMATCH", ["OpenCV","Python","Machine Learning"]),
    (DIR20, "15-k44-khoa-luan-tot-nghiep-ke-toan-doanh-thu-va-chi-phi-tai-lasun.pdf", "MISMATCH", ["C","Embedded Systems","IoT","GPS"]),
    (DIR20, "16-do-an-tot-nghiep-nhan-dang-bien-so-xe-nghien-cuu-he-thong-tu-dong.pdf", "MISMATCH", ["React","NodeJS","MongoDB","E-commerce"]),
    (DIR20, "17-khoa-luan-tot-nghiep-thiet-ke-va-xay-dung-game-2d-11210917.pdf", "MISMATCH", ["Hadoop","Spark","Big Data"]),
    (DIR20, "18-de-tai-nen-tang-dat-va-giao-do-an-truc-tuyen-food-delivery-platform.pdf", "MISMATCH", ["Security","Network","Bảo mật"]),
    (DIR20, "19-dinh-huong-va-dieu-khien-robot-di-dong-tren-co-so-gps-va-cam-bien.pdf", "MISMATCH", ["React","NodeJS","Database","LMS"]),
    (DIR20, "10-du-doan-gia-co-phieu-bang-machine-learning-va-deep-learning-tai-lieu-nghien.pdf", "MISMATCH", ["Android","Java","Mobile App"]),
]

# --- 80 file moi (Day02-06-2026) ---
DIR80 = r"Day02-06-2026\80DeTaiChayTestPhoBERT"
cases80 = [
    ("1-nghien-cuu-ve-phan-loai-viem-phoi-trong-hinh-anh-x-quang-nguc-pmc.pdf", "MATCH", ["AI","Deep Learning","CNN","Medical Imaging"]),
    ("2-nghien-cuu-ve-phan-loai-viem-phoi-trong-hinh-anh-x-quang-nguc-pmc.pdf", "MATCH", ["AI","Deep Learning","CNN","X-ray"]),
    ("3-de-tai-bai-tap-lon-khai-pha-du-lieu-web-phan-tich-cam-xuc.pdf", "MATCH", ["Python","NLP","Web Scraping","Data Mining"]),
    ("4-do-an-iii-ung-dung-he-thong-goi-y-trong-thuong-mai-dien-tu-dh-bk-hn.pdf", "MATCH", ["Machine Learning","Recommendation System","Python"]),
    ("5-do-an-iii-ung-dung-he-thong-goi-y-trong-thuong-mai-dien-tu-dh-bk-hn.pdf", "MATCH", ["Machine Learning","Python","E-commerce"]),
    ("6-danh-gia-hieu-nang-he-thong-ai-chuyen-van-ban-thanh-giong-noi-ho-tro-hskt.pdf", "MATCH", ["AI","TTS","Deep Learning","NLP"]),
    ("7-do-an-cuoi-ky-tong-quan-ve-du-doan-luu-luong-giao-thong-thong-minh.pdf", "MISMATCH", ["Blockchain","Solidity","Smart Contract"]),
    ("8-do-an-tot-nghiep-ky-su-cntt-nhan-dang-sau-benh-cay-san-tren-python.pdf", "MATCH", ["Python","AI","CNN","Image Classification"]),
    ("9-do-an-tot-nghiep-phat-trien-he-thong-tom-tat-van-ban-tu-dong-dua-tren-nlp.pdf", "MATCH", ["NLP","Python","Transformer","Deep Learning"]),
    ("10-tieu-luan-nghien-cuu-khoa-hoc-ung-dung-mo-hinh-transformer-trong-phan-tich-cam.pdf", "MATCH", ["NLP","Transformer","Sentiment Analysis","Python"]),
    ("11-de-cuong-khoa-luan-tot-nghiep-xay-dung-website-quan-ly-chung-chi-blockchain.pdf", "MATCH", ["Blockchain","Web","NodeJS","Smart Contract"]),
    ("12-nghien-cuu-ung-dung-smart-contract-trong-giao-dich-dex-tai-viet-nam.pdf", "MATCH", ["Blockchain","Solidity","DeFi","Smart Contract"]),
    ("13-thuc-tap-tot-nghiep-xay-dung-website-gay-quy-cong-dong-tren-blockchain.pdf", "MATCH", ["Blockchain","Web","Solidity","NodeJS"]),
    ("14-nhan-thuc-ve-ung-dung-blockchain-trong-quan-ly-chuoi-cung-ung-ysc5.pdf", "MISMATCH", ["Python","Machine Learning","AI"]),
    ("15-do-an-tot-nghiep-ct050119-ung-dung-vi-dien-tu-quan-ly-tai-san-crypto.pdf", "MATCH", ["Blockchain","Crypto","Mobile App","React Native"]),
    ("16-bai-tap-nhom-1-tiem-nang-phat-trien-nft-tai-viet-nam-elc3019.pdf", "MISMATCH", ["Python","Django","REST API"]),
    ("17-tieu-luan-phat-trien-ung-dung-iot-cho-bai-do-xe-thong-minh-d15dtktmt.pdf", "MATCH", ["IoT","Arduino","Embedded Systems","C++"]),
    ("18-bao-cao-bai-tap-lon-mon-iot-he-thong-thung-rac-tu-dong-su-dung-esp32.pdf", "MATCH", ["IoT","ESP32","Arduino","Embedded"]),
    ("19-he-thong-aiot-quan-trac-va-du-bao-chat-luong-khong-khi-thoi-gian-thuc.pdf", "MATCH", ["IoT","AI","Python","Sensor"]),
    ("20-do-an-tot-nghiep-thiet-ke-he-thong-nha-thong-minh-dieu-khien-bang-giong-noi.pdf", "MATCH", ["IoT","AI","Voice Recognition","Embedded"]),
    ("21-mgt496-n4-tieu-luan-nhom-vong-tay-du-bao-dong-kinh-cap-cuu-khan-cap.pdf", "MISMATCH", ["React","NodeJS","MongoDB"]),
    ("22-de-tai-tieu-luan-mon-y-tuong-khoi-nghiep-ung-dung-gia-su-truc-tuyen.pdf", "MISMATCH", ["Docker","Kubernetes","DevOps"]),
    ("23-do-an-tot-nghiep-xay-dung-website-chia-se-cong-thuc-nau-an.pdf", "MATCH", ["React","NodeJS","MongoDB","Web"]),
    ("24-do-an-quan-ly-phong-kham-da-khoa-22dthqb03.pdf", "MATCH", ["C#",".NET","SQL Server","Web"]),
    ("25-bai-tap-nhom-nghien-cuu-thi-truong-phan-mem-quan-ly-kho-wms.pdf", "MISMATCH", ["AI","Deep Learning","CNN"]),
    ("26-do-an-mon-hoc-lap-trinh-thiet-bi-di-dong-ung-dung-hoc-tieng-anh.pdf", "MATCH", ["Android","Java","Mobile App","SQLite"]),
    ("27-bao-cao-quan-tri-du-an-cntt-he-thong-thu-vien-dien-tu.pdf", "MISMATCH", ["Blockchain","Solidity","Web3"]),
    ("28-nghien-cuu-ve-giam-sat-thi-truc-tuyen-tac-dong-den-quyen-rieng-tu-va-cam-giac.pdf", "MISMATCH", ["Python","Flask","REST API"]),
    ("29-bao-cao-du-an-to-chuc-su-kien-nho-nhom-sinh-vien.pdf", "MISMATCH", ["Machine Learning","TensorFlow","Python"]),
    ("30-tieu-luan-nhom-31-nghien-cuu-cicd-cho-trien-khai-dich-vu-len-cloud.pdf", "MATCH", ["Docker","CI/CD","Cloud","DevOps"]),
    ("31-bao-cao-thuc-tap-doanh-nghiep-giam-sat-he-thong-bang-prometheus-va-grafana.pdf", "MATCH", ["Prometheus","Grafana","Linux","DevOps"]),
    ("32-bao-cao-tieu-luan-mon-dien-toan-dam-may-nhom-16-ung-dung-kien-truc-serverless.pdf", "MATCH", ["Cloud","AWS","Serverless","Docker"]),
    ("33-do-an-tot-nghiep-k63-nghien-cuu-kien-truc-microservice-voi-docker-kubernetes.pdf", "MATCH", ["Docker","Kubernetes","Microservices","Linux"]),
    ("34-de-tai-do-an-tot-nghiep-he-thong-phat-hien-xam-nhap-mang-ai-21it203.pdf", "MATCH", ["AI","Network Security","Python","IDS"]),
    ("35-btl-n3-tim-hieu-10-lo-hong-owasp-cho-bai-tap-lon-co-so-an-toan-thong-tin.pdf", "MATCH", ["Security","OWASP","Web","Penetration Testing"]),
    ("36-bao-cao-chuyen-de-co-so-ve-phat-hien-ma-doc-dua-tren-sieu-du-lieu-metadata-pe.pdf", "MATCH", ["Security","Malware","Python","Machine Learning"]),
    ("37-do-an-tot-nghiep-he-thong-nhan-dien-va-dem-phuong-tien-giao-thong.pdf", "MATCH", ["AI","Computer Vision","Python","YOLO"]),
    ("38-bao-cao-cuoi-ky-impr432446-nhan-dien-cu-chi-tay-va-ung-dung.pdf", "MATCH", ["AI","Computer Vision","MediaPipe","Python"]),
    ("39-thiet-ke-game-rpg-2d-bang-unity-tieu-luan-mon-lap-trinh-game-3123123.pdf", "MATCH", ["Unity","C#","Game Design","2D"]),
    ("40-khoa-luan-tot-nghiep-thiet-ke-va-xay-dung-game-2d-11210917.pdf", "MATCH", ["Unity","C#","Game Design","2D"]),
    ("41-nghien-cuu-du-doan-khach-hang-roi-bo-dich-vu-vien-thong-khrb.pdf", "MATCH", ["Machine Learning","Python","Data Science"]),
    ("42-bao-cao-de-tai-nghien-cuu-phat-hien-tin-gia-fake-news-detection.pdf", "MATCH", ["NLP","Python","Machine Learning","Classification"]),
    ("43-bao-cao-do-an-i-phan-loai-dong-tac-tap-gym-su-dung-mediapipe-rf-754575.pdf", "MATCH", ["AI","MediaPipe","Python","Classification"]),
    ("44-b2012144-xay-dung-website-thuong-mai-dien-tu-tich-hop-ai-va-chatbot.pdf", "MATCH", ["React","NodeJS","AI","Chatbot","E-commerce"]),
    ("45-crm-ht-bai-toan-phan-nhom-khach-hang-tai-sieu-thi-coopextra-thu-duc.pdf", "MISMATCH", ["Blockchain","Smart Contract","Web3"]),
    ("46-de-tai-xay-dung-he-thong-tro-ly-ao-tu-van-phap-luat-viet-nam-dua-tren-llm-va-ky.pdf", "MATCH", ["AI","LLM","NLP","Python","RAG"]),
    ("47-bao-cao-do-an-thiet-ke-mo-hinh-cnn-nhan-dien-tai-xe-ngu-gat-20242fe6068001.pdf", "MATCH", ["AI","CNN","Python","Computer Vision"]),
    ("48-tieu-luan-giua-ky-243to3501-phan-tich-chuoi-thoi-gian-du-bao-hanh-khach.pdf", "MISMATCH", ["React","NodeJS","Web","MongoDB"]),
    ("49-bao-cao-bai-tap-lon-mo-hinh-dich-may-anh-viet-cse703014.pdf", "MATCH", ["NLP","Transformer","Python","Deep Learning"]),
    ("50-tieu-luan-dat723-241-1-d-ung-dung-hop-dong-thong-minh-trong-bao-hiem-ngan-hang.pdf", "MISMATCH", ["AI","Python","Machine Learning"]),
    ("51-do-an-tot-nghiep-xay-dung-mang-xa-hoi-chia-se-kien-thuc-sinh-vien-bach-khoa.pdf", "MATCH", ["React","NodeJS","MongoDB","Web"]),
    ("52-bao-cao-nckh-ung-dung-blockchain-trong-luu-tru-benh-an-dien-tu-tai-vn.pdf", "MATCH", ["Blockchain","Web","Smart Contract","Healthcare"]),
    ("53-quan-ly-du-an-phat-trien-he-thong-nghe-nhac-truc-tuyen-mon-quan-ly-du-an.pdf", "MISMATCH", ["AI","Deep Learning","TensorFlow"]),
    ("54-de-tai-do-an-nt547-nghien-cuu-va-phat-trien-blockchain.pdf", "MATCH", ["Blockchain","Solidity","Ethereum","Smart Contract"]),
    ("55-khoa-luan-tot-nghiep-thiet-ke-he-thong-tuoi-tu-dong-trong-nong-nghiep-7480108.pdf", "MATCH", ["IoT","Arduino","Embedded","Sensor"]),
    ("56-do-an-tot-nghiep-he-thong-khoa-cua-thong-minh-ung-dung-ai-nhan-dien-khuon-mat.pdf", "MATCH", ["AI","Face Recognition","IoT","Embedded"]),
    ("57-do-an-tot-nghiep-thiet-ke-he-thong-giam-sat-nhip-tim-va-oxy-btl-dt-y-sinh.pdf", "MATCH", ["IoT","Arduino","Embedded","Sensor"]),
    ("58-19375691-final-exam-mang-cam-bien-khong-day-ung-dung.pdf", "MISMATCH", ["React","NodeJS","Web","Database"]),
    ("59-tong-quan-ve-iot-trong-logistics-truong-dh-giao-thong-van-tai-hcm.pdf", "MISMATCH", ["AI","Python","Machine Learning"]),
    ("60-nghien-cuu-he-thong-chieu-sang-thong-minh-tiet-kiem-nang-luong.pdf", "MISMATCH", ["Blockchain","Web3","Solidity"]),
    ("61-nghien-cuu-thiet-bi-da-nang-ho-tro-nguoi-khiem-thi-1448972.pdf", "MISMATCH", ["React","NodeJS","Web"]),
    ("62-bao-cao-do-an-mon-phan-mem-quan-ly-gara-o-to-22521595.pdf", "MATCH", ["C#",".NET","SQL Server","WinForms"]),
    ("63-khoa-luan-tot-nghiep-nang-cao-hieu-qua-su-dung-lao-dong-69dcqt22.pdf", "MISMATCH", ["Python","AI","Deep Learning"]),
    ("64-bao-cao-do-an-csdl-21-he-thong-quan-ly-dat-tiec-cuoi-nha-hang.pdf", "MISMATCH", ["Blockchain","Smart Contract","Web3"]),
    ("65-do-an-1-quan-ly-tour-du-lich-bai-luan-chi-tiet-nghien-cuu.pdf", "MISMATCH", ["AI","Computer Vision","Python"]),
    ("66-du-an-kinh-doanh-quan-ao-secondhand-tai-thu-duc-lap-du-an-dau-tu.pdf", "MISMATCH", ["React","NodeJS","MongoDB"]),
    ("67-do-an-cs-4-xay-dung-ung-dung-tro-choi-co-vua.pdf", "MATCH", ["Java","Android","Game","Algorithm"]),
    ("68-do-an-cs353-phan-tich-thiet-ke-he-thong-quan-ly-nha-tro.pdf", "MATCH", ["UML","Database","SQL","System Design"]),
    ("69-do-an-nhom-he-thong-quan-ly-thanh-vien-phong-gym-tich-hop-chatbot-cs-464.pdf", "MISMATCH", ["IoT","Arduino","Embedded"]),
    ("70-ke-hoach-phuc-hoi-sau-tham-hoa-drp-cho-he-thong-thong-tin-quan-trong.pdf", "MISMATCH", ["AI","Python","Machine Learning"]),
    ("71-do-an-tot-nghiep-xay-dung-nen-tang-data-lakehouse-cho-tin-tuc-nguyen-phuc.pdf", "MATCH", ["Big Data","Spark","Python","Data Engineering"]),
    ("72-do-an-mon-hoc-22it-nghien-cuu-mo-hinh-private-cloud-voi-openstack.pdf", "MISMATCH", ["React","NodeJS","Web"]),
    ("73-nt533q13-do-an-mon-hoc-trien-khai-cicd-pipeline-va-iac.pdf", "MISMATCH", ["AI","Deep Learning","Python"]),
    ("74-do-an-ca-nhan-mon-mang-may-tinh-tim-hieu-ve-ky-thuat-giau-tin-steganography.pdf", "MISMATCH", ["Blockchain","Solidity","Web3"]),
    ("75-nghien-cuu-ky-thuat-honeypot-xay-dung-he-thong-bay-tan-cong-va-phan-tich-log.pdf", "MATCH", ["Security","Linux","Network","Python"]),
    ("76-he-thong-chat-bao-mat-ma-hoa-khoa-luan-tot-nghiep-2025.pdf", "MISMATCH", ["AI","Machine Learning","Python"]),
    ("77-bao-cao-nhap-mon-ky-nang-mem-he-thong-danh-gia-do-manh-mat-khau.pdf", "MISMATCH", ["React","NodeJS","Web"]),
    ("78-giai-phap-nang-cao-hieu-qua-day-hoc-cau-truc-tuan-tu-trong-lap-trinh-scratch-cho.pdf", "MISMATCH", ["Docker","Kubernetes","DevOps"]),
    ("79-htttql-nhom-4-tieu-luan-cuoi-ky-ve-ung-dung-vr-va-ar-tai-ikea-23c1inf.pdf", "MISMATCH", ["Python","Machine Learning","AI"]),
    ("80-do-an-tot-nghiep-nghien-cuu-cong-nghe-thuc-te-ao-va-ung-dung-ktpm2-k7.pdf", "MISMATCH", ["Blockchain","Solidity","Smart Contract"]),
]
for fn, label, reqs in cases80:
    cases.append((DIR80, fn, label, reqs))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"Tong so case: {len(cases)}")
print(f"MATCH: {sum(1 for c in cases if c[2]=='MATCH')} | MISMATCH: {sum(1 for c in cases if c[2]=='MISMATCH')}")

# === KIEM TRA ML-SERVICE ===
try:
    r = requests.get(f"{ML_URL}/health", timeout=5)
    print(f"ML-Service: OK ({r.status_code})")
except:
    print("CANH BAO: Khong ket noi duoc ml-service tai", ML_URL)
    print("Hay chay: uvicorn app:app --host 0.0.0.0 --port 8001 --reload")
    sys.exit(1)

# === EXTRACT TEXT + BUILD COLLECTION ===
items = []
failed = []

for i, (folder, filename, expected, reqs) in enumerate(cases):
    filepath = os.path.join(BASE_DIR, folder, filename)
    case_name = f"Ca {i+1} - {filename[:60]}... ({expected})"
    print(f"[{i+1}/{len(cases)}] {filename[:50]}...", end=" ")

    if not os.path.exists(filepath):
        print("FILE NOT FOUND!")
        failed.append((i+1, filename, "File not found"))
        continue

    # Upload PDF de extract text
    try:
        with open(filepath, "rb") as f:
            resp = requests.post(f"{ML_URL}/extract-pdf", files={"file": (filename, f, "application/pdf")}, timeout=60)
        if resp.status_code != 200:
            print(f"EXTRACT FAIL ({resp.status_code})")
            failed.append((i+1, filename, f"HTTP {resp.status_code}"))
            continue
        data = resp.json()
        text = data.get("text", "")
        if len(text) < 50:
            print(f"TEXT QUA NGAN ({len(text)} chars)")
            failed.append((i+1, filename, f"Text too short: {len(text)}"))
            continue
    except Exception as e:
        print(f"ERROR: {e}")
        failed.append((i+1, filename, str(e)))
        continue

    # Truncate text neu qua dai (Postman collection se rat lon)
    if len(text) > 15000:
        text = text[:15000]

    # Tao Postman request item
    body_obj = {"text": text, "topic_requirements": reqs}
    item = {
        "name": case_name,
        "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {"mode": "raw", "raw": json.dumps(body_obj, ensure_ascii=False)},
            "url": {
                "raw": f"{ML_URL}/analyze-report",
                "protocol": "http",
                "host": ["127","0","0","1"],
                "port": "8001",
                "path": ["analyze-report"]
            }
        },
        "response": []
    }
    items.append(item)
    print(f"OK ({len(text)} chars)")

# === GHI POSTMAN COLLECTION ===
collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "PhoBERT Accuracy Evaluation (100 Cases - Chunking)",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        "description": f"Test PhoBERT accuracy voi {len(items)} PDF. MATCH: bao cao dung linh vuc yeu cau. MISMATCH: bao cao khong dung linh vuc."
    },
    "item": items
}

output_file = os.path.join(BASE_DIR, "PhoBERT_100Cases_Collection.json")
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)

print(f"\n=== HOAN TAT ===")
print(f"Thanh cong: {len(items)}/{len(cases)}")
print(f"That bai: {len(failed)}")
if failed:
    print("\nCac file that bai:")
    for num, fn, reason in failed:
        print(f"  Ca {num}: {fn} - {reason}")
print(f"\nFile output: {output_file}")
print(f"Import file nay vao Postman, chon Run Collection de chay tat ca.")
