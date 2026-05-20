# API: Quản lý Môn Học & Lớp Học

Ngày thêm: 2026-05-20

---

## 1. Môn Học (`/api/monhoc`)

### GET `/api/monhoc/giangvien/:gvId`
- **Mô tả**: Lấy danh sách môn học của giảng viên
- **Response**: `{ success, data: [{ ...MonHoc, soDeTai, soLopHoc }] }`

### POST `/api/monhoc`
- **Body**: `{ MaMonHoc, TenMonHoc, MoTa, GiangVien }`
- **Validation**: MaMonHoc unique, TenMonHoc + GiangVien required
- **Response**: `{ success, data: MonHoc }`

### PUT `/api/monhoc/:id`
- **Body**: `{ TenMonHoc, MoTa }`
- **Response**: `{ success, data: MonHoc }`

### DELETE `/api/monhoc/:id`
- **Guard**: Chặn xóa nếu còn đề tài hoặc lớp học ràng buộc
- **Response**: `{ success, message }`

---

## 2. Lớp Học (`/api/lophoc`)

### GET `/api/lophoc/giangvien/:gvId`
- **Mô tả**: Danh sách lớp học kèm tên môn học và sĩ số
- **Populate**: MonHoc (MaMonHoc, TenMonHoc), GiangVien (HoTen, MaGV)
- **Response**: `{ success, data: [{ ...LopHoc, siSo }] }`

### GET `/api/lophoc/:id/detail`
- **Mô tả**: Chi tiết lớp (SV, nhóm đăng ký, đề tài thuộc môn)
- **Response**:
```json
{
  "success": true,
  "data": {
    "lopHoc": { ...LopHoc populated SinhVien[] },
    "deTais": [ ...DeTai thuộc MonHoc ],
    "dangKys": [ ...DangKyDeTai liên quan SV trong lớp ]
  }
}
```

### POST `/api/lophoc`
- **Body**: `{ MaLopHoc, TenLopHoc, MonHoc, GiangVien }`
- **Response**: `{ success, data: LopHoc }`

### PUT `/api/lophoc/:id`
- **Body**: `{ TenLopHoc, MonHoc }`
- **Response**: `{ success, data: LopHoc }`

### POST `/api/lophoc/:id/sinhvien`
- **Mô tả**: Thêm sinh viên vào lớp
- **Body**: `{ sinhVienId }`
- **Guard**: Chặn trùng lặp (SV đã có trong lớp)
- **Response**: `{ success, data: LopHoc }`

### DELETE `/api/lophoc/:id/sinhvien/:svId`
- **Mô tả**: Xóa sinh viên khỏi lớp
- **Response**: `{ success, message }`

### DELETE `/api/lophoc/:id`
- **Mô tả**: Xóa lớp học
- **Response**: `{ success, message }`

---

## 3. Frontend Service

- **File**: `frontend/src/services/managementService.js`
- Sử dụng `apiService.get/post/put/delete` (đã có auth token interceptor)
- Export: `managementService` với các method tương ứng API trên
