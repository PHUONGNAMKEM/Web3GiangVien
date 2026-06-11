# PhoBERT Chấm Điểm Như Thế Nào? (Bản Dễ Hiểu)

> Bản giải thích đơn giản. Bản chi tiết xem tại [phobert_scoring_analysis.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/3b5b0f61-4cd3-4505-80a0-bac29e13bbab/phobert_scoring_analysis.md).

---

## PhoBERT là gì?

PhoBERT là một "bộ não AI" do VinAI (Việt Nam) tạo ra, chuyên **đọc hiểu tiếng Việt**.

Nhưng PhoBERT **không biết chấm điểm**. Nó chỉ biết làm 1 việc duy nhất:

> **"Hai đoạn văn này có giống nhau về ý nghĩa không?"**

Kết quả trả về là một con số từ **0.0** (hoàn toàn khác nhau) đến **1.0** (giống hệt nhau). Con số này gọi là **cosine similarity**.

**Ví dụ:**
| So sánh | Similarity |
|---------|-----------|
| "Smart Contract" vs "Hợp đồng thông minh trên Blockchain" | ~0.55 |
| "Smart Contract" vs "Công thức nấu phở" | ~0.15 |
| "Smart Contract" vs "Smart Contract Ethereum Solidity" | ~0.75 |

→ Toàn bộ phần **tính điểm, viết nhận xét** đều là **công thức do lập trình viên tự viết**, không phải PhoBERT tự chấm.

---

## Hệ thống đọc bài báo cáo như thế nào?

Hãy tưởng tượng bài báo cáo PDF là **một cuốn sách**:

1. **Bước 1:** Hệ thống "đọc" file PDF, lấy ra toàn bộ chữ bên trong
2. **Bước 2:** Chia cuốn sách thành **nhiều chương nhỏ** (gọi là "chunk")
   - Nếu PDF có heading rõ ràng (Chương 1, Mục 2.1...) → chia theo heading
   - Nếu không có heading → chia theo đoạn văn, mỗi phần tối đa ~600 từ
3. **Bước 3:** Cho PhoBERT đọc **từng chương** một, rồi so sánh với yêu cầu đề tài

> [!NOTE]
> **Hệ thống đọc TOÀN BỘ bài báo cáo**, không bỏ sót. Con số 600 từ chỉ là kích thước tối đa của mỗi phần nhỏ sau khi chia.
>
> Ví dụ: bài 3000 từ → chia thành 5 phần, mỗi phần ~600 từ → PhoBERT đọc cả 5 phần.

---

## Cách chấm điểm: 2 chế độ

### Chế độ 1: Đề tài KHÔNG CÓ Rubrics

Hãy tưởng tượng như **chấm thi đơn giản**: giám khảo chỉ kiểm tra "bài có đề cập đúng chủ đề không?".

**Cách tính điểm:**

```
Bắt đầu từ 5.0 điểm (điểm sàn cho mọi bài)
    + Thưởng nếu bài có nhắc đến từ khóa của đề tài (tối đa +1.5)
    + Thưởng nếu PhoBERT thấy nội dung liên quan đề tài (tối đa +2.0)  
    − Phạt nếu phát hiện copy-paste / lặp lại (tối đa −3.0)
────────────────────────────────────────────────
= Điểm cuối cùng (kẹp trong khoảng 0 → 10)
```

**Nói đơn giản:**
- Nộp bài có chữ → **ít nhất 5 điểm**
- Bài đề cập đúng chủ đề → **lên 6-7 điểm**
- Bài đề cập đầy đủ tất cả yêu cầu → **lên ~8 điểm**
- Copy-paste nhiều → **bị trừ nặng**

> [!WARNING]
> **Vấn đề:** Điểm tối đa lý thuyết chỉ khoảng **8.5/10**. Dù bài viết hoàn hảo cũng không thể đạt 9 hay 10 điểm ở chế độ này.

---

### Chế độ 2: Đề tài CÓ Rubrics

Hãy tưởng tượng như **chấm thi theo bảng điểm chi tiết**: giám khảo kiểm tra từng tiêu chí một.

**Ví dụ:** Rubrics có 3 tiêu chí:

| Tiêu chí | Trọng số |
|----------|---------|
| Cơ sở lý thuyết Blockchain | 30% |
| Phân tích Smart Contract | 40% |
| Ứng dụng sàn DEX tại VN | 30% |

**Cách chấm từng tiêu chí:**

```
Bước 1: PhoBERT so sánh bài báo cáo với tiêu chí
         → Cho ra "độ giống nhau" (similarity), ví dụ: 0.50

Bước 2: Kiểm tra từ khóa gợi ý có xuất hiện trong bài không
         → Cho ra "tỷ lệ từ khóa", ví dụ: 0.40

Bước 3: Trộn lại:  70% × similarity + 30% × từ khóa = điểm pha trộn
         → 70% × 0.50 + 30% × 0.40 = 0.47

Bước 4: Quy ra thang 10:  0.47 × 10 × 1.3 = 6.11 điểm
```

**Tổng điểm cuối cùng** = trung bình có trọng số của tất cả tiêu chí.

