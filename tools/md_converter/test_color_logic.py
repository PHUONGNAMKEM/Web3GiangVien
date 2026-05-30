"""
Test script to verify granular color customization for PDF and DOCX conversion
"""

import sys
import os
from docx import Document
from io import BytesIO

# Add current directory to path to import converter
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from converter import convert_md_to_pdf, convert_md_to_docx, VietnamesePDF

def test_pdf_custom_colors():
    print("Testing PDF custom colors...")
    md_content = """# Tiêu đề 1
## Tiêu đề 2
### Tiêu đề 3

Đây là văn bản **in đậm** và [liên kết](https://google.com).

> Đây là trích dẫn blockquote

---
"""
    style_config = {
        'custom_colors_enabled': True,
        'theme_color': '#0f3460',
        'h1_color': '#ff0000',      # Đỏ
        'h2_color': '#00ff00',      # Xanh lá
        'h3_color': '#0000ff',      # Xanh dương
        'h4_color': '#ffff00',      # Vàng
        'bold_color': '#ff00ff',    # Hồng cánh sen
        'table_header_bg': '#00ffff', # Cyan
        'hr_color': '#ff5722',      # Cam
        'toc_color': '#9c27b0',     # Tím
        'quote_border': '#795548',  # Nâu
        'quote_bg': '#e0f7fa'       # Xanh ngọc nhạt
    }
    
    metadata = {'style': style_config}
    
    # Khởi tạo VietnamesePDF trực tiếp để kiểm tra thuộc tính màu sắc
    pdf = VietnamesePDF(metadata=metadata)
    
    # Assert
    assert pdf.color_heading1 == (255, 0, 0), f"Expected (255, 0, 0), got {pdf.color_heading1}"
    assert pdf.color_heading2 == (0, 255, 0), f"Expected (0, 255, 0), got {pdf.color_heading2}"
    assert pdf.color_heading3 == (0, 0, 255), f"Expected (0, 0, 255), got {pdf.color_heading3}"
    assert pdf.color_bold == (255, 0, 255), f"Expected (255, 0, 255), got {pdf.color_bold}"
    assert pdf.color_primary == (0, 255, 255), f"Expected (0, 255, 255), got {pdf.color_primary}"
    assert pdf.color_border == (255, 87, 34), f"Expected (255, 87, 34), got {pdf.color_border}"
    assert pdf.color_toc == (156, 39, 176), f"Expected (156, 39, 176), got {pdf.color_toc}"
    assert pdf.color_quote_border == (121, 85, 72), f"Expected (121, 85, 72), got {pdf.color_quote_border}"
    assert pdf.color_quote_bg == (224, 247, 250), f"Expected (224, 247, 250), got {pdf.color_quote_bg}"
    
    print("PDF custom colors assert successfully!")
    
    # Chạy chuyển đổi thực tế để đảm bảo không lỗi runtime
    pdf_bytes = convert_md_to_pdf(md_content, title="Test PDF", metadata=metadata)
    assert len(pdf_bytes) > 0, "PDF generation failed"
    print("PDF conversion test passed!")

def test_docx_custom_colors():
    print("Testing DOCX custom colors...")
    md_content = """# Tiêu đề 1
## Tiêu đề 2
### Tiêu đề 3

Đây là văn bản **in đậm** và [liên kết](https://google.com).

| Cột 1 | Cột 2 |
| ----- | ----- |
| Giá trị 1 | Giá trị 2 |

> Đây là trích dẫn blockquote

---
"""
    style_config = {
        'custom_colors_enabled': True,
        'theme_color': '#0f3460',
        'h1_color': '#ff0000',
        'h2_color': '#00ff00',
        'h3_color': '#0000ff',
        'h4_color': '#ffff00',
        'bold_color': '#ff00ff',
        'table_header_bg': '#00ffff',
        'hr_color': '#ff5722',
        'toc_color': '#9c27b0',
        'quote_border': '#795548',
        'quote_bg': '#e0f7fa'
    }
    
    metadata = {'style': style_config}
    docx_bytes = convert_md_to_docx(md_content, title="Test DOCX", metadata=metadata)
    assert len(docx_bytes) > 0, "DOCX generation failed"
    
    # Đọc lại docx để kiểm định Styles
    doc = Document(BytesIO(docx_bytes))
    styles = doc.styles
    
    from docx.shared import RGBColor
    
    # Kiểm tra màu sắc các Heading style
    assert styles['Heading 1'].font.color.rgb == RGBColor(255, 0, 0), "Heading 1 style color mismatch"
    assert styles['Heading 2'].font.color.rgb == RGBColor(0, 255, 0), "Heading 2 style color mismatch"
    assert styles['Heading 3'].font.color.rgb == RGBColor(0, 0, 255), "Heading 3 style color mismatch"
    assert styles['Heading 4'].font.color.rgb == RGBColor(255, 255, 0), "Heading 4 style color mismatch"
    
    # Kiểm tra TOC styles
    assert styles['TOC Heading'].font.color.rgb == RGBColor(156, 39, 176), "TOC Heading style color mismatch"
    assert styles['TOC 1'].font.color.rgb == RGBColor(156, 39, 176), "TOC 1 style color mismatch"
    assert styles['TOC 2'].font.color.rgb == RGBColor(0, 255, 0), "TOC 2 style color mismatch"
    assert styles['TOC 3'].font.color.rgb == RGBColor(0, 0, 255), "TOC 3 style color mismatch"
    
    print("DOCX custom colors style assertions passed!")
    print("DOCX conversion test passed!")

if __name__ == "__main__":
    try:
        test_pdf_custom_colors()
        print("-" * 40)
        test_docx_custom_colors()
        print("\n" + "="*40)
        print("ALL TESTS PASSED SUCCESSFULLY!")
        print("="*40)
    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
