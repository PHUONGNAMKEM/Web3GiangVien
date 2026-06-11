# Bài Báo Cáo PDF Được Chấm Như Thế Nào? (Bản Dễ Hiểu)

> Bản giải thích đơn giản, không cần biết code. Bản chi tiết xem [xu_ly_bao_cao_pdf_chi_tiet.md](./xu_ly_bao_cao_pdf_chi_tiet.md).
> Cập nhật theo phiên bản mới nhất (11/06/2026): đã có **nhận xét bằng Gemini**, **cache không chấm lại**, và **thanh tiến độ %**.

---

## Hình dung tổng quát

Hãy tưởng tượng chấm bài giống một **dây chuyền nhà máy**:

```
📄 PDF  →  📖 Đọc chữ  →  ✂️ Cắt thành nhiều phần  →  🧠 AI đọc hiểu  →  🔢 Tính điểm  →  📝 Viết nhận xét
```

Mỗi khâu một nhiệm vụ, làm xong chuyển sang khâu sau.

---

## Bước 1: Đọc chữ trong PDF 📖

Hệ thống mở file PDF và **đọc hết chữ ở MỌI trang**, không bỏ trang nào.

- File PDF bình thường → đọc chữ trực tiếp.
- File PDF là **ảnh chụp/scan** (không có chữ máy) → dùng **OCR** (như "nhận diện chữ trong ảnh") để đọc.

> 💡 Trên màn hình bạn sẽ thấy dòng *"Hệ thống đã đọc 25 trang bài làm"* — đó là số trang thật đã đọc được.

---

## Bước 2: Cắt bài thành nhiều phần nhỏ ✂️

Bài dài quá thì AI đọc không xuể, nên cắt thành **nhiều khúc nhỏ** (gọi là "chunk").

- Nếu bài có **đề mục rõ ràng** (Chương 1, Mục 2.1, I., a)...) → cắt theo đề mục.
- Nếu **không có đề mục** → cắt theo đoạn văn, rồi theo dòng, cuối cùng cắt theo độ dài.

> 💡 Dù bài viết kiểu gì, hệ thống **luôn cắt hết từ đầu đến cuối**, không sót chữ nào.
>
> *(Trước đây có lỗi khiến hệ thống không nhận ra đề mục — nay đã sửa.)*

---

## Bước 3: AI đọc hiểu từng phần 🧠

Đây là lúc **PhoBERT** (AI hiểu tiếng Việt của Việt Nam) vào cuộc.

PhoBERT chỉ giỏi đúng 1 việc: **"Hai đoạn văn này có giống nhau về ý nghĩa không?"** → trả về một con số từ 0 (khác hẳn) đến 1 (giống hệt).

> 💡 PhoBERT đọc mỗi lần tối đa được một lượng chữ nhất định. Phần dài thì nó **đọc nhiều lần rồi gộp lại**, nên giờ **đọc hết** chứ không bỏ phần sau.
>
> *(Trước đây phần sau của mỗi khúc bị bỏ qua — nay đã sửa.)*

---

## Bước 4: Tính điểm — có 2 kiểu chấm 🔢

### Kiểu A: Đề tài KHÔNG có barem (Rubrics)

Giống **chấm nhanh**: chỉ xem bài có đúng chủ đề không.

```
Bắt đầu 5.0 điểm (ai cũng có)
  + thưởng nếu nhắc đúng từ khóa đề tài (tối đa +1.5)
  + thưởng nếu AI thấy nội dung liên quan (tối đa +2.5)
  − phạt nếu phát hiện copy-paste
= Điểm cuối (cao nhất 9.0)
```

> 💡 Kiểu này cao nhất là **9.0 điểm**. Muốn 9–10 thì phải chấm theo barem (Kiểu B).

### Kiểu B: Đề tài CÓ barem (Rubrics)

Giống **chấm theo bảng tiêu chí**, ví dụ:

| Tiêu chí | Trọng số |
|----------|---------|
| Lý thuyết Blockchain | 30% |
| Phân tích Smart Contract | 40% |
| Ứng dụng DEX tại VN | 30% |

Với mỗi tiêu chí, AI xem **phần nào trong bài giống tiêu chí đó nhất**, rồi cho điểm.

Bảng quy đổi (độ giống → điểm, thang 10):

| Độ giống | Điểm |
|----------|------|
| 0.45 | ~6.75 |
| 0.55 | ~8.25 |
| 0.65 | ~9.75 |
| 0.70 trở lên | 10 |

Điểm cuối = trung bình có trọng số của tất cả tiêu chí.

> 💡 Hệ số quy đổi vừa được nâng từ **1.3 lên 1.5**, nên bài tốt giờ được điểm xứng đáng hơn (trước đây bị thấp).

---

## Bước 5: Viết nhận xét 📝

### Cách mặc định (do code viết sẵn)

Hệ thống tự ghép câu nhận xét dựa trên điểm:

| Điểm tiêu chí | Nhận xét |
|---------------|---------|
| Cao (≥ 70%) | "Tốt" |
| Trung bình (≥ 50%) | "Khá" |
| Thấp | "Yếu" |

> 💡 Trước đây có lỗi: bài điểm thấp vẫn ghi "Tốt". Nay **nhận xét luôn khớp với điểm thật**.

### Cách mới: nhận xét bằng Gemini ✨ (có nút bật/tắt)

Nhận xét tự viết khá khô. Nên có thêm **một nút gạt "Nhận xét AI (Gemini)"** cho giảng viên:

- **Bật** → Gemini đọc điểm + kết quả các tiêu chí, rồi viết một đoạn nhận xét **tự nhiên như giảng viên thật**.
- **Tắt** → quay lại nhận xét mặc định.

> 💡 **Gemini KHÔNG chấm điểm** — điểm vẫn do PhoBERT. Gemini chỉ "diễn đạt lại cho hay".

**Ví dụ nhận xét Gemini:**
> *"Báo cáo đã trình bày tốt cơ sở lý thuyết về Blockchain. Tuy nhiên phần phân tích Smart Contract cần đi sâu hơn. Đặc biệt nội dung về sàn DEX tại Việt Nam còn thiếu, cần bổ sung..."*

**Tiết kiệm chi phí:** Gemini chỉ được gọi **1 lần/bài**. Bật/tắt lại, đóng mở lại, hay tải lại trang đều **dùng kết quả đã lưu**, không gọi lại (vì gọi Gemini tốn tiền).

---

## Hai tiện ích mới khác

### 🔁 Không chấm lại khi tải lại trang
Sau khi đã chấm 1 bài, nếu giảng viên tải lại trang và mở lại bài đó, hệ thống **dùng kết quả đã lưu**, không bắt AI làm lại từ đầu. (Trừ khi sinh viên **nộp lại bài mới** thì mới chấm lại.)

### ⏳ Thanh tiến độ phần trăm
Lúc AI đang chấm, thay vì vòng tròn xoay mãi, giờ có **vòng tròn phần trăm thật** (màu cầu vồng kiểu Google) cho biết đã xử lý bao nhiêu phần / bao nhiêu chunk / bao nhiêu trang.

---

## Tóm tắt 1 dòng

> Bài PDF được **đọc hết mọi trang** → **cắt nhỏ** → **AI PhoBERT đọc hiểu** → **chấm điểm** (2 kiểu) → **viết nhận xét** (mặc định hoặc bật Gemini cho hay) → **lưu lại** để khỏi chấm lại, kèm **thanh tiến độ %** khi đang chạy.
