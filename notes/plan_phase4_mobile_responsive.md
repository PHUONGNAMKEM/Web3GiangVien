# Plan Phase 4 — Responsive / Mobile-Friendly

## Hiện trạng

- **Tech stack**: Ant Design v6 + Material-UI v5
- **Viewport meta**: ✅ Có trong `public/index.html`
- **Kết quả audit**: 5 trang tốt / 8 trang trung bình / 1 trang yếu (EntranceTest)

## Setup dùng chung trước (làm đầu tiên)

### Task 4.0 — Tạo hook `useResponsive.js`

**File mới**: `frontend/src/hooks/useResponsive.js`

```javascript
import { useMediaQuery } from '@mui/material';

export const useIsMobile = () => useMediaQuery('(max-width:768px)');
export const useIsTablet = () => useMediaQuery('(max-width:1024px)');
export const useResponsiveModalWidth = (desktopWidth = 600) => {
    const isMobile = useIsMobile();
    return isMobile ? '95vw' : desktopWidth;
};
```

---

## Phase 4.1 — HIGH priority: Tables & Modals (2-3 ngày)

### Danh sách files cần sửa

#### `frontend/src/components/lecturer/SubmissionReview.js`

**Vấn đề**: Table `scroll={{ x: 1100 }}`, Modal/Drawer form nhiều bước không responsive.

1. Tìm tất cả `<Table` → đổi `scroll={{ x: 1100 }}` → `scroll={{ x: 'max-content' }}`.
2. Thêm thuộc tính `responsive` trên các Column không quan trọng để ẩn ở mobile:
   ```jsx
   // Các cột phụ, thêm class ẩn mobile:
   {
       title: 'Ngày nộp',
       dataIndex: 'NgayNop',
       className: 'hide-on-mobile',
       // ...
   }
   ```
3. Tìm tất cả `<Modal` → thêm `width={isMobile ? '95vw' : 700}` (import `useIsMobile`).
4. Tìm `<Drawer` → thêm `width={isMobile ? '100vw' : 600}`.

#### `frontend/src/components/lecturer/TopicManagement.js`

**Vấn đề**: Table `scroll={{ x: 900 }}`, Modal form.

1. Table: đổi `scroll={{ x: 900 }}` → `scroll={{ x: 'max-content' }}`.
2. Xác định các cột ít quan trọng (ví dụ: ngày tạo, số SV) → thêm `responsive: ['md']` (Ant Design v6 hỗ trợ).
3. Modal: `width={isMobile ? '95vw' : 800}`.

#### `frontend/src/components/lecturer/RubricsManagement.js`

**Vấn đề**: Nested Table không scroll mobile, Tag overflow.

1. Bọc table cha trong `<div style={{ overflowX: 'auto' }}>`.
2. Table trong: `scroll={{ x: 'max-content' }}`.
3. Tag overflow: dùng `<Tooltip>` để hiện thêm tags thay vì hiện all inline.

#### `frontend/src/components/lecturer/ScoreComparison.js`

**Vấn đề**: Table `scroll={{ x: 800 }}`, Col `xs={12}` có gap.

1. Table: `scroll={{ x: 'max-content' }}`.
2. `<Col xs={12} sm={8} md={6}>` → kiểm tra spacing không bị overlap trên <320px, điều chỉnh thành `xs={24} sm={12} md={8}` nếu cần.

#### `frontend/src/components/student/ProgressLog.js`

**Vấn đề**: Table `scroll={{ x: 900 }}`, Chart không zoom.

1. Table: `scroll={{ x: 'max-content' }}`.
2. Chart: Bọc trong `<ResponsiveContainer width="100%" height={250}>` (recharts). Xóa hardcoded `width={600}`.

#### Thêm CSS toàn cục cho `.hide-on-mobile`

**File**: `frontend/src/index.css` hoặc `App.css` — thêm:

```css
@media (max-width: 768px) {
    .hide-on-mobile {
        display: none !important;
    }
    /* Đảm bảo antd table scroll ngang hoạt động */
    .ant-table-wrapper {
        overflow-x: auto;
    }
}
```

---

## Phase 4.2 — HIGH priority: EntranceTest Monaco Editor (1 ngày)

**File**: `frontend/src/components/student/EntranceTest.js`

**Vấn đề**: Monaco Editor không responsive, fixed sizes.

1. Import hook: `import { useIsMobile } from '../../hooks/useResponsive';`
2. Trong component:
   ```javascript
   const isMobile = useIsMobile();
   ```
