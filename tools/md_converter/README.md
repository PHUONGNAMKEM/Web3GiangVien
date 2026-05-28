# MD Converter — Markdown → PDF / Word

Tool chuyển đổi file Markdown (`.md`) sang **PDF** hoặc **Word (DOCX)** với giao diện web đẹp mắt.

## Tính năng

- 📄 **Upload file .md** hoặc **nhập trực tiếp** Markdown
- 👁️ **Preview realtime** nội dung Markdown
- 📕 **Xuất PDF** — định dạng đẹp, có header/footer, bảng màu, code block
- 📘 **Xuất Word (DOCX)** — heading styles, bảng có màu header, code block với border
- 📊 **Thống kê** ký tự, từ, dòng
- 🎨 **Giao diện dark theme** hiện đại
- 🖱️ **Drag & Drop** file upload

## Cài đặt

```bash
cd tools/md_converter
py -m pip install -r requirements.txt
```

## Chạy

```bash
py app.py
```

Mở trình duyệt: **http://localhost:5500**

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Web Server | Flask 3.x |
| MD → HTML | Python-Markdown + extensions |
| HTML → PDF | xhtml2pdf (reportlab) |
| MD → DOCX | python-docx |
| Code Highlighting | Pygments |
| UI | Vanilla HTML/CSS/JS (dark theme) |

## Cấu trúc

```
tools/md_converter/
├── app.py              # Flask server + UI template
├── converter.py        # Logic chuyển đổi MD → PDF/DOCX
├── requirements.txt    # Python dependencies
└── README.md           # Tài liệu này
```

## Lưu ý

- Port mặc định: **5500** (tránh xung đột với backend chính port 5000)
- Hỗ trợ file `.md`, `.markdown`, `.txt`
- Giới hạn file: 50MB
- PDF có footer tự động, table có header màu, code block có syntax highlighting
- DOCX có heading styles, table với header xanh, code block với border đỏ
