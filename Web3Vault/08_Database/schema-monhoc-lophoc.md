# Schema: MonHoc & LopHoc

Ngày thêm: 2026-05-20

---

## MonHoc (Môn Học)

- **Collection**: `monhocs`
- **File**: `backend/models/MonHoc.js`

| Field | Type | Required | Unique | Mô tả |
|-------|------|----------|--------|-------|
| MaMonHoc | String | ✅ | ✅ | Mã môn (VD: COMP1413) |
| TenMonHoc | String | ✅ | — | Tên môn học |
| MoTa | String | — | — | Mô tả ngắn |
| GiangVien | ObjectId → GiangVien | ✅ | — | Giảng viên phụ trách |
| timestamps | auto | — | — | createdAt, updatedAt |

---

## LopHoc (Lớp Học)

- **Collection**: `lophocs`
- **File**: `backend/models/LopHoc.js`

| Field | Type | Required | Unique | Mô tả |
|-------|------|----------|--------|-------|
| MaLopHoc | String | ✅ | ✅ | Mã lớp (VD: 21DHT01) |
| TenLopHoc | String | ✅ | — | Tên lớp học |
| MonHoc | ObjectId → MonHoc | ✅ | — | Môn học mà lớp thuộc về |
| GiangVien | ObjectId → GiangVien | ✅ | — | Giảng viên phụ trách lớp |
| SinhVien | [ObjectId → SinhVien] | — | — | Danh sách sinh viên trong lớp |
| timestamps | auto | — | — | createdAt, updatedAt |

---

## Cập nhật DeTai

- **File**: `backend/models/DeTai.js`
- **Field thêm mới**: `MonHoc: { type: ObjectId, ref: 'MonHoc' }` — **optional** (backward compatible)
- **Mục đích**: Cho phép lọc đề tài theo môn học, hiển thị đề tài thuộc môn khi xem chi tiết lớp

---

## Quan hệ

```
GiangVien ──1:N──▶ MonHoc ──1:N──▶ LopHoc ──has──▶ SinhVien[]
                          ──1:N──▶ DeTai (qua field MonHoc optional)
```