3. Tìm `<Editor` (Monaco Editor component) → thêm/sửa options:
   ```jsx
   <Editor
       height={isMobile ? '300px' : '500px'}
       options={{
           automaticLayout: true,  // QUAN TRỌNG: tự resize
           fontSize: isMobile ? 12 : 14,
           minimap: { enabled: !isMobile },
           wordWrap: 'on',         // Không tràn ngang
           scrollBeyondLastLine: false,
       }}
   />
   ```
4. Tìm wrapper div của editor → đổi `maxWidth: 700` → `maxWidth: '100%'`, thêm `width: '100%'`.
5. Tìm các Panel/Card chứa đề bài → `style={{ padding: isMobile ? '12px' : '24px' }}`.

---

## Phase 4.3 — MEDIUM priority: Dashboard Col layouts (1 ngày)

### `frontend/src/components/student/StudentDashboard.js`

**Vấn đề**: `<Col span={8}>` không stack mobile.

1. Tìm tất cả `<Col span={8}>` trong grid thống kê/card → đổi thành `<Col xs={24} sm={12} lg={8}>`.
2. Tìm `<Col span={12}>` trong form → `<Col xs={24} md={12}>`.
3. Modal `width={600}` → `width={isMobile ? '95vw' : 600}`.

### `frontend/src/components/lecturer/LecturerDashboard.js`

1. Tìm `<Col span={8}>` → `<Col xs={24} sm={12} lg={8}>`.
2. Kiểm tra `<Row gutter={[16, 16]}>` — nên là `gutter={[{ xs: 8, sm: 16 }, { xs: 8, sm: 16 }]}` cho responsive gutter.

---

## Phase 4.4 — MEDIUM priority: Layout padding & maxWidth (1 ngày)

### MainLayout / App Layout

Tìm file layout chính (có thể là `MainLayout.js`, `Layout.js`, hoặc tương đương):

1. Tìm `padding: '0 24px'` trong Header → đổi thành:
   ```javascript
   padding: isMobile ? '0 12px' : '0 24px'
   ```
2. Tìm `margin: '24px 16px'` trong Content area → đổi thành:
   ```javascript
   margin: isMobile ? '12px 8px' : '24px 16px'
   ```

### ReportUpload & ProgressTracking

**File**: `frontend/src/components/student/ReportUpload.js`

- Tìm `maxWidth: 800` → đổi `style={{ maxWidth: isMobile ? '100%' : 800, margin: '0 auto' }}`.
- Tìm Dragger height `height={250}` → `height={isMobile ? 180 : 250}`.

**File**: `frontend/src/components/student/ProgressTracking.js`

- Tìm `maxWidth: 1000` → đổi `style={{ maxWidth: isMobile ? '100%' : 1000, margin: '0 auto' }}`.

---

## Phase 4.5 — LOW priority: Charts (½ ngày)

### ProgressLog Charts

**File**: `frontend/src/components/student/ProgressLog.js`

Tìm các component recharts (`LineChart`, `BarChart`, `PieChart`...):

```jsx
// TRƯỚC
<LineChart width={600} height={300} data={data}>

// SAU
import { ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
    <LineChart data={data}>
        ...
    </LineChart>
</ResponsiveContainer>
```

Tương tự cho `ScoreComparison.js`.

---

## Bảng ưu tiên và effort

| Task | File | Priority | Effort |
|---|---|---|---|
| 4.1 Tables scroll | SubmissionReview, TopicManagement, RubricsManagement, ScoreComparison, ProgressLog | 🔴 HIGH | 2 ngày |
| 4.1 Modal width | SubmissionReview, StudentDashboard, TopicManagement | 🔴 HIGH | 0.5 ngày |
| 4.2 Monaco Editor | EntranceTest | 🔴 HIGH | 1 ngày |
| 4.3 Dashboard Col | StudentDashboard, LecturerDashboard | 🟡 MED | 1 ngày |
| 4.4 Layout padding | MainLayout, ReportUpload, ProgressTracking | 🟡 MED | 1 ngày |
| 4.5 Charts | ProgressLog, ScoreComparison | 🟢 LOW | 0.5 ngày |

**Tổng**: ~6 ngày dev.

---

## Verification

Sau khi sửa, mở Chrome DevTools → toggle device toolbar, test từng trang ở:
- **360×800** (Android nhỏ phổ biến)
- **414×896** (iPhone 11)
- **768×1024** (iPad)
- **1024×768** (Tablet landscape)

Checklist cho mỗi trang:
- [ ] Không có scroll ngang ngoài ý muốn
- [ ] Tất cả text đọc được, không bị cắt
- [ ] Table có thể scroll ngang (không tràn ra ngoài card)
- [ ] Modal không tràn khỏi màn hình
- [ ] Form input có thể nhập được
- [ ] Menu/Sidebar collapse OK
- [ ] Monaco Editor resize theo container
