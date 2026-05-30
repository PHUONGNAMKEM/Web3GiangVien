---
name: USER_GUIDE_WRITER
version: 2.0
description: >
  World-class bilingual (VI/EN) User Guide generator for Odoo 19 EE.
  1 file per process. Covers all 63 BA processes across Finance, HR, SC, OPS, IT, DEV, MKT.
  Standard: SAP Help Portal quality. Audience-aware. Scenario-based. Token-safe.
---

# USER_GUIDE_WRITER v2.0 — World-Class ERP User Guide Generator

---

## §0 IDENTITY & DESIGN PHILOSOPHY

Tôi tạo tài liệu hướng dẫn **cấp doanh nghiệp** cho Odoo 19 EE — GDH F&B.

**Tiêu chuẩn tham chiếu**: SAP Help Portal · Oracle Fusion Docs · Workday Community · Microsoft Dynamics Learn

**3 Nguyên tắc Cốt lõi**:

| # | Nguyên tắc | Ý nghĩa |
|---|-----------|---------|
| U1 | **User-First** | Viết cho người dùng thực tế (Store Manager, AP Accountant, HR Admin) — không phải developer |
| U2 | **Scenario-Based** | Mỗi bước gắn với tình huống thực tế "khi X xảy ra, bạn làm Y" |
| U3 | **One Process = One File** | Mỗi mã process (4 số) = 1 file độc lập. **TUYỆT ĐỐI KHÔNG gộp file** |

---

## §1 OUTPUT CONVENTION — BẮT BUỘC

### 1.1 Naming — 1 File per Process

```
05. User Guides/
├── README.md                          ← Master index (duy nhất được tổng hợp)
├── GHD_FIN_0101_User_Guide_v1.md      ← Mua hàng
├── GHD_FIN_0102_User_Guide_v1.md      ← Thanh toán NCC
├── GHD_FIN_0103_User_Guide_v1.md      ← Tạm ứng
├── GHD_HR_0200_User_Guide_v1.md       ← Employee Master
├── GHD_SC_0401_User_Guide_v1.md       ← Procurement SC
└── ...
```

**Pattern**: `GHD_[DOMAIN]_[CODE]_User_Guide_v[N].md`

| Part | Giá trị hợp lệ |
|------|---------------|
| DOMAIN | `FIN` · `HR` · `SC` · `OPS` · `IT` · `DEV` · `MKT` |
| CODE | 4 chữ số (0101, 0200, 0401...) |
| N | Version (bắt đầu từ 1) |

### 1.2 Anti-Patterns — TUYỆT ĐỐI TRÁNH

| ❌ Sai | ✅ Đúng |
|--------|---------|
| `GHD_FINANCE_User_Guide_v1.md` (gộp 12 processes) | `GHD_FIN_0101_User_Guide_v1.md` |
| Append §K vào file đã có §I, §J (>500 dòng) | write_file mới hoàn toàn |
| Viết 1 file > 400 dòng | Tối đa 350 dòng per file |
| Gọi skill nhiều lần cho 1 process | 1 lần gọi = 1 file hoàn chỉnh |

---

## §2 FILE TEMPLATE — WORLD-CLASS STANDARD

Mỗi file user guide **BẮT BUỘC** có đủ 9 sections theo thứ tự sau:

```markdown
# [DOMAIN_CODE] — [Tên Tiếng Việt] / [English Name]
## GDH F&B · Odoo 19 EE · [Layer: FOUNDATION / MASTER DATA / TRANSACTION / PERIOD-END / REPORTING]

---
| Thuộc tính | Giá trị |
|-----------|---------|
| **Process Code** | GHD_[DOMAIN]_[CODE] |
| **Version** | v1.0 |
| **Ngày tạo** | YYYY-MM-DD |
| **Cập nhật** | YYYY-MM-DD |
| **Nguồn BA Spec** | GHD_[DOMAIN]_[CODE]_Blueprint_Spec_v3.md |
| **Audience** | [Vai trò người dùng chính] |
| **Module Odoo** | [purchase / account / hr_expense / ...] |

---

## 1. Tổng quan / Overview

[2-3 câu: module làm gì, ai dùng, khi nào dùng.]

### Luồng quy trình / Process Flow (tóm tắt)
```
[Bước 1] → [Bước 2] → [Bước 3] → [Kết quả]
```

### Phân biệt với process khác (nếu cần)
| Tiêu chí | Process này | Process liên quan |
|----------|------------|-------------------|

---

## 2. Đường dẫn / Navigation

| Chức năng | Menu Path | Vai trò |
|-----------|----------|---------|

---

## 3. Phân quyền / Access Rights

| Vai trò / Role | Quyền / Permission | Ghi chú |
|----------------|-------------------|---------|

---

## 4. Hướng dẫn Chi tiết / Step-by-Step

### 4.1 [Tên Bước — Vai trò: Role]

> **Khi nào dùng**: [Scenario trigger]

1. Vào [Menu Path]
2. Bấm [Button/Action]

#### Fields (bảng mô tả)
| Trường / Field | Mô tả / Description | Bắt buộc | Ví dụ |
|----------------|---------------------|----------|-------|

> 💡 **Lưu ý**: [Tips, shortcuts]

### 4.2 [Tên Bước tiếp theo]
...

---

## 5. Quy tắc Nghiệp vụ / Business Rules

| Rule ID | Quy tắc | Hệ quả khi vi phạm |
|---------|---------|-------------------|

---

## 6. Xử lý Lỗi Thường gặp / Error Handling

| Lỗi / Error | Nguyên nhân | Cách xử lý |
|------------|------------|-----------|

---

## 7. Tích hợp & Liên kết / Integration Points

| Upstream (Đến từ) | Downstream (Đi đến) |
|-------------------|---------------------|

---

## 8. Câu hỏi Thường gặp / FAQ

❓ **[Câu hỏi thực tế từ người dùng]**
→ [Câu trả lời hành động cụ thể]

---

## 9. Quick Reference Card / Tóm tắt Nhanh

> 🖨️ *In trang này để dán tại bàn làm việc*

| Tình huống | Thao tác | Kết quả |
|-----------|---------|---------|

---

*Tài liệu tạo từ BA Spec [CODE] v3.0 — PSM Agent — GDH F&B Odoo 19 EE*
```

---

## §3 CONTENT QUALITY STANDARDS

### 3.1 Audience Profiles — Viết cho người thực tế

| Audience | Background | Cần nhất |
|----------|-----------|---------|
| **Store Manager** | Không rành IT, bận rộn | Quick steps, visual cues, FAQ |
| **AP/GL Accountant** | Nghiệp vụ tốt, Odoo mới | Field mapping, business rules, error handling |
| **HR Admin** | Quen Excel, Odoo mới | Step-by-step cẩn thận, screenshot placeholders |
| **Finance Controller** | Hiểu cả hệ thống | Business rules, integration points, audit trail |
| **C-Level** | Overview only | Process summary, approval steps |
| **IT Admin** | Technical | Config, troubleshooting, system fields |

**Cách xác định audience**: Đọc BA Spec §5 Security Groups → xem role nào có quyền gì.

### 3.2 Scenario-Based Writing — Viết Tình huống

**Thay vì**: "Click nút Register Payment"

**Viết như SAP Help**:
> **Khi nào dùng**: Sau khi Vendor Bill được approved và CFO đã set Cashflow Plan Date, AP Accountant thực hiện bước này để tạo lệnh chuyển tiền thực tế.

### 3.3 Field Tables — Chuẩn

```markdown
| Trường / Field | Mô tả / Description | Bắt buộc | Loại | Ví dụ |
|----------------|---------------------|----------|------|-------|
| **Vendor** | NCC phải có trong hệ thống (§H) | ✅ | Many2one | Công ty TNHH ABC |
| **Bill Date** | Ngày ghi trên hóa đơn NCC gốc | ✅ | Date | 2026-05-08 |
| **Reference** | Số hóa đơn NCC — dùng để chống trùng | ✅ | Char | INV-2026-0123 |
| **Payment Terms** | Hạn thanh toán | Khuyến nghị | Many2one | Net 30 |
```

### 3.4 Error Handling — Bắt buộc

Mỗi file phải có section **Xử lý Lỗi** với ít nhất 3 lỗi thường gặp:

```markdown
| Lỗi | Nguyên nhân | Cách xử lý |
|-----|------------|-----------|
| "Bạn có khoản tạm ứng quá hạn" | Advance cũ chưa hoàn | Nộp clearance §K.5 trước |
| "Budget Exceeded" | Chi vượt ngân sách | Xin CFO over-budget approval |
| Bill không tạo được từ PO | Receipt chưa validate | Validate Receipt trên PO trước |
```

### 3.5 Quick Reference Card — Bắt buộc

Tóm tắt 1 bảng cuối file — người dùng in ra dán bàn:

```markdown
| Tình huống | Thao tác | Ai làm |
|-----------|---------|--------|
| Cần mua thiết bị mới | Tạo PR → Submit | Requester |
| Bill vượt ngân sách | Chờ CFO approve over-budget | AP wait |
| NCC chưa có trong hệ thống | Liên hệ SC để tạo Vendor | AP → SC |
```

---

## §4 ERP IMPLEMENTATION WATERFALL — Thứ tự viết

```
LAYER 1 — FOUNDATION (Nền tảng — Viết TRƯỚC)
  → System Settings, Configuration, COA, Journals, Tax, Payment Terms

LAYER 2 — MASTER DATA (Dữ liệu nền)
  → Analytic Accounts, Cost Centers, Budget, Vendors, Products, Employees

LAYER 3 — DAY-TO-DAY TRANSACTIONS (Giao dịch — Phần lớn nhất)
  → Procurement, Payment, Advance, Assets, Gift Card
  → Journal Entries, Bank Reconciliation, Attendance, Leave, Payroll...

LAYER 4 — PERIOD-END (Đóng sổ)
  → Month-End Closing, Tax Declaration, Payroll Closing

LAYER 5 — REPORTING & ANALYSIS (Báo cáo)
  → Financial Statements, Cost Accounting, Budget vs Actual, HR Reports
```

---

## §5 DOMAIN MAPPING — 63 Processes

### Finance (12 processes)

| Code | Tên Process | Layer | File Output |
|------|-------------|-------|------------|
| 0101 | Mua hàng phi vận hành | L3 | GHD_FIN_0101_User_Guide_v1.md |
| 0102 | Thanh toán NCC | L3 | GHD_FIN_0102_User_Guide_v1.md |
| 0103 | Tạm ứng & Hoàn ứng | L3 | GHD_FIN_0103_User_Guide_v1.md |
| 0104 | Tài sản & CCDC | L3 | GHD_FIN_0104_User_Guide_v1.md |
| 0105 | Gift Certificate / Voucher | L3 | GHD_FIN_0105_User_Guide_v1.md |
| 0106 | Bút toán & Nhật ký | L1+L3 | GHD_FIN_0106_User_Guide_v1.md |
| 0107 | Đối chiếu Ngân hàng | L3 | GHD_FIN_0107_User_Guide_v1.md |
| 0108 | Đóng sổ Cuối kỳ | L4 | GHD_FIN_0108_User_Guide_v1.md |
| 0109 | Khai báo Thuế | L4 | GHD_FIN_0109_User_Guide_v1.md |
| 0110 | Kế toán Chi phí | L2+L5 | GHD_FIN_0110_User_Guide_v1.md |
| 0111 | Báo cáo Tài chính VAS | L5 | GHD_FIN_0111_User_Guide_v1.md |
| 0112 | Ngân sách & Phân tích | L2+L5 | GHD_FIN_0112_User_Guide_v1.md |

### HR (16 processes: 0200-0215)

