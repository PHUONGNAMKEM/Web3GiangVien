const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outputDir = path.join(root, "ObsidianVault", "_log", "19_05_2026");
const tmpDir = path.join(root, "tmp", "docx");

const documents = [
  {
    input: path.join(root, "user_guide", "GHD_HR_0204_User_Guide_v1.md"),
    output: path.join(outputDir, "GHD_HR_0204_User_Guide_v1.docx"),
  },
  {
    input: path.join(root, "user_guide", "GHD_HR_0205_User_Guide_v1.md"),
    output: path.join(outputDir, "GHD_HR_0205_User_Guide_v1.docx"),
  },
];

function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function parseInline(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        result.push({ text: text.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    if (text.startsWith("`", i)) {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        result.push({ text: text.slice(i + 1, end), code: true });
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith("*", i)) {
      const end = text.indexOf("*", i + 1);
      if (end !== -1) {
        result.push({ text: text.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    const nextMarkers = ["**", "`", "*"]
      .map((marker) => text.indexOf(marker, i + 1))
      .filter((index) => index !== -1);
    const next = nextMarkers.length ? Math.min(...nextMarkers) : text.length;
    result.push({ text: text.slice(i, next) });
    i = next;
  }
  return result.filter((run) => run.text.length);
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

function parseMarkdown(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const blocks = [];
  let i = 0;

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
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (/^\s*\|/.test(line) && isTableSeparator(next)) {
      const headers = splitTableRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i]) && !isTableSeparator(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        blocks.push({ type: "list", ordered: false, text: lines[i].replace(/^\s*[-*+]\s+/, "") });
        i += 1;
      }
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      let number = 1;
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        blocks.push({ type: "list", ordered: true, number, text: lines[i].replace(/^\s*\d+\.\s+/, "") });
        number += 1;
        i += 1;
      }
      continue;
    }

    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && !isBlockStart(lines[i], lines[i + 1] || "")) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function runXml(run) {
  const props = [];
  if (run.bold) props.push("<w:b/>");
  if (run.italic) props.push("<w:i/>");
  if (run.code) {
    props.push('<w:rStyle w:val="CodeChar"/>');
    props.push('<w:shd w:fill="EEF2F7"/>');
  }
  return `<w:r>${props.length ? `<w:rPr>${props.join("")}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(run.text)}</w:t></w:r>`;
}

function inlineXml(text) {
  return parseInline(text).map(runXml).join("");
}

function inlineXmlWithProps(text, rPr = "") {
  return parseInline(text).map((run) => {
    const base = [];
    if (run.bold) base.push("<w:b/>");
    if (run.italic) base.push("<w:i/>");
    if (run.code) {
      base.push('<w:rStyle w:val="CodeChar"/>');
      base.push('<w:shd w:fill="EEF2F7"/>');
    }
    return `<w:r>${base.length || rPr ? `<w:rPr>${rPr}${base.join("")}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(run.text)}</w:t></w:r>`;
  }).join("");
}

function paragraph(text, style = "BodyText", extraPr = "", rPr = "") {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extraPr}</w:pPr>${inlineXmlWithProps(text, rPr)}</w:p>`;
}

function heading(block) {
  if (block.level === 1) {
    return paragraph(
      block.text,
      "Heading1",
      '<w:keepNext/><w:spacing w:before="0" w:after="240"/><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="8" w:color="F2C94C"/></w:pBdr>',
      '<w:b/><w:color w:val="B11F1F"/><w:sz w:val="44"/>'
    );
  }
  if (block.level === 2) {
    return paragraph(
      block.text,
      "Heading2",
      '<w:keepNext/><w:spacing w:before="360" w:after="140"/>',
      '<w:b/><w:color w:val="8B1E1E"/><w:sz w:val="32"/>'
    );
  }
  return paragraph(
    block.text,
    "Heading3",
    '<w:keepNext/><w:spacing w:before="240" w:after="100"/>',
    '<w:b/><w:color w:val="27313F"/><w:sz w:val="25"/>'
  );
}

function codeBlock(text) {
  const runs = text.split("\n").map((line) => `<w:r><w:rPr><w:rStyle w:val="CodeChar"/></w:rPr><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join("<w:br/>");
  return `<w:p><w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr>${runs}</w:p>`;
}

