import io
import logging
import pdfplumber
import fitz  # PyMuPDF

logger = logging.getLogger('ml-service')

def extract_pdf_text(file_bytes: bytes) -> dict:
    """
    Trích xuất toàn bộ text từ PDF bytes.
    Ưu tiên native text; fallback sang OCR nếu text quá ít.
    
    Returns:
        {
            text: str,           # toàn bộ text
            page_count: int,
            method: 'native' | 'ocr' | 'failed',
            warnings: list[str]  # hidden text, injection hints, etc.
        }
    """
    warnings = []
    
    # === Bước 1: Native parse với pdfplumber ===
    try:
        pages_text = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text() or ''
                pages_text.append(page_text)
                
                # Kiểm tra hidden text (font size < 1)
                try:
                    for char in (page.chars or []):
                        if float(char.get('size', 12)) < 1:
                            warnings.append(f'Phát hiện text ẩn trang {page.page_number}')
                            break
                except Exception:
                    pass
        
        native_text = '\n\n'.join(pages_text).strip()
    except Exception as e:
        logger.error(f'[PDF] pdfplumber failed: {e}')
        native_text = ''
        page_count = 0

    # Nếu native text đủ dài → dùng luôn
    if len(native_text) >= 200:
        _check_injection_hints(native_text, warnings)
        return {
            'text': native_text,
            'page_count': page_count,
            'method': 'native',
            'warnings': warnings
        }
    
    # === Bước 2: OCR fallback ===
    try:
        import pytesseract
        from PIL import Image
        
        doc = fitz.open(stream=file_bytes, filetype='pdf')
        page_count = len(doc)
        ocr_pages = []
        
        for page_num in range(page_count):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img, lang='vie+eng')
            ocr_pages.append(ocr_text)
        
        doc.close()
        ocr_result = '\n\n'.join(ocr_pages).strip()
        
        if len(ocr_result) >= 50:
            warnings.append('File PDF dạng scan - đã dùng OCR để đọc nội dung')
            _check_injection_hints(ocr_result, warnings)
            return {
                'text': ocr_result,
                'page_count': page_count,
                'method': 'ocr',
                'warnings': warnings
            }
    except ImportError:
        warnings.append('OCR không khả dụng (Tesseract chưa cài)')
    except Exception as e:
        logger.error(f'[PDF] OCR failed: {e}')
        warnings.append(f'OCR thất bại: {str(e)}')
    
    # === Thất bại ===
    return {
        'text': '',
        'page_count': page_count,
        'method': 'failed',
        'warnings': warnings + ['Không thể đọc nội dung file PDF']
    }


def _check_injection_hints(text: str, warnings: list):
    """Phát hiện dấu hiệu prompt injection trong text."""
    import re
    injection_patterns = [
        r'(hãy|please|vui lòng).{0,40}(chấm|cho|give|grade|score|đánh giá).{0,40}(10|100|max|cao nhất|tối đa)',
        r'(bỏ qua|ignore|disregard).{0,30}(rubric|tiêu chí|hướng dẫn|instruction)',
        r'(điểm|score)\s*(=|:)?\s*(10|100|tối đa|maximum)',
        r'system\s*prompt|forget.{0,20}previous',
    ]
    for pattern in injection_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            warnings.append(f'Cảnh báo: phát hiện nội dung có thể là prompt injection')
            break
