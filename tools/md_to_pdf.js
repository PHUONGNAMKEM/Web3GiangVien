const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// ─── Configuration ───────────────────────────────────────────
const root = process.cwd();
const tmpDir = path.join(root, "tmp", "pdfs");

// Accept input files from command line arguments
const requestedFiles = process.argv.slice(2);
if (requestedFiles.length === 0) {
  console.log("Usage: node tools/md_to_pdf.js <file1.md> [file2.md] ...");
  console.log("Example: node tools/md_to_pdf.js README.md");
  console.log("         node tools/md_to_pdf.js HocMayNCVault/Notes/DanhGia_DuAn.md");
  process.exit(1);
}

const documents = requestedFiles.map((filePath) => {
  const resolved = path.resolve(root, filePath);
  const baseName = path.basename(resolved, ".md");
  const outputDir = path.dirname(resolved);
  return {
    input: resolved,
    output: path.join(outputDir, `${baseName}.pdf`),
  };
});

// ─── HTML Helpers ────────────────────────────────────────────

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(value) {
  let text = escapeHtml(value.trim());
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function tableAlignments(separator) {
  return splitTableRow(separator).map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

function renderTable(lines, start) {
  const headers = splitTableRow(lines[start]);
  const align = tableAlignments(lines[start + 1]);
  const rows = [];
  let i = start + 2;
  while (i < lines.length && /^\s*\|/.test(lines[i]) && !isTableSeparator(lines[i])) {
    rows.push(splitTableRow(lines[i]));
    i += 1;
  }

  const th = headers
    .map((cell, index) => `<th style="text-align:${align[index] || "left"}">${inline(cell)}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const td = headers
        .map((_, index) => `<td style="text-align:${align[index] || "left"}">${inline(row[index] || "")}</td>`)
        .join("");
      return `<tr>${td}</tr>`;
    })
    .join("\n");

  return {
    html: `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`,
    next: i,
  };
}

function isBlockStart(line, nextLine = "") {
  return (
    line.trim() === "" ||
    /^#{1,6}\s+/.test(line) ||
    /^-{3,}\s*$/.test(line) ||
    /^>\s?/.test(line) ||
    /^```/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    (/^\s*\|/.test(line) && isTableSeparator(nextLine))
  );
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const html = [];
  let i = 0;

  // Skip YAML frontmatter
  if (lines[0] && lines[0].trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      i += 1;
    }
    i += 1; // skip closing ---
  }

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] || "";

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\s*\|/.test(line) && isTableSeparator(next)) {
      const rendered = renderTable(lines, i);
      html.push(rendered.html);
      i = rendered.next;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      html.push("<hr>");
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && !isBlockStart(lines[i], lines[i + 1] || "")) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
}

// ─── CSS (grayscale, optimized for PDF) ──────────────────────
function css() {
  return `
    @page {
      size: A4;
      margin: 15mm 14mm 18mm;
    }
    * { box-sizing: border-box; }
    body {
      color: #111111;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      margin: 0;
      orphans: 3;
      widows: 3;
    }

    /* ── Headings ───────────────────────────────── */
    h1 {
      color: #000000;
      font-size: 18pt;
      line-height: 1.2;
      margin: 0 0 3mm;
      padding-bottom: 2mm;
      border-bottom: 2px solid #000000;
      page-break-after: avoid;
    }
    h2 {
      color: #000000;
      font-size: 13pt;
      margin: 5mm 0 2mm;
      padding-bottom: 1mm;
      border-bottom: 0.5px solid #999999;
      page-break-after: avoid;
    }
    h3 {
      color: #111111;
      font-size: 11pt;
      margin: 4mm 0 1.5mm;
      page-break-after: avoid;
    }
    h4, h5, h6 {
      color: #222222;
      font-size: 10pt;
      margin: 3mm 0 1mm;
      page-break-after: avoid;
    }

    /* ── Paragraph & text ──────────────────────── */
    p {
      margin: 0 0 2mm;
    }

    /* ── Horizontal rule ───────────────────────── */
    hr {
      border: 0;
      border-top: 0.5px solid #CCCCCC;
      margin: 3mm 0;
    }

    /* ── Tables ────────────────────────────────── */
    table {
      border-collapse: collapse;
      font-size: 8.5pt;
      line-height: 1.3;
      margin: 2mm 0 3mm;
      width: 100%;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #222222;
      border: 0.5px solid #222222;
      color: #FFFFFF;
      font-weight: 600;
      padding: 3px 5px;
      vertical-align: middle;
      font-size: 8.5pt;
    }
    td {
      border: 0.5px solid #BBBBBB;
      padding: 2.5px 5px;
      vertical-align: top;
      font-size: 8.5pt;
    }
    tbody tr:nth-child(even) td {
      background: #F5F5F5;
    }

    /* ── Blockquote ────────────────────────────── */
    blockquote {
      border-left: 3px solid #555555;
      background: #F5F5F5;
      margin: 2mm 0;
      padding: 2mm 3mm;
      color: #333333;
      font-size: 9.5pt;
    }

    /* ── Code blocks ───────────────────────────── */
    pre {
      background: #F0F0F0;
      border: 0.5px solid #CCCCCC;
      border-radius: 3px;
      color: #111111;
      font-size: 8pt;
      line-height: 1.25;
      margin: 2mm 0;
      overflow-wrap: anywhere;
      padding: 2.5mm;
      white-space: pre-wrap;
    }
    code {
      background: #EEEEEE;
      border-radius: 2px;
      color: #111111;
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.88em;
      padding: 0.5px 2px;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      font-size: inherit;
    }

    /* ── Lists ─────────────────────────────────── */
    ul, ol {
      margin: 0 0 2mm 4mm;
      padding-left: 4mm;
    }
    li {
      margin: 0.5mm 0;
    }

    /* ── Inline styles ─────────────────────────── */
    strong {
      color: #000000;
    }
  `;
}

function renderHtml(markdown, sourcePath) {
  const title = path.basename(sourcePath, ".md");
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${css()}</style>
</head>
<body>
${renderMarkdown(markdown)}
</body>
</html>`;
}

// ─── Browser detection ───────────────────────────────────────
function browserPath() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((c) => fs.existsSync(c));
}

// ─── Main ────────────────────────────────────────────────────
fs.mkdirSync(tmpDir, { recursive: true });

const browser = browserPath();
if (!browser) {
  console.error("ERROR: No Chrome or Edge found for headless PDF rendering.");
  process.exit(1);
}

console.log(`Using browser: ${path.basename(browser)}`);
console.log(`Converting ${documents.length} file(s)...\n`);

for (const doc of documents) {
  if (!fs.existsSync(doc.input)) {
    console.error(`  SKIP: ${doc.input} (file not found)`);
    continue;
  }

  const markdown = fs.readFileSync(doc.input, "utf8");
  const htmlPath = path.join(tmpDir, `${path.basename(doc.input, ".md")}.html`);
  fs.writeFileSync(htmlPath, renderHtml(markdown, doc.input), "utf8");

  const result = spawnSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-gpu-compositing",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--no-pdf-header-footer",
    `--print-to-pdf=${doc.output}`,
    `file:///${htmlPath.replace(/\\/g, "/")}`,
  ], { stdio: "inherit" });

  if (result.status !== 0) {
    console.error(`  FAILED: ${doc.input}`);
  } else {
    console.log(`  OK: ${doc.output}`);
  }
}

console.log("\nDone.");