function tableCell(content, header = false, width = 2500) {
  const fill = header ? '<w:shd w:fill="B11F1F"/>' : "";
  const color = header ? '<w:color w:val="FFFFFF"/>' : "";
  const bold = header ? "<w:b/>" : "";
  const runs = parseInline(content).map((run) => runXml({ ...run, bold: header || run.bold })).join("");
  const cellMargin = '<w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>';
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill}${cellMargin}</w:tcPr><w:p><w:pPr><w:pStyle w:val="TableText"/><w:spacing w:after="0" w:line="220" w:lineRule="auto"/></w:pPr>${header ? runs.replace(/<w:rPr>/g, `<w:rPr>${color}${bold}`) : runs}</w:p></w:tc>`;
}

function table(block) {
  const columnCount = Math.max(block.headers.length, ...block.rows.map((row) => row.length));
  const width = Math.floor(9360 / Math.max(columnCount, 1));
  const grid = Array.from({ length: columnCount }, () => `<w:gridCol w:w="${width}"/>`).join("");
  const headerRow = `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="360" w:hRule="atLeast"/></w:trPr>${Array.from({ length: columnCount }, (_, index) => tableCell(block.headers[index] || "", true, width)).join("")}</w:tr>`;
  const bodyRows = block.rows
    .map((row) => `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="320" w:hRule="atLeast"/></w:trPr>${Array.from({ length: columnCount }, (_, index) => tableCell(row[index] || "", false, width)).join("")}</w:tr>`)
    .join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="PSMTable"/><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblLayout w:type="autofit"/><w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${headerRow}${bodyRows}</w:tbl>`;
}

function documentXml(blocks) {
  const body = blocks.map((block) => {
    if (block.type === "heading") return heading(block);
    if (block.type === "paragraph") return paragraph(block.text);
    if (block.type === "quote") {
      return paragraph(block.text, "Quote", '<w:ind w:left="360"/><w:shd w:fill="FFF8DF"/>');
    }
    if (block.type === "code") return codeBlock(block.text);
    if (block.type === "list") {
      const prefix = block.ordered ? `${block.number}. ` : "• ";
      return paragraph(`${prefix}${block.text}`, "BodyText", '<w:ind w:left="420" w:hanging="240"/>');
    }
    if (block.type === "table") return table(block);
    if (block.type === "hr") {
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D8DEE7"/></w:pBdr></w:pPr></w:p>';
    }
    return "";
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du wp14">
  <w:body>
    ${body}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="794" w:right="737" w:bottom="907" w:left="737" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>
  </w:body>
</w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="BodyText"><w:name w:val="Body Text"/><w:qFormat/><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:eastAsia="Segoe UI"/><w:sz w:val="21"/><w:color w:val="1F2933"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="BodyText"/><w:next w:val="BodyText"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="240"/><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="8" w:color="F2C94C"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="B11F1F"/><w:sz w:val="44"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="BodyText"/><w:next w:val="BodyText"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="8B1E1E"/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="BodyText"/><w:next w:val="BodyText"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="27313F"/><w:sz w:val="25"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="BodyText"/><w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="BodyText"/><w:pPr><w:spacing w:before="120" w:after="120"/><w:shd w:fill="111827"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="F9FAFB"/><w:sz w:val="18"/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="BodyText"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:eastAsia="Segoe UI"/><w:sz w:val="19"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="PSMTable"><w:name w:val="PSM Table"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="6" w:color="D5DBE5"/><w:left w:val="single" w:sz="6" w:color="D5DBE5"/><w:bottom w:val="single" w:sz="6" w:color="D5DBE5"/><w:right w:val="single" w:sz="6" w:color="D5DBE5"/><w:insideH w:val="single" w:sz="6" w:color="D5DBE5"/><w:insideV w:val="single" w:sz="6" w:color="D5DBE5"/></w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function writeZip(entries, destination) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.content, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    fileParts.push(local, nameBuffer, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const centralOffset = offset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(destination, Buffer.concat([...fileParts, ...centralParts, end]));
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;
}

function packageRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function documentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
}

function settingsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;
}

function makeDocx(doc) {
  const baseName = path.basename(doc.output, ".docx");
  const packageDir = path.join(tmpDir, baseName);
  let outputPath = doc.output;
  fs.rmSync(packageDir, { recursive: true, force: true });
  try {
    fs.rmSync(outputPath, { force: true });
  } catch (error) {
    const dir = path.dirname(outputPath);
    outputPath = path.join(dir, `${baseName}_styled.docx`);
    fs.rmSync(outputPath, { force: true });
  }

  const blocks = parseMarkdown(fs.readFileSync(doc.input, "utf8"));
  const entries = [
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: packageRelsXml() },
    { name: "word/_rels/document.xml.rels", content: documentRelsXml() },
    { name: "word/document.xml", content: documentXml(blocks) },
    { name: "word/styles.xml", content: stylesXml() },
    { name: "word/settings.xml", content: settingsXml() },
  ];
  for (const entry of entries) {
    writeFile(path.join(packageDir, ...entry.name.split("/")), entry.content);
  }
  writeZip(entries, outputPath);
  console.log(`Created ${outputPath}`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });
documents.forEach(makeDocx);
