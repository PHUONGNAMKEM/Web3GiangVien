import re
from dataclasses import dataclass, field


@dataclass
class TextChunk:
    index: int
    heading: str
    level: int          # 1 = Chương, 2 = Section, 3 = Sub-heading
    content: str
    char_count: int


# Regex patterns cho Vietnamese academic headings
CHAPTER_PATTERNS = [
    r'(?:^|\n)\s*((?:Chương|CHƯƠNG|Chapter|CHAPTER)\s*\d+[.:\s].*?)(?:\n)',
    r'(?:^|\n)\s*(PHẦN\s+\d+[.:\s].*?)(?:\n)',
]

SECTION_PATTERNS = [
    r'(?:^|\n)\s*(\d+\.\d+\.?\s+[^\n]+)',
    r'(?:^|\n)\s*((?:Phần|Mục|Section)\s+\d+[.:\s].*?)(?:\n)',
]

SUBSECTION_PATTERNS = [
    r'(?:^|\n)\s*(\d+\.\d+\.\d+\.?\s+[^\n]+)',
]


def _detect_headings(text: str) -> list[tuple[int, str, int]]:
    """
    Detect headings and their positions in text.
    Returns: [(position, heading_text, level), ...]
    """
    headings = []

    # Level 1: Chương
    for pattern in CHAPTER_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            headings.append((match.start(), match.group(1).strip(), 1))

    # Level 2: Section (X.Y)
    for pattern in SECTION_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            heading_text = match.group(1).strip()
            # Tránh trùng với subsection (X.Y.Z)
            if not re.match(r'\d+\.\d+\.\d+', heading_text):
                headings.append((match.start(), heading_text, 2))

    # Level 3: Sub-section (X.Y.Z)
    for pattern in SUBSECTION_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            headings.append((match.start(), match.group(1).strip(), 3))

    # Sort by position
    headings.sort(key=lambda x: x[0])

    # Deduplicate: nếu 2 heading cùng vị trí, giữ level thấp hơn (lớn hơn)
    deduped = []
    for h in headings:
        if deduped and abs(h[0] - deduped[-1][0]) < 5:
            # Giữ heading có level thấp hơn (ưu tiên chapter > section)
            if h[2] < deduped[-1][2]:
                deduped[-1] = h
        else:
            deduped.append(h)

    return deduped


def chunk_text(text: str) -> list[TextChunk]:
    """
    Chia text thành chunks theo headings.
    
    Detect patterns:
    - "Chương X", "CHƯƠNG X", "Chapter X"       → level 1
    - "X.Y", "Phần X", "Section X"              → level 2  
    - "X.Y.Z"                                    → level 3
    
    Fallback: nếu không detect được heading → chia theo paragraph blocks
    """
    if not text or not text.strip():
        return [TextChunk(index=0, heading="Toàn bộ nội dung", level=1,
                         content=text or "", char_count=len(text or ""))]

    headings = _detect_headings(text)

    chunks = []

    if len(headings) >= 2:
        # Có heading → chia theo heading
        # Phần trước heading đầu tiên (nếu có nội dung đáng kể)
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
            # Content = từ heading này đến heading tiếp theo
            if i + 1 < len(headings):
                end_pos = headings[i + 1][0]
            else:
                end_pos = len(text)

            content = text[pos:end_pos].strip()
            if len(content) > 20:  # Bỏ qua chunk quá ngắn
                chunks.append(TextChunk(
                    index=len(chunks),
                    heading=heading_text[:200],  # Truncate heading dài
                    level=level,
                    content=content,
                    char_count=len(content)
                ))
    
    # Fallback: nếu không tìm đủ headings → chia theo paragraphs
    if len(chunks) <= 1:
        chunks = _split_by_paragraphs(text, max_words=600)

    return chunks if chunks else [TextChunk(
        index=0, heading="Toàn bộ nội dung", level=1,
        content=text, char_count=len(text)
    )]


def _split_by_paragraphs(text: str, max_words: int = 600) -> list[TextChunk]:
    """Fallback: chia theo paragraphs nếu không có headings rõ ràng."""
    # Chia theo double newline (paragraph)
    paragraphs = re.split(r'\n{2,}', text)
    
    chunks = []
    current_content = []
    current_word_count = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        words_in_para = len(para.split())
        
        if current_word_count + words_in_para > max_words and current_content:
            # Flush current chunk
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

    # Flush remaining
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
