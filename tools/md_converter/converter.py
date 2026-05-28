"""
MD Converter - Chuyen doi Markdown -> PDF / DOCX
Converter module: su dung fpdf2 (Unicode TTF) + python-docx
"""

import os
import re
import markdown
from io import BytesIO
from fpdf import FPDF
from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn


# ============================================================
# MARKDOWN TO HTML (for web preview)
# ============================================================

def md_to_html(md_content: str) -> str:
    """Convert Markdown to styled HTML (for preview only)"""
    extensions = [
        'markdown.extensions.tables',
        'markdown.extensions.fenced_code',
        'markdown.extensions.codehilite',
        'markdown.extensions.toc',
        'markdown.extensions.nl2br',
        'markdown.extensions.sane_lists',
        'markdown.extensions.smarty',
        'markdown.extensions.attr_list',
    ]
    extension_configs = {
        'markdown.extensions.codehilite': {
            'css_class': 'highlight',
            'guess_lang': False,
        },
    }
    html_body = markdown.markdown(
        md_content,
        extensions=extensions,
        extension_configs=extension_configs,
        output_format='html5'
    )
    return html_body


# ============================================================
# PDF CONVERSION (fpdf2 - native Unicode TTF support)
# ============================================================

class VietnamesePDF(FPDF):
    """Custom PDF class with Vietnamese font support and styled rendering."""

    def __init__(self):
        super().__init__()
        self._setup_fonts()
        self.set_auto_page_break(auto=True, margin=20)

    def _setup_fonts(self):
        """Register Windows system fonts that support Vietnamese."""
        font_dir = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')

        # Arial (Vietnamese support)
        arial = os.path.join(font_dir, 'arial.ttf')
        arial_b = os.path.join(font_dir, 'arialbd.ttf')
        arial_i = os.path.join(font_dir, 'ariali.ttf')
        arial_bi = os.path.join(font_dir, 'arialbi.ttf')

        if os.path.exists(arial):
            self.add_font('VN', '', arial)
            self.add_font('VN', 'B', arial_b if os.path.exists(arial_b) else arial)
            self.add_font('VN', 'I', arial_i if os.path.exists(arial_i) else arial)
            self.add_font('VN', 'BI', arial_bi if os.path.exists(arial_bi) else arial)
        else:
            # Fallback: Times New Roman
            times = os.path.join(font_dir, 'times.ttf')
            times_b = os.path.join(font_dir, 'timesbd.ttf')
            times_i = os.path.join(font_dir, 'timesi.ttf')
            times_bi = os.path.join(font_dir, 'timesbi.ttf')
            self.add_font('VN', '', times)
            self.add_font('VN', 'B', times_b if os.path.exists(times_b) else times)
            self.add_font('VN', 'I', times_i if os.path.exists(times_i) else times)
            self.add_font('VN', 'BI', times_bi if os.path.exists(times_bi) else times)

        # Consolas for code
        consolas = os.path.join(font_dir, 'consola.ttf')
        consolas_b = os.path.join(font_dir, 'consolab.ttf')
        if os.path.exists(consolas):
            self.add_font('Mono', '', consolas)
            self.add_font('Mono', 'B', consolas_b if os.path.exists(consolas_b) else consolas)
        else:
            # Fallback: use VN font for code too
            self.add_font('Mono', '', arial if os.path.exists(arial) else os.path.join(font_dir, 'times.ttf'))

    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font('VN', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Trang {self.page_no()}/{{nb}}', align='C')


# --- Color palette ---
COLOR_HEADING1 = (15, 52, 96)       # #0f3460
COLOR_HEADING2 = (22, 33, 62)       # #16213e
COLOR_HEADING3 = (83, 52, 131)      # #533483
COLOR_HEADING4 = (15, 52, 96)       # #0f3460
COLOR_TEXT = (26, 26, 46)           # #1a1a2e
COLOR_MUTED = (100, 100, 120)
COLOR_CODE_TEXT = (233, 69, 96)     # #e94560
COLOR_CODE_BG = (240, 240, 245)     # #f0f0f5
COLOR_CODEBLOCK_BG = (26, 26, 46)   # #1a1a2e
COLOR_CODEBLOCK_TEXT = (224, 224, 224)
COLOR_LINK = (15, 52, 96)
COLOR_TABLE_HEADER = (15, 52, 96)   # #0f3460
COLOR_TABLE_HEADER_TEXT = (255, 255, 255)
COLOR_TABLE_ALT = (244, 246, 250)   # #f4f6fa
COLOR_BORDER = (233, 69, 96)        # #e94560
COLOR_QUOTE_BORDER = (83, 52, 131)  # #533483
COLOR_QUOTE_BG = (248, 246, 255)    # #f8f6ff


def convert_md_to_pdf(md_content: str, title: str = "Document") -> bytes:
    """Convert Markdown content to PDF bytes with Vietnamese support via fpdf2."""
    pdf = VietnamesePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font('VN', '', 11)

    lines = md_content.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    code_lang = ''
    in_table = False
    table_header = []
    table_rows = []

    while i < len(lines):
        line = lines[i]

        # --- Code block ---
        if line.strip().startswith('```'):
            if in_code_block:
                _pdf_code_block(pdf, '\n'.join(code_lines))
                code_lines = []
                code_lang = ''
                in_code_block = False
            else:
                if in_table and table_header:
                    _pdf_table(pdf, table_header, table_rows)
                    table_header, table_rows = [], []
                    in_table = False
                in_code_block = True
                lang_match = re.match(r'^```(\w+)', line.strip())
                code_lang = lang_match.group(1) if lang_match else ''
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # --- Table ---
        if '|' in line and line.strip().startswith('|'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if all(re.match(r'^[-:]+$', c) for c in cells if c):
                i += 1
                continue
            if not in_table:
                in_table = True
                table_header = cells
            else:
                table_rows.append(cells)
            i += 1
            continue
        else:
            if in_table and table_header:
                _pdf_table(pdf, table_header, table_rows)
                table_header, table_rows = [], []
                in_table = False

        stripped = line.strip()

        # Empty line
        if not stripped:
            pdf.ln(3)
            i += 1
            continue

        # Horizontal rule
        if re.match(r'^[-*_]{3,}\s*$', stripped):
            pdf.ln(4)
            pdf.set_draw_color(*COLOR_BORDER)
            pdf.set_line_width(0.8)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(6)
            i += 1
            continue

        # Headings
        heading_match = re.match(r'^(#{1,6})\s+(.*)', stripped)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
            text = re.sub(r'\*(.*?)\*', r'\1', text)
            text = re.sub(r'`(.*?)`', r'\1', text)
            _pdf_heading(pdf, text, level)
            i += 1
            continue

        # Blockquote
        if stripped.startswith('>'):
            quote_text = re.sub(r'^>\s*', '', stripped)
            quote_text = re.sub(r'\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]', r'[\1]', quote_text)
            _pdf_blockquote(pdf, quote_text)
            i += 1
            continue

        # List items
        list_match = re.match(r'^(\s*)([-*+]|\d+[.)])\s+(.*)', stripped)
        if list_match:
            indent_level = len(list_match.group(1)) // 2
            marker = list_match.group(2)
            text = list_match.group(3)
            is_ordered = bool(re.match(r'\d+[.)]', marker))
            _pdf_list_item(pdf, text, indent_level, is_ordered, marker)
            i += 1
            continue

        # Regular paragraph
        _pdf_paragraph(pdf, stripped)
        i += 1

    # Flush remaining
    if in_table and table_header:
        _pdf_table(pdf, table_header, table_rows)
    if in_code_block and code_lines:
        _pdf_code_block(pdf, '\n'.join(code_lines))

    buffer = BytesIO()
    pdf.output(buffer)
    buffer.seek(0)
    return buffer.read()


# ============================================================
# PDF RENDERING HELPERS
# ============================================================

def _pdf_heading(pdf: FPDF, text: str, level: int):
    """Render a heading."""
    sizes = {1: 22, 2: 16, 3: 13, 4: 11.5, 5: 11, 6: 10.5}
    colors = {1: COLOR_HEADING1, 2: COLOR_HEADING2, 3: COLOR_HEADING3,
              4: COLOR_HEADING4, 5: COLOR_HEADING1, 6: COLOR_HEADING2}

    pdf.ln(6 if level <= 2 else 4)
    pdf.set_font('VN', 'B', sizes.get(level, 11))
    pdf.set_text_color(*colors.get(level, COLOR_TEXT))
    pdf.multi_cell(0, sizes.get(level, 11) * 0.5, text)

    # Underline for h1 and h2
    if level == 1:
        pdf.set_draw_color(*COLOR_HEADING1)
        pdf.set_line_width(1.2)
        pdf.line(pdf.l_margin, pdf.get_y() + 1, pdf.w - pdf.r_margin, pdf.get_y() + 1)
        pdf.ln(5)
    elif level == 2:
        pdf.set_draw_color(*COLOR_BORDER)
        pdf.set_line_width(0.6)
        pdf.line(pdf.l_margin, pdf.get_y() + 1, pdf.w - pdf.r_margin, pdf.get_y() + 1)
        pdf.ln(4)
    else:
        pdf.ln(2)

    # Reset
    pdf.set_font('VN', '', 11)
    pdf.set_text_color(*COLOR_TEXT)


def _pdf_paragraph(pdf: FPDF, text: str):
    """Render a paragraph with inline formatting."""
    pdf.set_font('VN', '', 11)
    pdf.set_text_color(*COLOR_TEXT)
    _pdf_rich_text(pdf, text)
    pdf.ln(3)


def _pdf_rich_text(pdf: FPDF, text: str):
    """Render text with bold, italic, code, link formatting."""
    pattern = re.compile(
        r'(\*\*\*(.+?)\*\*\*)'
        r'|(\*\*(.+?)\*\*)'
        r'|(\*(.+?)\*)'
        r'|(`(.+?)`)'
        r'|(\[(.+?)\]\((.+?)\))'
    )

    last_end = 0
    line_h = 5

    for match in pattern.finditer(text):
        if match.start() > last_end:
            pdf.set_font('VN', '', 11)
            pdf.set_text_color(*COLOR_TEXT)
            pdf.write(line_h, text[last_end:match.start()])

        if match.group(2):  # bold+italic
            pdf.set_font('VN', 'BI', 11)
            pdf.set_text_color(*COLOR_TEXT)
            pdf.write(line_h, match.group(2))
        elif match.group(4):  # bold
            pdf.set_font('VN', 'B', 11)
            pdf.set_text_color(*COLOR_HEADING2)
            pdf.write(line_h, match.group(4))
        elif match.group(6):  # italic
            pdf.set_font('VN', 'I', 11)
            pdf.set_text_color(*COLOR_HEADING3)
            pdf.write(line_h, match.group(6))
        elif match.group(8):  # inline code
            pdf.set_font('Mono', '', 9.5)
            pdf.set_text_color(*COLOR_CODE_TEXT)
            pdf.write(line_h, match.group(8))
        elif match.group(10):  # link
            pdf.set_font('VN', '', 11)
            pdf.set_text_color(*COLOR_LINK)
            pdf.write(line_h, match.group(10))

        last_end = match.end()

    if last_end < len(text):
        pdf.set_font('VN', '', 11)
        pdf.set_text_color(*COLOR_TEXT)
        pdf.write(line_h, text[last_end:])

    pdf.ln(line_h)


def _pdf_code_block(pdf: FPDF, code_text: str):
    """Render a code block with dark background, handling page breaks.
    Two-pass per page chunk: draw background first, then text on top.
    """
    pdf.ln(3)
    x_start = pdf.l_margin
    width = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.set_font('Mono', '', 8)
    
    code_lines = code_text.split('\n')
    line_h = 3.8
    padding_top = 4
    padding_bottom = 4
    max_y = pdf.h - pdf.b_margin - 18  # leave space for footer
    
    # Max chars per line
    char_w = pdf.get_string_width('M')
    max_chars = int((width - 14) / char_w) if char_w > 0 else 80
    
    # Truncate long lines
    rendered_lines = []
    for cl in code_lines:
        if len(cl) > max_chars:
            cl = cl[:max_chars - 3] + '...'
        rendered_lines.append(cl)
    
    # Split lines into page chunks
    chunks = []  # list of (list of lines)
    current_chunk = []
    y_cursor = pdf.get_y()
    
    for cl in rendered_lines:
        needed = line_h
        if len(current_chunk) == 0:
            needed += padding_top
        
        if y_cursor + needed + padding_bottom > max_y and len(current_chunk) > 0:
            # Current chunk is full, start new chunk on next page
            chunks.append(current_chunk)
            current_chunk = []
            y_cursor = pdf.t_margin  # top margin of new page
        
        if len(current_chunk) == 0:
            y_cursor += padding_top
        
        current_chunk.append(cl)
        y_cursor += line_h
    
    if current_chunk:
        chunks.append(current_chunk)
    
    # Render each chunk: background first, then text
    for chunk_idx, chunk_lines in enumerate(chunks):
        if chunk_idx > 0:
            pdf.add_page()
        
        chunk_h = padding_top + len(chunk_lines) * line_h + padding_bottom
        y_start = pdf.get_y()
        
        # 1) Draw dark background
        pdf.set_fill_color(*COLOR_CODEBLOCK_BG)
        pdf.rect(x_start, y_start, width, chunk_h, 'F')
        
        # 2) Draw red left border
        pdf.set_draw_color(*COLOR_BORDER)
        pdf.set_line_width(1.5)
        pdf.line(x_start, y_start, x_start, y_start + chunk_h)
        
        # 3) Render text on top of background
        pdf.set_text_color(*COLOR_CODEBLOCK_TEXT)
        pdf.set_font('Mono', '', 8)
        pdf.set_y(y_start + padding_top)
        
        for cl in chunk_lines:
            pdf.set_x(x_start + 8)
            pdf.cell(width - 14, line_h, cl)
            pdf.ln(line_h)
        
        pdf.set_y(y_start + chunk_h + 3)
    
    pdf.set_text_color(*COLOR_TEXT)
    pdf.set_font('VN', '', 11)


def _pdf_blockquote(pdf: FPDF, text: str):
    """Render a blockquote with left border."""
    pdf.ln(2)
    x_start = pdf.l_margin
    width = pdf.w - pdf.l_margin - pdf.r_margin
    max_y = pdf.h - pdf.b_margin - 18

    pdf.set_fill_color(*COLOR_QUOTE_BG)
    pdf.set_font('VN', 'I', 10.5)

    text_width = width - 14
    str_w = pdf.get_string_width(text)
    n_lines = max(1, int(str_w / text_width) + 1)
    line_h = 5.5
    total_h = n_lines * line_h + 8

    # Page break check
    if pdf.get_y() + total_h > max_y:
        pdf.add_page()

    y_start = pdf.get_y()
    pdf.set_fill_color(*COLOR_QUOTE_BG)
    pdf.rect(x_start + 5, y_start, width - 5, total_h, 'F')

    pdf.set_draw_color(*COLOR_QUOTE_BORDER)
    pdf.set_line_width(1.5)
    pdf.line(x_start + 5, y_start, x_start + 5, y_start + total_h)

    pdf.set_text_color(80, 80, 80)
    pdf.set_xy(x_start + 12, y_start + 4)
    pdf.multi_cell(text_width, line_h, text)

    pdf.set_y(y_start + total_h + 3)
    pdf.set_font('VN', '', 11)
    pdf.set_text_color(*COLOR_TEXT)


def _pdf_list_item(pdf: FPDF, text: str, indent: int, is_ordered: bool, marker: str):
    """Render a list item."""
    indent_x = pdf.l_margin + 6 + indent * 6
    pdf.set_x(indent_x)
    pdf.set_font('VN', '', 11)
    pdf.set_text_color(*COLOR_TEXT)

    bullet = marker if is_ordered else chr(8226)  # bullet character
    prefix = f"  {bullet} "
    pdf.write(5, prefix)
    _pdf_rich_text(pdf, text)


def _pdf_table(pdf: FPDF, header: list, rows: list):
    """Render a table with colored header, auto-width columns, and text wrapping."""
    pdf.ln(4)
    cols = len(header)
    if cols == 0:
        return

    avail_width = pdf.w - pdf.l_margin - pdf.r_margin
    line_h = 6
    font_size = 8.5
    max_y = pdf.h - pdf.b_margin - 18

    # --- Smart column width calculation ---
    pdf.set_font('VN', 'B', font_size)
    
    # Measure max content width per column
    col_max_w = []
    for i in range(cols):
        # Header width
        hw = pdf.get_string_width(header[i]) + 6
        # Max data width
        dw = 0
        for row in rows:
            if i < len(row):
                w = pdf.get_string_width(row[i]) + 6
                dw = max(dw, w)
        col_max_w.append(max(hw, dw))
    
    total_natural = sum(col_max_w)
    
    if total_natural <= avail_width:
        # All columns fit: distribute remaining space proportionally
        col_widths = [w * avail_width / total_natural for w in col_max_w]
    else:
        # Columns don't fit: use proportional sizing with min widths
        min_col = 18
        col_widths = []
        for w in col_max_w:
            ratio = w / total_natural
            cw = max(min_col, ratio * avail_width)
            col_widths.append(cw)
        # Normalize to fit exactly
        s = sum(col_widths)
        col_widths = [w * avail_width / s for w in col_widths]

    def _draw_header():
        """Draw table header row."""
        pdf.set_font('VN', 'B', font_size)
        pdf.set_fill_color(*COLOR_TABLE_HEADER)
        pdf.set_text_color(*COLOR_TABLE_HEADER_TEXT)
        pdf.set_draw_color(180, 180, 200)
        for i, cell_text in enumerate(header):
            pdf.cell(col_widths[i], line_h, cell_text, border=1, fill=True)
        pdf.ln(line_h)

    def _calc_row_height(row_data):
        """Calculate the height needed for a row with text wrapping."""
        max_lines = 1
        for col_idx in range(cols):
            cell_text = row_data[col_idx] if col_idx < len(row_data) else ''
            cw = col_widths[col_idx] - 4  # padding
            if cw <= 0:
                continue
            text_w = pdf.get_string_width(cell_text)
            n_lines = max(1, int(text_w / cw) + 1)
            max_lines = max(max_lines, n_lines)
        return max_lines * line_h

    def _draw_row(row_data, row_idx):
        """Draw a single data row with text wrapping support."""
        pdf.set_font('VN', '', font_size)
        pdf.set_text_color(*COLOR_TEXT)
        
        if row_idx % 2 == 1:
            pdf.set_fill_color(*COLOR_TABLE_ALT)
        else:
            pdf.set_fill_color(255, 255, 255)
        
        row_h = _calc_row_height(row_data)
        x_start = pdf.get_x()
        y_start = pdf.get_y()
        
        for col_idx in range(cols):
            cell_text = row_data[col_idx] if col_idx < len(row_data) else ''
            x = x_start + sum(col_widths[:col_idx])
            
            # Draw cell background and border
            pdf.set_xy(x, y_start)
            pdf.cell(col_widths[col_idx], row_h, '', border=1, fill=True)
            
            # Draw text inside cell
            pdf.set_xy(x + 2, y_start + 1)
            pdf.multi_cell(col_widths[col_idx] - 4, line_h, cell_text)
        
        pdf.set_xy(x_start, y_start + row_h)

    # --- Render table ---
    _draw_header()
    
    pdf.set_font('VN', '', font_size)
    for row_idx, row_data in enumerate(rows):
        row_h = _calc_row_height(row_data)
        
        # Page break check: repeat header on new page
        if pdf.get_y() + row_h > max_y:
            pdf.add_page()
            _draw_header()
        
        _draw_row(row_data, row_idx)

    pdf.ln(4)
    pdf.set_font('VN', '', 11)


# ============================================================
# DOCX CONVERSION
# ============================================================

def _setup_docx_styles(doc: Document):
    """Setup custom styles for the Word document"""
    style = doc.styles

    normal = style['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor(0x1a, 0x1a, 0x2e)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15

    h1 = style['Heading 1']
    h1.font.name = 'Calibri'
    h1.font.size = Pt(22)
    h1.font.bold = True
    h1.font.color.rgb = RGBColor(0x0f, 0x34, 0x60)
    h1.paragraph_format.space_before = Pt(24)
    h1.paragraph_format.space_after = Pt(10)

    h2 = style['Heading 2']
    h2.font.name = 'Calibri'
    h2.font.size = Pt(16)
    h2.font.bold = True
    h2.font.color.rgb = RGBColor(0x16, 0x21, 0x3e)
    h2.paragraph_format.space_before = Pt(18)
    h2.paragraph_format.space_after = Pt(8)

    h3 = style['Heading 3']
    h3.font.name = 'Calibri'
    h3.font.size = Pt(13)
    h3.font.bold = True
    h3.font.color.rgb = RGBColor(0x53, 0x34, 0x83)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)

    h4 = style['Heading 4']
    h4.font.name = 'Calibri'
    h4.font.size = Pt(11.5)
    h4.font.bold = True
    h4.font.color.rgb = RGBColor(0x0f, 0x34, 0x60)
    h4.paragraph_format.space_before = Pt(10)
    h4.paragraph_format.space_after = Pt(4)


def _add_table_to_docx(doc: Document, header_row: list, data_rows: list):
    """Add a formatted table to the document"""
    cols = len(header_row)
    table = doc.add_table(rows=1 + len(data_rows), cols=cols)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for i, text in enumerate(header_row):
        cell = table.rows[0].cells[i]
        cell.text = text.strip()
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in para.runs:
            run.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        shading = cell._element.get_or_add_tcPr()
        bg = shading.makeelement(qn('w:shd'), {
            qn('w:fill'): '0F3460',
            qn('w:val'): 'clear'
        })
        shading.append(bg)

    for row_idx, row_data in enumerate(data_rows):
        for col_idx, text in enumerate(row_data):
            if col_idx < cols:
                cell = table.rows[row_idx + 1].cells[col_idx]
                cell.text = text.strip()
                for para in cell.paragraphs:
                    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for run in para.runs:
                        run.font.size = Pt(10)
                if row_idx % 2 == 1:
                    shading = cell._element.get_or_add_tcPr()
                    bg = shading.makeelement(qn('w:shd'), {
                        qn('w:fill'): 'F4F6FA',
                        qn('w:val'): 'clear'
                    })
                    shading.append(bg)

    doc.add_paragraph()


def _add_code_block(doc: Document, code_text: str, language: str = ''):
    """Add a styled code block to the document"""
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(6)
    para.paragraph_format.space_after = Pt(6)

    pPr = para._element.get_or_add_pPr()
    shd = pPr.makeelement(qn('w:shd'), {
        qn('w:fill'): 'F0F0F5',
        qn('w:val'): 'clear'
    })
    pPr.append(shd)

    pBdr = pPr.makeelement(qn('w:pBdr'), {})
    left = pBdr.makeelement(qn('w:left'), {
        qn('w:val'): 'single',
        qn('w:sz'): '18',
        qn('w:space'): '4',
        qn('w:color'): 'E94560'
    })
    pBdr.append(left)
    pPr.append(pBdr)

    run = para.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x1a, 0x1a, 0x2e)


def convert_md_to_docx(md_content: str, title: str = "Document") -> bytes:
    """Convert Markdown content to DOCX bytes"""
    doc = Document()

    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    _setup_docx_styles(doc)

    lines = md_content.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    code_lang = ''
    in_table = False
    table_header = []
    table_rows = []

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith('```'):
            if in_code_block:
                _add_code_block(doc, '\n'.join(code_lines), code_lang)
                code_lines = []
                code_lang = ''
                in_code_block = False
            else:
                if in_table and table_header:
                    _add_table_to_docx(doc, table_header, table_rows)
                    table_header, table_rows = [], []
                    in_table = False
                in_code_block = True
                lang_match = re.match(r'^```(\w+)', line.strip())
                code_lang = lang_match.group(1) if lang_match else ''
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        if '|' in line and line.strip().startswith('|'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if all(re.match(r'^[-:]+$', c) for c in cells):
                i += 1
                continue
            if not in_table:
                in_table = True
                table_header = cells
            else:
                table_rows.append(cells)
            i += 1
            continue
        else:
            if in_table and table_header:
                _add_table_to_docx(doc, table_header, table_rows)
                table_header, table_rows = [], []
                in_table = False

        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if re.match(r'^[-*_]{3,}\s*$', stripped):
            para = doc.add_paragraph()
            pPr = para._element.get_or_add_pPr()
            pBdr = pPr.makeelement(qn('w:pBdr'), {})
            bottom = pBdr.makeelement(qn('w:bottom'), {
                qn('w:val'): 'single',
                qn('w:sz'): '12',
                qn('w:space'): '1',
                qn('w:color'): 'E94560'
            })
            pBdr.append(bottom)
            pPr.append(pBdr)
            i += 1
            continue

        heading_match = re.match(r'^(#{1,6})\s+(.*)', stripped)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
            text = re.sub(r'\*(.*?)\*', r'\1', text)
            text = re.sub(r'`(.*?)`', r'\1', text)
            if level <= 4:
                doc.add_heading(text, level=level)
            else:
                para = doc.add_paragraph(text)
                para.runs[0].bold = True
                para.runs[0].font.size = Pt(11)
            i += 1
            continue

        if stripped.startswith('>'):
            quote_text = re.sub(r'^>\s*', '', stripped)
            quote_text = re.sub(r'\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]', r'[\1]', quote_text)
            para = doc.add_paragraph()
            para.paragraph_format.left_indent = Cm(1)
            pPr = para._element.get_or_add_pPr()
            pBdr = pPr.makeelement(qn('w:pBdr'), {})
            left = pBdr.makeelement(qn('w:left'), {
                qn('w:val'): 'single',
                qn('w:sz'): '24',
                qn('w:space'): '4',
                qn('w:color'): '533483'
            })
            pBdr.append(left)
            pPr.append(pBdr)
            run = para.add_run(quote_text)
            run.italic = True
            run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
            i += 1
            continue

        list_match = re.match(r'^(\s*)([-*+]|\d+[.)])\s+(.*)', stripped)
        if list_match:
            indent = len(list_match.group(1))
            marker = list_match.group(2)
            text = list_match.group(3)
            is_ordered = bool(re.match(r'\d+[.)]', marker))
            style_name = 'List Number' if is_ordered else 'List Bullet'
            para = doc.add_paragraph(style=style_name)
            _add_rich_text_docx(para, text)
            if indent > 0:
                para.paragraph_format.left_indent = Cm(1 + indent * 0.5)
            i += 1
            continue

        para = doc.add_paragraph()
        _add_rich_text_docx(para, stripped)
        i += 1

    if in_table and table_header:
        _add_table_to_docx(doc, table_header, table_rows)
    if in_code_block and code_lines:
        _add_code_block(doc, '\n'.join(code_lines), code_lang)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()


def _add_rich_text_docx(para, text: str):
    """Add text with inline markdown formatting (bold, italic, code, links)"""
    pattern = re.compile(
        r'(\*\*\*(.+?)\*\*\*)'
        r'|(\*\*(.+?)\*\*)'
        r'|(\*(.+?)\*)'
        r'|(`(.+?)`)'
        r'|(\[(.+?)\]\((.+?)\))'
    )

    last_end = 0
    for match in pattern.finditer(text):
        if match.start() > last_end:
            para.add_run(text[last_end:match.start()])

        if match.group(2):
            run = para.add_run(match.group(2))
            run.bold = True
            run.italic = True
        elif match.group(4):
            run = para.add_run(match.group(4))
            run.bold = True
            run.font.color.rgb = RGBColor(0x16, 0x21, 0x3e)
        elif match.group(6):
            run = para.add_run(match.group(6))
            run.italic = True
            run.font.color.rgb = RGBColor(0x53, 0x34, 0x83)
        elif match.group(8):
            run = para.add_run(match.group(8))
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0xe9, 0x45, 0x60)
        elif match.group(10):
            link_text = match.group(10)
            run = para.add_run(link_text)
            run.font.color.rgb = RGBColor(0x0f, 0x34, 0x60)
            run.underline = True

        last_end = match.end()

    if last_end < len(text):
        para.add_run(text[last_end:])