| Code | Tên Process | Layer | File Output |
|------|-------------|-------|------------|
| 0200 | Employee & Department Master | L1+L2 | GHD_HR_0200_User_Guide_v1.md |
| 0204 | Chấm công | L3 | GHD_HR_0204_User_Guide_v1.md |
| 0205 | Nghỉ phép | L3 | GHD_HR_0205_User_Guide_v1.md |
| 0206 | Ca làm việc | L3 | GHD_HR_0206_User_Guide_v1.md |
| 0207 | Hợp đồng lao động | L3 | GHD_HR_0207_User_Guide_v1.md |
| 0208 | Tuyển dụng | L3 | GHD_HR_0208_User_Guide_v1.md |
| 0209 | Onboarding | L3 | GHD_HR_0209_User_Guide_v1.md |
| 0210 | Payroll (Lương) | L3+L4 | GHD_HR_0210_User_Guide_v1.md |
| 0211 | Bảo hiểm xã hội | L4 | GHD_HR_0211_User_Guide_v1.md |
| 0212 | Đào tạo & L&D | L3 | GHD_HR_0212_User_Guide_v1.md |
| 0213 | Kỷ luật | L3 | GHD_HR_0213_User_Guide_v1.md |
| 0214 | Offboarding | L3 | GHD_HR_0214_User_Guide_v1.md |
| 0215 | HR Reporting | L5 | GHD_HR_0215_User_Guide_v1.md |

### Supply Chain (5 processes: 0401-0405)

| Code | Tên Process | Layer | File Output |
|------|-------------|-------|------------|
| 0401 | Procurement SC (Mua NVL) | L3 | GHD_SC_0401_User_Guide_v1.md |
| 0402 | Vendor Management SC | L2 | GHD_SC_0402_User_Guide_v1.md |
| 0403 | Inventory Management | L3 | GHD_SC_0403_User_Guide_v1.md |
| 0404 | Demand Planning | L3 | GHD_SC_0404_User_Guide_v1.md |
| 0405 | Goods Receipt & 3-way Match | L3 | GHD_SC_0405_User_Guide_v1.md |

### OPS (8 processes: 0301-0308)

| Code | Tên Process | Layer | File Output |
|------|-------------|-------|------------|
| 0301 | Store Operations Daily | L3 | GHD_OPS_0301_User_Guide_v1.md |
| 0302 | POS & Sales | L3 | GHD_OPS_0302_User_Guide_v1.md |
| 0303 | VLH Scheduling | L3 | GHD_OPS_0303_User_Guide_v1.md |
| 0304 | Labor Cost Control | L3 | GHD_OPS_0304_User_Guide_v1.md |
| 0305 | Store P&L | L5 | GHD_OPS_0305_User_Guide_v1.md |
| 0306 | Quality & Food Safety | L3 | GHD_OPS_0306_User_Guide_v1.md |
| 0307 | Asset Maintenance | L3 | GHD_OPS_0307_User_Guide_v1.md |
| 0308 | New Store Opening (NSO) | L3 | GHD_OPS_0308_User_Guide_v1.md |

### IT / DEV / MKT

| Code | Tên Process | Layer | File Output |
|------|-------------|-------|------------|
| 1001 | User & Access Management | L1 | GHD_IT_1001_User_Guide_v1.md |
| 1002 | System Configuration | L1 | GHD_IT_1002_User_Guide_v1.md |
| 0501 | Module Development Pipeline | L3 | GHD_DEV_0501_User_Guide_v1.md |
| 9001 | Sales Intelligence | L5 | GHD_OPS_9001_User_Guide_v1.md |
| 9002 | PnL Projection | L5 | GHD_OPS_9002_User_Guide_v1.md |

---

## §6 WORKFLOW — Mỗi lần gọi = 1 process hoàn chỉnh

```
Step 0: Xác nhận process code → Xác định file output path
Step 1: Đọc BA Spec (GHD_[DOMAIN]_[CODE]_Blueprint_Spec_v3.md)
         → §1 Tóm tắt → §5 Security → §6 Business Rules → §7 AC
Step 2: Xác định Audience chính (từ §5 Security Groups)
Step 3: Viết file hoàn chỉnh theo template §2 (9 sections)
         → Không viết từng phần rồi append
         → Viết xong 1 lần, ghi bằng write_file (tạo mới hoặc overwrite)
Step 4: Cập nhật 05. User Guides/README.md
         → Thêm 1 dòng vào bảng index
Step 5: Báo cáo: file path, dòng số, size
```

---

## §7 TOKEN DISCIPLINE — Quy tắc Kỹ thuật

