import re
import logging
from dataclasses import dataclass

logger = logging.getLogger('ml-service')


@dataclass
class TextChunk:
    index: int
    heading: str
    level: int          # 1 = Chương, 2 = Section, 3 = Sub-heading
    content: str
    char_count: int


# =============================================
# REGEX PATTERNS CHO VIETNAMESE ACADEMIC HEADINGS
# =============================================

CHAPTER_PATTERNS = [
    # Chương 1, CHƯƠNG 2, Chapter 3
    r'(?:^|\n)\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[.:\s].*?)(?:\n)',
    # PHẦN I, PHẦN 1, PHẦN II
    r'(?:^|\n)\s*(PHẦN\s+(?:\d+|[IVXLC]+)[.:\s].*?)(?:\n)',
    # MỞ ĐẦU, KẾT LUẬN, TÀI LIỆU THAM KHẢO, LỜI CẢM ƠN, PHỤ LỤC...
    r'(?:^|\n)\s*((?:MỞ ĐẦU|KẾT LUẬN|TÀI LIỆU THAM KHẢO|LỜI CẢM ƠN|LỜI MỞ ĐẦU|PHỤ LỤC|DANH MỤC|TÓM TẮT|ABSTRACT|NHẬN XÉT|GIỚI THIỆU|TỔNG QUAN)[^\n]*)(?:\n)',
]

SECTION_PATTERNS = [
    # X.Y format (1.1, 2.3, etc.)
    r'(?:^|\n)\s*(\d+\.\d+\.?\s+[^\n]+)',
    # Phần X, Mục X, Section X (lowercase)
    r'(?:^|\n)\s*((?:Phần|Mục|Section)\s+\d+[.:\s].*?)(?:\n)',
    # Roman numerals: I., II., III., IV., V., VI., VII., VIII., IX., X.
    r'(?:^|\n)\s*((?:I{1,3}|IV|VI{0,3}|IX|X{1,3})\.\s+[^\n]+)',
]

SUBSECTION_PATTERNS = [
    # X.Y.Z format (1.1.1, 2.3.4, etc.)
    r'(?:^|\n)\s*(\d+\.\d+\.\d+\.?\s+[^\n]+)',
    # a), b), c), d), e)...
    r'(?:^|\n)\s*([a-z]\)\s+[^\n]+)',
    # a., b., c., d., e.
    r'(?:^|\n)\s*([a-z]\.\s+[^\n]+)',
    # 1), 2), 3)...
    r'(?:^|\n)\s*(\d{1,2}\)\s+[^\n]+)',
]

# Max ký tự mỗi chunk khi force-split (khoảng 1-2 trang A4)
MAX_CHUNK_CHARS = 2000
# Max từ mỗi chunk khi chia paragraph
MAX_CHUNK_WORDS = 400


def _detect_headings(text: str) -> list[tuple[int, str, int]]:
    """
    Detect headings and their positions in text.
    Returns: [(position, heading_text, level), ...]
    """
    headings = []

    # Level 1: Chương / Phần lớn
    for pattern in CHAPTER_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
            headings.append((match.start(), match.group(1).strip(), 1))

    # Level 2: Section (X.Y, Roman numerals)
    for pattern in SECTION_PATTERNS:
        for match in re.finditer(pattern, text, re.MULTILINE):
            heading_text = match.group(1).strip()
            # Tránh trùng với subsection (X.Y.Z)
            if not re.match(r'\d+\.\d+\.\d+', heading_text):
                headings.append((match.start(), heading_text, 2))

    # Level 3: Sub-section (X.Y.Z, a), b), 1), 2))
    for pattern in SUBSECTION_PATTERNS:
        for match in re.finditer(pattern, text, re.MULTILINE):
            headings.append((match.start(), match.group(1).strip(), 3))

    # Sort by position
    headings.sort(key=lambda x: x[0])

    # Deduplicate: nếu 2 heading cùng vị trí (±10 chars), giữ level cao hơn
    deduped = []
    for h in headings:
        if deduped and abs(h[0] - deduped[-1][0]) < 10:
            if h[2] < deduped[-1][2]:
                deduped[-1] = h
        else:
            deduped.append(h)

    return deduped