**Nói đơn giản:**
- PhoBERT đọc bài → so sánh với từng tiêu chí → cho ra độ giống nhau
- Độ giống ~0.45 → điểm ~5.8
- Độ giống ~0.55 → điểm ~7.1
- Độ giống ~0.65 → điểm ~8.5
- Muốn 10 điểm → độ giống phải đạt ~0.77 (rất hiếm)

---

## Phần nhận xét (feedback) được viết ra sao?

### Nhận xét từng tiêu chí

Hệ thống so sánh điểm similarity của tiêu chí đó **với chính nó ở các phần khác** trong bài:

- Nếu phần tốt nhất **nổi bật hơn mức trung bình** → ghi **"Tốt"**
- Nếu ở **mức trung bình** → ghi **"Khá"**  
- Nếu **thấp hơn mức trung bình** → ghi **"Yếu"**

### Nhận xét tổng hợp

Dựa trên **tổng điểm cuối cùng**:

| Điểm | Nhận xét |
|------|---------|
| Dưới 5 | "Báo cáo chưa đạt yêu cầu. Cần bổ sung và cải thiện." |
| 5 – 6.9 | "Báo cáo đạt mức trung bình. Cần cải thiện: [danh sách]." |
| 7 – 8.4 | "Báo cáo khá tốt, đáp ứng phần lớn tiêu chí." |
| 8.5+ | "Báo cáo tốt, đáp ứng đầy đủ các tiêu chí." |

---

## Tóm tắt: AI làm gì, mình viết code gì?

| Phần | Ai làm? | Giải thích |
|------|---------|-----------|
| Đọc PDF, lấy text | **Code tự viết** | Dùng thư viện PyPDF2 hoặc OCR |
| Chia bài thành chunks | **Code tự viết** | Regex detect heading hoặc chia theo đoạn |
| Hiểu nghĩa tiếng Việt | **PhoBERT AI** ✨ | Biến text thành vector số (embedding) |
| Tính độ giống nhau | **Công thức toán** | Cosine similarity — công thức chuẩn, không tự sáng tạo |
| Quy ra điểm số | **Code tự viết** | Hệ số ×1.3, base 5.0, trộn 70/30... |
| Viết nhận xét | **Code tự viết** | If/else dựa trên ngưỡng điểm |

> **Kết luận:** PhoBERT chỉ đóng vai trò **"đọc hiểu"** — giống như một học sinh đọc bài rồi nói "bài này giống đề bài khoảng 50%". Còn việc **"50% = mấy điểm?"** và **"viết nhận xét gì?"** là do lập trình viên quyết định bằng code.

---

## ⚠️ Các vấn đề đang gặp phải

### Vấn đề 1: Nói "Tốt" nhưng điểm chỉ 5-6

**Hiện tượng:** Cả 3 tiêu chí đều ghi "Tốt" nhưng điểm chỉ 5-6/10.

**Nguyên nhân:** Khi bài chỉ có 1 phần duy nhất ("Phần 1"), hệ thống không có gì để so sánh → tự động đánh giá "Tốt" cho mọi tiêu chí, bất kể similarity cao hay thấp.

**Hình dung:** Giống như bạn thi chạy một mình → luôn về nhất, dù chạy chậm.

---

### Vấn đề 2: Tất cả tiêu chí match vào "Phần 1"

**Hiện tượng:** Cả 3 tiêu chí đều ghi "Matched: Phần 1".

**Nguyên nhân:** PDF không có heading rõ ràng (Chương 1, Mục 2.1...) VÀ nội dung sau extract ≤600 từ → chỉ tạo được 1 chunk duy nhất.

---

### Vấn đề 3: Điểm hiếm khi vượt 7

**Hiện tượng:** Hầu hết bài đều rơi vào khoảng 4-6 điểm.

**Nguyên nhân:** PhoBERT thường cho similarity ~0.4-0.55 cho văn bản tiếng Việt. Hệ số nhân ×1.3 quá thấp để kéo điểm lên vùng 8-9.

---

### Vấn đề 4: Không rubrics → max ~8.5

**Hiện tượng:** Dù bài hoàn hảo, không rubrics thì điểm max chỉ ~8.5.

**Nguyên nhân:** Công thức cộng dồn: 5.0 + 1.5 + 2.0 = 8.5. Không có đường nào lên 9-10.

---

## 💡 Hướng cải thiện đề xuất

| # | Fix gì | Cách làm | Hiệu quả |
|---|--------|----------|----------|
| 1 | Nhận xét mâu thuẫn | Đổi nhận xét theo **điểm thực tế** (≥7 → "Tốt", ≥5 → "Khá", <5 → "Yếu") thay vì adaptive threshold | Nhận xét sẽ khớp với điểm |
| 2 | Điểm quá thấp (rubrics) | Tăng hệ số từ `×1.3` lên `×1.6` hoặc `×1.8` | Sim 0.5 → 8 điểm thay vì 6.5 |
| 3 | Chỉ 1 "Phần 1" | Giảm max_words xuống 300 hoặc bổ sung regex heading (I., II., a), b)...) | Tạo nhiều chunks hơn → match đa dạng hơn |
| 4 | Max 8.5 (không rubrics) | Tăng semantic_bonus max từ 2.0 lên 3.0 | Trần điểm lên ~9.5 |