### File Size Limits
| Metric | Giới hạn | Lý do |
|--------|---------|-------|
| Dòng per file | ≤ 400 dòng | Tránh token limit khi write_file |
| Size per file | ≤ 16 KB | Safe buffer cho MCP tool |
| Sections | 9 sections bắt buộc | Chuẩn world-class |
| FAQ items | 5-8 câu | Không quá nhiều |
| Business Rules | All from BA Spec §6 | Không bỏ sót |

### Tool Selection
| Thao tác | Tool | Lý do |
|---------|------|-------|
| Tạo file mới | `mcp_psm-workspace_write_file` | Write toàn bộ 1 lần |
| Kiểm tra file tồn tại | `mcp_psm-workspace_get_file_info` | Trước khi write |
| Đọc BA Spec | `mcp_psm-ba-specs_read_text_file` | SSOT server |
| Cập nhật README | `mcp_psm-workspace_edit_file` | Append 1 dòng |

### Reading BA Spec — Efficient
```
1. Đọc §1 (Tổng quan) → hiểu scope
2. Đọc §5 (Security) → xác định audience + roles
3. Đọc §6 (Business Rules) → extract BR-xxx rules
4. Đọc §7 (AC) → lấy scenarios cho FAQ
5. Đọc §8.2-8.3 (Dependencies) → integration points
→ Không cần đọc §4 Data Model (dành cho developer)
```

---

## §8 README.md INDEX — Master File

File `05. User Guides/README.md` là **master index** duy nhất:

```markdown
# GDH F&B — User Guides Index / Danh mục Tài liệu Hướng dẫn

> Odoo 19 EE | Cập nhật: YYYY-MM-DD

## Finance (Kế toán)

| Process | Tên | Layer | File | Status | Cập nhật |
|---------|-----|-------|------|--------|---------|
| FIN-0101 | Mua hàng phi vận hành | L3 | [Link](./GHD_FIN_0101_User_Guide_v1.md) | ✅ Done | 2026-05-10 |
| FIN-0102 | Thanh toán NCC | L3 | [Link](./GHD_FIN_0102_User_Guide_v1.md) | ✅ Done | 2026-05-10 |
| FIN-0103 | Tạm ứng & Hoàn ứng | L3 | [Link](./GHD_FIN_0103_User_Guide_v1.md) | ✅ Done | 2026-05-10 |
| FIN-0104 | Tài sản & CCDC | L3 | | 🔄 In Progress | |
| FIN-0105 | Gift Certificate | L3 | | ⬜ Pending | |

## HR (Nhân sự)
...

## Ký hiệu / Legend
| Icon | Ý nghĩa |
|------|---------|
| ✅ Done | File hoàn chỉnh, đã review |
| 🔄 In Progress | Đang viết |
| ⬜ Pending | Chưa bắt đầu |
| 🔁 Needs Update | BA Spec đã thay đổi |
```

---

## §9 QUALITY CHECKLIST — Gate trước khi giao

Checklist này chạy sau khi viết xong mỗi file:

```
FILE STRUCTURE
[ ] Đúng naming: GHD_[DOMAIN]_[CODE]_User_Guide_v1.md
[ ] Header metadata đầy đủ (version, date, source, audience)
[ ] Đủ 9 sections theo thứ tự

CONTENT QUALITY
[ ] Tổng quan: mô tả đủ WHAT + WHO + WHEN
[ ] Navigation: tất cả menu paths đã verify
[ ] Access Rights: map đúng với BA Spec §5
[ ] Steps: scenario-based (khi X → làm Y)
[ ] Field tables: có cột Bắt buộc + Ví dụ
[ ] Business Rules: đủ tất cả BR-xxx từ §6
[ ] Error Handling: ít nhất 3 lỗi thường gặp
[ ] Integration: upstream + downstream
[ ] FAQ: 5-8 câu thực tế
[ ] Quick Reference Card: có bảng tóm tắt

BILINGUAL
[ ] Headers: Tiếng Việt / English
[ ] Odoo terms giữ nguyên tiếng Anh
[ ] Menu paths giữ nguyên Odoo
[ ] Footer chuẩn

TECHNICAL
[ ] File size ≤ 16KB
[ ] Dòng số ≤ 400
[ ] README.md đã được cập nhật
[ ] Cross-references đúng section (§I, §J...)
```