def chunk_text(text: str) -> list[TextChunk]:
    """
    Chia text thành chunks theo headings hoặc fallback.
    
    Priority:
    1. Detect headings (Chương, Section, Sub-section, Roman numerals, a), b)...)
    2. Fallback: chia theo paragraphs (double newline)
    3. Fallback: chia theo single newline
    4. Final fallback: force-split theo ký tự (đảm bảo KHÔNG BAO GIỜ chỉ có 1 chunk cho text dài)
    """
    if not text or not text.strip():
        return [TextChunk(index=0, heading="Toàn bộ nội dung", level=1,
                         content=text or "", char_count=len(text or ""))]

    headings = _detect_headings(text)
    chunks = []

    if len(headings) >= 2:
        # === CÓ HEADINGS → chia theo heading ===
        # Phần trước heading đầu tiên
        pre_content = text[:headings[0][0]].strip()
        if len(pre_content) > 100:
            chunks.append(TextChunk(
                index=0,
                heading="Phần mở đầu",
                level=0,
                content=pre_content,
                char_count=len(pre_content)
            ))

        for i, (pos, heading_text, level) in enumerate(headings):
            if i + 1 < len(headings):
                end_pos = headings[i + 1][0]
            else:
                end_pos = len(text)

            content = text[pos:end_pos].strip()
            if len(content) > 20:
                chunks.append(TextChunk(
                    index=len(chunks),
                    heading=heading_text[:200],
                    level=level,
                    content=content,
                    char_count=len(content)
                ))

    # === FALLBACK: nếu headings cho ra <= 1 chunk → chia theo paragraphs ===
    if len(chunks) <= 1:
        chunks = _split_by_paragraphs(text)

    # === FALLBACK 2: nếu paragraphs cũng <= 1 chunk → chia theo single newline ===
    if len(chunks) <= 1:
        chunks = _split_by_lines(text)

    # === FINAL FALLBACK: force-split theo ký tự — KHÔNG BAO GIỜ để 1 chunk cho text dài ===
    if len(chunks) <= 1 and len(text) > MAX_CHUNK_CHARS:
        chunks = _force_split_by_chars(text)

    # Nếu vẫn rỗng (text cực ngắn)
    if not chunks:
        chunks = [TextChunk(
            index=0, heading="Toàn bộ nội dung", level=1,
            content=text, char_count=len(text)
        )]

    logger.info(f"[CHUNKER] Final result | chunks={len(chunks)} | textLen={len(text)} | method={'heading' if len(headings) >= 2 else 'fallback'}")
    return chunks


def _split_by_paragraphs(text: str) -> list[TextChunk]:
    """Chia theo double newline (paragraph), mỗi chunk tối đa MAX_CHUNK_WORDS từ."""
    paragraphs = re.split(r'\n{2,}', text)

    # Nếu double newline không chia được (chỉ 1 đoạn) → return empty để fallback tiếp
    if len(paragraphs) <= 1:
        return []

    chunks = []
    current_content = []
    current_word_count = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        words_in_para = len(para.split())

        if current_word_count + words_in_para > MAX_CHUNK_WORDS and current_content:
            content = '\n\n'.join(current_content)
            chunks.append(TextChunk(
                index=len(chunks),
                heading=f"Phần {len(chunks) + 1}",
                level=1,
                content=content,
                char_count=len(content)
            ))
            current_content = [para]
            current_word_count = words_in_para
        else:
            current_content.append(para)
            current_word_count += words_in_para

    if current_content:
        content = '\n\n'.join(current_content)
        chunks.append(TextChunk(
            index=len(chunks),
            heading=f"Phần {len(chunks) + 1}",
            level=1,
            content=content,
            char_count=len(content)
        ))

    return chunks


def _split_by_lines(text: str) -> list[TextChunk]:
    """Chia theo single newline, gộp nhóm theo MAX_CHUNK_WORDS từ."""
    lines = text.split('\n')

    # Nếu chỉ có 1 dòng dài → return empty để fallback tiếp
    if len(lines) <= 1:
        return []

    chunks = []
    current_lines = []
    current_word_count = 0

    for line in lines:
        line = line.strip()
        if not line:
            continue

        words_in_line = len(line.split())

        if current_word_count + words_in_line > MAX_CHUNK_WORDS and current_lines:
            content = '\n'.join(current_lines)
            chunks.append(TextChunk(
                index=len(chunks),
                heading=f"Đoạn {len(chunks) + 1}",
                level=2,
                content=content,
                char_count=len(content)
            ))
            current_lines = [line]
            current_word_count = words_in_line
        else:
            current_lines.append(line)
            current_word_count += words_in_line

    if current_lines:
        content = '\n'.join(current_lines)
        chunks.append(TextChunk(
            index=len(chunks),
            heading=f"Đoạn {len(chunks) + 1}",
            level=2,
            content=content,
            char_count=len(content)
        ))

    return chunks


def _force_split_by_chars(text: str) -> list[TextChunk]:
    """
    Force-split text theo MAX_CHUNK_CHARS ký tự.
    Cắt tại vị trí dấu chấm câu gần nhất (nếu có) để không cắt giữa câu.
    Đây là phương án cuối cùng — ĐẢNNG BẢO luôn có nhiều chunks cho text dài.
    """
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + MAX_CHUNK_CHARS, text_len)

        # Nếu chưa hết text, tìm dấu chấm câu gần nhất để cắt tự nhiên
        if end < text_len:
            # Tìm ngược từ end về trước, tìm dấu '.', '!', '?' hoặc '\n'
            best_cut = -1
            for sep in ['. ', '.\n', '!\n', '?\n', '\n']:
                pos = text.rfind(sep, start + MAX_CHUNK_CHARS // 2, end)
                if pos > best_cut:
                    best_cut = pos + len(sep)

            if best_cut > start:
                end = best_cut

        content = text[start:end].strip()
        if content:
            chunks.append(TextChunk(
                index=len(chunks),
                heading=f"Khối {len(chunks) + 1}",
                level=1,
                content=content,
                char_count=len(content)
            ))

        start = end

    return chunks
