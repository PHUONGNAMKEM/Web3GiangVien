"""
MD Converter — Web UI
Flask server with beautiful drag-and-drop interface
"""

import os
import sys
import zipfile
import base64
from flask import Flask, request, jsonify, send_file, render_template_string
from io import BytesIO
from converter import convert_md_to_pdf, convert_md_to_docx, md_to_html

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

HTML_TEMPLATE = r"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MD Converter — Markdown → PDF / Word</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg-primary: #0a0a1a;
            --bg-secondary: #111128;
            --bg-card: #16163a;
            --bg-hover: #1e1e4a;
            --accent: #6c5ce7;
            --accent-hover: #7d6ff0;
            --accent-glow: rgba(108, 92, 231, 0.3);
            --pink: #e94560;
            --pink-glow: rgba(233, 69, 96, 0.3);
            --cyan: #00cec9;
            --cyan-glow: rgba(0, 206, 201, 0.3);
            --text-primary: #eef0f6;
            --text-secondary: #8b8db0;
            --text-muted: #5a5c7a;
            --border: #2a2a5a;
            --border-hover: #3a3a7a;
            --success: #00b894;
            --warning: #fdcb6e;
            --error: #e94560;
            --radius: 16px;
            --radius-sm: 10px;
            --shadow: 0 4px 30px rgba(0,0,0,0.3);
            --shadow-glow: 0 0 40px var(--accent-glow);
        }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Animated background */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: 
                radial-gradient(ellipse at 20% 50%, rgba(108,92,231,0.08) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(233,69,96,0.06) 0%, transparent 50%),
                radial-gradient(ellipse at 60% 80%, rgba(0,206,201,0.05) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
            position: relative;
            z-index: 1;
        }

        /* Header */
        .header {
            text-align: center;
            padding: 40px 0 32px;
        }

        .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--accent), var(--pink));
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 16px;
        }

        .header h1 {
            font-size: 42px;
            font-weight: 800;
            background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 50%, var(--pink) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }

        .header p {
            color: var(--text-secondary);
            font-size: 16px;
        }

        /* Main grid */
        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 24px;
        }

        /* Cards */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .card:hover {
            border-color: var(--border-hover);
        }

        .card-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .card-header-icon {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }

        .card-header-icon.purple { background: rgba(108,92,231,0.15); color: var(--accent); }
        .card-header-icon.pink { background: rgba(233,69,96,0.15); color: var(--pink); }
        .card-header-icon.cyan { background: rgba(0,206,201,0.15); color: var(--cyan); }

        .card-header h3 {
            font-size: 15px;
            font-weight: 600;
        }

        .card-body {
            padding: 24px;
        }

        /* Drop zone */
        .drop-zone {
            border: 2px dashed var(--border);
            border-radius: var(--radius);
            padding: 48px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: rgba(108,92,231,0.03);
            position: relative;
        }

        .drop-zone:hover, .drop-zone.dragover {
            border-color: var(--accent);
            background: rgba(108,92,231,0.08);
            box-shadow: var(--shadow-glow);
        }

        .drop-zone.has-file {
            border-color: var(--success);
            background: rgba(0,184,148,0.06);
            border-style: solid;
        }

        .drop-zone-icon {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
        }

        .drop-zone-text {
            font-size: 15px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .drop-zone-hint {
            font-size: 12px;
            color: var(--text-muted);
        }

        /* File List UX */
        .file-list {
            display: none;
            margin-top: 16px;
            flex-direction: column;
            gap: 8px;
            max-height: 180px;
            overflow-y: auto;
            padding-right: 4px;
        }

        .file-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: rgba(108, 92, 231, 0.04);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 13px;
            transition: all 0.2s;
            cursor: pointer;
        }

        .file-item:hover {
            border-color: var(--accent);
            background: rgba(108, 92, 231, 0.08);
        }

        .file-item.active {
            border-color: var(--cyan);
            background: rgba(0, 206, 201, 0.08);
        }

        .file-item-name {
            font-weight: 500;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 250px;
        }

        .file-item-size {
            color: var(--text-secondary);
            font-size: 11px;
            margin-left: 8px;
        }

        .file-item-remove {
            margin-left: auto;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
        }

        .file-item-remove:hover {
            color: var(--pink);
            background: rgba(233, 69, 96, 0.1);
        }

        input[type="file"] { display: none; }

        /* Document Settings and History styles */
        .settings-input {
            width: 100%;
            padding: 8px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            font-size: 12px;
            outline: none;
            transition: border-color 0.2s;
        }

        .settings-input:focus {
            border-color: var(--accent);
        }

        .history-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 11px;
            transition: all 0.2s;
        }

        .history-item:hover {
            background: rgba(255,255,255,0.05);
            border-color: var(--cyan);
        }

        /* Textarea */
        .md-textarea {
            width: 100%;
            min-height: 300px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            line-height: 1.6;
            padding: 16px;
            resize: vertical;
            outline: none;
            transition: border-color 0.3s;
        }

        .md-textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .md-textarea::placeholder {
            color: var(--text-muted);
        }

        /* Buttons */
        .btn-group {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }

        .btn {
            flex: 1;
            padding: 14px 24px;
            border: none;
            border-radius: var(--radius-sm);
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
        }

        .btn::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(135deg, transparent, rgba(255,255,255,0.1));
            opacity: 0;
            transition: opacity 0.3s;
        }

        .btn:hover::after { opacity: 1; }

        .btn-pdf {
            background: linear-gradient(135deg, #e94560, #c23152);
            color: white;
        }

        .btn-pdf:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px var(--pink-glow);
        }

        .btn-docx {
            background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
            color: white;
        }

        .btn-docx:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px var(--accent-glow);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .btn .spinner {
            display: none;
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        .btn.loading .spinner { display: inline-block; }
        .btn.loading .btn-text { display: none; }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Preview */
        .preview-area {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 24px;
            min-height: 300px;
            max-height: 600px;
            overflow-y: auto;
            font-size: 13px;
            line-height: 1.7;
        }

        .preview-area h1 { font-size: 22px; color: #6c5ce7; border-bottom: 2px solid #6c5ce7; padding-bottom: 6px; margin: 20px 0 10px; }
        .preview-area h2 { font-size: 17px; color: #e94560; border-bottom: 1px solid #e94560; padding-bottom: 4px; margin: 16px 0 8px; }
        .preview-area h3 { font-size: 14px; color: #00cec9; margin: 12px 0 6px; }
        .preview-area h4 { font-size: 13px; color: var(--accent); margin: 10px 0 4px; }
        .preview-area p { margin: 4px 0 8px; color: var(--text-secondary); }
        .preview-area strong { color: var(--text-primary); }
        .preview-area em { color: var(--accent); }
        .preview-area code {
            font-family: 'JetBrains Mono', monospace;
            background: rgba(108,92,231,0.15);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--pink);
        }
        .preview-area pre {
            background: #0a0a1a;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 3px solid var(--pink);
            overflow-x: auto;
            margin: 8px 0;
        }
        .preview-area pre code {
            background: none;
            padding: 0;
            color: #ccc;
        }
        .preview-area table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 12px;
        }
        .preview-area th {
            background: var(--accent);
            color: white;
            padding: 8px 10px;
            text-align: left;
        }
        .preview-area td {
            padding: 6px 10px;
            border: 1px solid var(--border);
        }
        .preview-area tr:nth-child(even) td { background: rgba(108,92,231,0.05); }
        .preview-area blockquote {
            border-left: 3px solid var(--accent);
            margin: 8px 0;
            padding: 8px 16px;
            background: rgba(108,92,231,0.05);
            color: var(--text-secondary);
        }
        .preview-area ul, .preview-area ol { padding-left: 20px; color: var(--text-secondary); }
        .preview-area li { margin: 2px 0; }
        .preview-area hr { border: none; border-top: 2px solid var(--pink); margin: 16px 0; }
        .preview-area a { color: var(--cyan); text-decoration: underline; }

        .preview-empty {
            text-align: center;
            padding: 60px 24px;
            color: var(--text-muted);
        }

        .preview-empty-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 12px;
        }

        .btn-fullscreen {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 8px 14px;
            border-radius: var(--radius-sm);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }

        .btn-fullscreen:hover {
            color: var(--text-primary);
            border-color: var(--accent);
            background: rgba(108, 92, 231, 0.1);
            box-shadow: 0 0 10px rgba(108, 92, 231, 0.2);
        }

        /* Fullscreen Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(5, 5, 12, 0.96);
            z-index: 2000;
            display: none;
            flex-direction: column;
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-overlay.show {
            display: flex;
            opacity: 1;
        }

        .modal-header {
            background: rgba(16, 16, 40, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            padding: 16px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 10;
        }

        .modal-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .modal-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .modal-btn {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-primary);
            padding: 8px 16px;
            border-radius: var(--radius-sm);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .modal-btn:hover {
            background: rgba(255,255,255,0.12);
            border-color: rgba(255,255,255,0.25);
        }

        .modal-btn-primary {
            background: linear-gradient(135deg, #e94560, #c23152);
            border: none;
            color: white;
        }

        .modal-btn-primary:hover {
            box-shadow: 0 4px 15px var(--pink-glow);
            transform: translateY(-1px);
        }

        .modal-btn-secondary {
            background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
            border: none;
            color: white;
        }

        .modal-btn-secondary:hover {
            box-shadow: 0 4px 15px var(--accent-glow);
            transform: translateY(-1px);
        }

        .modal-btn-close {
            background: transparent;
            border: 1px solid var(--error);
            color: var(--error);
        }

        .modal-btn-close:hover {
            background: rgba(233, 69, 96, 0.1);
        }

        .modal-zoom-label {
            font-size: 13px;
            color: var(--text-secondary);
            font-weight: 600;
            min-width: 48px;
            text-align: center;
        }

        .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }

        .a4-page-container {
            transform-origin: top center;
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Simulated A4 page styling using PDF colors */
        .a4-page {
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            background: #ffffff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            color: #1a1a2e; /* matches COLOR_TEXT */
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            box-sizing: border-box;
            border-radius: 4px;
            text-align: left;
            margin-bottom: 20px;
            overflow: hidden;
        }

        /* A4 inside elements matching fpdf styling exactly */
        .a4-page h1 {
            color: #0f3460; /* COLOR_HEADING1 */
            font-size: 22pt;
            font-weight: bold;
            line-height: 1.2;
            margin: 0 0 15pt;
            border-bottom: 2px solid #e94560; /* COLOR_BORDER */
            padding-bottom: 6px;
        }

        .a4-page h2 {
            color: #16213e; /* COLOR_HEADING2 */
            font-size: 16pt;
            font-weight: bold;
            margin: 18pt 0 10pt;
            border-bottom: 1px solid #d5dbe5;
            padding-bottom: 4px;
        }

        .a4-page h3 {
            color: #533483; /* COLOR_HEADING3 */
            font-size: 13pt;
            font-weight: bold;
            margin: 14pt 0 8pt;
        }

        .a4-page h4 {
            color: #0f3460; /* COLOR_HEADING4 */
            font-size: 11pt;
            font-weight: bold;
            margin: 12pt 0 6pt;
        }

        .a4-page p {
            margin: 0 0 10pt;
            color: #1a1a2e;
        }

        .a4-page blockquote {
            border-left: 4px solid #533483; /* COLOR_QUOTE_BORDER */
            background: #f8f6ff; /* COLOR_QUOTE_BG */
            margin: 12pt 0;
            padding: 8pt 14pt;
            color: #4a4a5e;
            font-style: italic;
        }

        .a4-page code {
            font-family: Consolas, monospace;
            background: #f0f0f5; /* COLOR_CODE_BG */
            color: #e94560; /* COLOR_CODE_TEXT */
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 9.5pt;
        }

        .a4-page pre {
            background: #1a1a2e; /* COLOR_CODEBLOCK_BG */
            padding: 12pt 16pt;
            border-radius: 6px;
            margin: 12pt 0;
            overflow-x: auto;
        }

        .a4-page pre code {
            background: transparent;
            color: #e0e0e0; /* COLOR_CODEBLOCK_TEXT */
            padding: 0;
            font-size: 9.5pt;
        }

        .a4-page table {
            width: 100%;
            border-collapse: collapse;
            margin: 12pt 0;
            font-size: 10pt;
        }

        .a4-page th {
            background: #0f3460; /* COLOR_TABLE_HEADER */
            color: #ffffff; /* COLOR_TABLE_HEADER_TEXT */
            font-weight: bold;
            border: 1px solid #0f3460;
            padding: 8px 10px;
            text-align: left;
        }

        .a4-page td {
            border: 1px solid #d5dbe5;
            padding: 8px 10px;
            color: #1a1a2e;
        }

        .a4-page tr:nth-child(even) td {
            background: #f4f6fa; /* COLOR_TABLE_ALT */
        }

        .a4-page ul, .a4-page ol {
            margin: 0 0 10pt 15pt;
            padding-left: 10pt;
        }

        .a4-page li {
            margin: 4pt 0;
        }

        .a4-page hr {
            border: none;
            border-top: 1px solid #e94560; /* COLOR_BORDER */
            margin: 16pt 0;
        }

        /* Toast */
        .toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 14px 24px;
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-weight: 500;
            color: white;
            z-index: 1000;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 400px;
        }

        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }

        .toast.success { background: linear-gradient(135deg, #00b894, #00897b); }
        .toast.error { background: linear-gradient(135deg, #e94560, #c23152); }
        .toast.info { background: linear-gradient(135deg, #6c5ce7, #5a4bd1); }

        /* Stats */
        .stats-bar {
            display: flex;
            gap: 16px;
            margin-top: 16px;
        }

        .stat-item {
            flex: 1;
            background: var(--bg-secondary);
            padding: 12px 16px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
            text-align: center;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: var(--accent);
        }

        .stat-label {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Full width */
        .full-width {
            grid-column: 1 / -1;
        }

        /* Tabs */
        .tabs {
            display: flex;
            gap: 0;
            margin-bottom: 16px;
            background: var(--bg-secondary);
            border-radius: var(--radius-sm);
            padding: 4px;
        }

        .tab {
            flex: 1;
            padding: 10px 16px;
            border: none;
            background: transparent;
            color: var(--text-muted);
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s;
        }

        .tab.active {
            background: var(--accent);
            color: white;
        }

        .tab:hover:not(.active) {
            color: var(--text-primary);
            background: rgba(108,92,231,0.1);
        }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* Responsive */
        @media (max-width: 768px) {
            .main-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 28px; }
            .btn-group { flex-direction: column; }
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg-secondary); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        /* Footer */
        .footer {
            text-align: center;
            padding: 32px 0;
            color: var(--text-muted);
            font-size: 12px;
        }

        .footer a { color: var(--accent); text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-badge">⚡ Web3GiangVien Tools</div>
            <h1>MD Converter</h1>
            <p>Chuyển đổi Markdown thành PDF hoặc Word đẹp mắt, chuyên nghiệp</p>
        </div>

        <!-- Main Grid -->
        <div class="main-grid">
            <!-- Left: Input -->
            <div class="card">
                <div class="card-header">
                    <div class="card-header-icon purple">📝</div>
                    <h3>Nội dung Markdown</h3>
                </div>
                <div class="card-body">
                    <!-- Tabs -->
                    <div class="tabs">
                        <button class="tab active" onclick="switchTab('file')">📁 Upload File</button>
                        <button class="tab" onclick="switchTab('text')">✏️ Nhập Trực Tiếp</button>
                    </div>

                    <!-- Tab: File Upload -->
                    <div id="tab-file" class="tab-content active">
                        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
                            <span class="drop-zone-icon">📄</span>
                            <div class="drop-zone-text">Kéo thả các file <strong>.md</strong> vào đây</div>
                            <div class="drop-zone-hint">hoặc nhấn để chọn (tối đa 50MB, có thể chọn nhiều file)</div>
                            <input type="file" id="fileInput" accept=".md,.markdown,.txt" multiple onchange="handleFileSelect(event)">
                        </div>
                        <div class="file-list" id="fileList"></div>
                    </div>

                    <!-- Tab: Direct Input -->
                    <div id="tab-text" class="tab-content">
                        <textarea class="md-textarea" id="mdTextarea" 
                            placeholder="# Tiêu đề&#10;&#10;Nhập nội dung Markdown ở đây...&#10;&#10;## Mục 2&#10;&#10;- Danh sách 1&#10;- Danh sách 2&#10;&#10;**Bold** và *italic*&#10;&#10;```javascript&#10;console.log('Hello');&#10;```"
                            oninput="updatePreview()"></textarea>
                    </div>

                    <!-- Document Metadata Settings -->
                    <div class="doc-settings" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                        <h4 style="font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">⚙️ Cấu hình Header & Footer</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Tên dự án</label>
                                <input type="text" id="metaProjectName" placeholder="Ví dụ: Odoo 19 Manual" class="settings-input" oninput="syncMetadata()">
                            </div>
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Phiên bản</label>
                                <input type="text" id="metaVersion" placeholder="Ví dụ: v1.0" class="settings-input" oninput="syncMetadata()">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Logo bên trái (Header)</label>
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    <button type="button" class="btn" style="padding: 8px 10px; font-size: 11px; flex: none; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-primary); height: 32px;" onclick="document.getElementById('logoLeftInput').click()">📁 Trái</button>
                                    <span id="logoLeftFileName" style="font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">Chưa chọn</span>
                                    <input type="file" id="logoLeftInput" accept="image/png, image/jpeg, image/jpg" style="display:none;" onchange="handleLogoLeftSelect(event)">
                                </div>
                            </div>
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Logo bên phải (Header)</label>
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    <button type="button" class="btn" style="padding: 8px 10px; font-size: 11px; flex: none; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-primary); height: 32px;" onclick="document.getElementById('logoInput').click()">📁 Phải</button>
                                    <span id="logoFileName" style="font-size: 10px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">Chưa chọn</span>
                                    <input type="file" id="logoInput" accept="image/png, image/jpeg, image/jpg" style="display:none;" onchange="handleLogoSelect(event)">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Document Style Settings -->
                    <div class="style-settings" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                        <h4 style="font-size: 13px; font-weight: 600; color: var(--cyan); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">🎨 Tùy chỉnh Giao diện Tài liệu</h4>
                        
                        <!-- Theme color selection -->
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 6px; font-weight: 500;">Tông màu chủ đề (Theme Color)</label>
                            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                                <input type="color" id="styleThemeColor" value="#0f3460" style="border: none; width: 36px; height: 32px; border-radius: var(--radius-sm); cursor: pointer; background: transparent; padding: 0; flex-shrink: 0;" oninput="applyStyles()">
                                <button type="button" class="btn" style="padding: 0 4px; font-size: 11px; flex: 1; background: #222222; color: white; height: 32px; border: none; min-width: 40px;" onclick="setQuickColor('#222222')">B&W</button>
                                <button type="button" class="btn" style="padding: 0 4px; font-size: 11px; flex: 1; background: #0f3460; color: white; height: 32px; border: none; min-width: 50px;" onclick="setQuickColor('#0f3460')">Navy</button>
                                <button type="button" class="btn" style="padding: 0 4px; font-size: 11px; flex: 1; background: #00b894; color: white; height: 32px; border: none; min-width: 50px;" onclick="setQuickColor('#00b894')">Green</button>
                                <button type="button" class="btn" style="padding: 0 4px; font-size: 11px; flex: 1; background: #e94560; color: white; height: 32px; border: none; min-width: 50px;" onclick="setQuickColor('#e94560')">Rose</button>
                                <button type="button" class="btn" style="padding: 0 4px; font-size: 11px; flex: 1; background: #2a2a5a; color: white; height: 32px; border: none; min-width: 50px;" onclick="setQuickColor('#2a2a5a')">Dark</button>
                                <button type="button" class="btn" style="padding: 0 4px; font-size: 11px; flex: 1; background: #a91d22; color: white; height: 32px; border: none; min-width: 60px;" onclick="setQuickColor('#a91d22')">Red</button>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Phông chữ</label>
                                <select id="styleFontFamily" class="settings-input" onchange="applyStyles()">
                                    <option value="Arial">Arial</option>
                                    <option value="Segoe UI">Segoe UI</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Calibri">Calibri</option>
                                    <option value="Courier New">Courier New</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Căn lề (Margins)</label>
                                <select id="styleMargin" class="settings-input" onchange="applyStyles()">
                                    <option value="standard">Tiêu chuẩn (20mm)</option>
                                    <option value="narrow">Hẹp (15mm)</option>
                                    <option value="wide">Rộng (25mm)</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Khổ & Hướng giấy</label>
                                <select id="styleOrientation" class="settings-input" onchange="applyStyles()">
                                    <option value="P">Khổ dọc (Portrait)</option>
                                    <option value="L">Khổ ngang (Landscape)</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; font-weight: 500;">Định dạng Footer</label>
                                <select id="styleFooterFormat" class="settings-input" onchange="applyStyles()">
                                    <option value="page_of_total">Trang X/Y (Căn giữa)</option>
                                    <option value="page_only">X (Căn giữa)</option>
                                    <option value="brackets">- X - (Căn giữa)</option>
                                    <option value="right_align">Trang X/Y (Căn phải)</option>
                                </select>
                            </div>
                        </div>
                        
                        <input type="hidden" id="stylePageSize" value="A4">
                        
                        <!-- Panel tùy chỉnh màu sắc chi tiết nâng cao -->
                        <div style="margin-top: 16px; border-top: 1px dashed var(--border); padding-top: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="toggleAdvancedColors()">
                                <span style="font-size: 12px; font-weight: 600; color: var(--cyan); display: flex; align-items: center; gap: 6px;">⚙️ Tùy chỉnh Màu sắc Chi tiết</span>
                                <span id="advColorIcon" style="font-size: 10px; color: var(--text-secondary);">▼</span>
                            </div>
                            
                            <div id="advColorPanel" style="display: none; margin-top: 12px; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                    <input type="checkbox" id="customColorsEnabled" onchange="applyStyles()" style="cursor: pointer;">
                                    <label for="customColorsEnabled" style="font-size: 11px; color: var(--text-primary); cursor: pointer; font-weight: 500;">Kích hoạt màu chi tiết</label>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Tiêu đề H1</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorH1" value="#0f3460" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Tiêu đề H2</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorH2" value="#16213e" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Tiêu đề H3</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorH3" value="#533483" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Tiêu đề H4</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorH4" value="#0f3460" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Chữ in đậm (**)</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorBold" value="#16213e" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Tiêu đề Bảng</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorTableHeaderBg" value="#0f3460" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Đường kẻ ngang</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorHr" value="#e94560" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Mục lục (TOC)</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorToc" value="#0f3460" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Viền Trích dẫn</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorQuoteBorder" value="#533483" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 3px;">Nền Trích dẫn</label>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <input type="color" id="colorQuoteBg" value="#f8f6ff" oninput="onCustomColorInput()" style="border:none; width:32px; height:26px; cursor:pointer; background:transparent; padding:0; flex-shrink:0;">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats -->
                    <div class="stats-bar" id="statsBar" style="display:none">
                        <div class="stat-item">
                            <div class="stat-value" id="statChars">0</div>
                            <div class="stat-label">Ký tự</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="statWords">0</div>
                            <div class="stat-label">Từ</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="statLines">0</div>
                            <div class="stat-label">Dòng</div>
                        </div>
                    </div>

                    <!-- Conversion History -->
                    <div class="conv-history" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h4 style="font-size: 13px; font-weight: 600; color: var(--cyan); display: flex; align-items: center; gap: 8px;">📜 Lịch sử chuyển đổi</h4>
                            <button onclick="clearHistory()" style="background: transparent; border: none; color: var(--pink); font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: underline;">Xóa lịch sử</button>
                        </div>
                        <div id="historyList" style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto; padding-right: 4px;">
                            <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px 0;">Chưa có lịch sử chuyển đổi</div>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div class="btn-group">
                        <button class="btn btn-pdf" id="btnPdf" onclick="convert('pdf')" disabled>
                            <span class="spinner"></span>
                            <span class="btn-text">📕 Xuất PDF</span>
                        </button>
                        <button class="btn btn-docx" id="btnDocx" onclick="convert('docx')" disabled>
                            <span class="spinner"></span>
                            <span class="btn-text">📘 Xuất Word</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right: Preview -->
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 24px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="card-header-icon cyan">👁️</div>
                        <h3>Xem trước</h3>
                    </div>
                    <button class="btn-fullscreen" id="btnFullscreen" onclick="openFullscreen()">
                        🖥️ Toàn màn hình
                    </button>
                </div>
                <div class="card-body">
                    <div class="preview-area" id="previewArea">
                        <div class="preview-empty">
                            <span class="preview-empty-icon">🔍</span>
                            <p>Upload file hoặc nhập Markdown để xem trước</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>MD Converter — Built for <a href="#">Web3GiangVien</a> Project • Python Flask + fpdf2 + python-docx</p>
        </div>
    </div>

    <!-- Fullscreen Preview Modal -->
    <div class="modal-overlay" id="fullscreenModal">
        <div class="modal-header">
            <div class="modal-title">🖥️ Xem thử bản in (A4 PDF)</div>
            <div class="modal-controls">
                <button class="modal-btn" onclick="zoomModal(-0.1)" title="Thu nhỏ">➖</button>
                <span class="modal-zoom-label" id="modalZoomLabel">100%</span>
                <button class="modal-btn" onclick="zoomModal(0.1)" title="Phóng to">➕</button>
                <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.15); margin: 0 10px;"></div>
                <button class="modal-btn modal-btn-primary" onclick="convert('pdf')" title="Xuất PDF">📕 Xuất PDF</button>
                <button class="modal-btn modal-btn-secondary" onclick="convert('docx')" title="Xuất Word">📘 Xuất Word</button>
                <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.15); margin: 0 10px;"></div>
                <button class="modal-btn modal-btn-close" onclick="closeFullscreen()" title="Đóng">✕ Đóng</button>
            </div>
        </div>
        <div class="modal-body" onclick="closeFullscreenOnBackdrop(event)">
            <div class="a4-page-container" id="a4PageContainer">
                <!-- Paginated A4 pages will go here -->
            </div>
        </div>
    </div>
    <!-- Toast -->
    <div class="toast" id="toast"></div>

    <script>
        let currentMdContent = '';
        let currentFileName = 'document';
        let selectedFiles = [];
        let nextFileId = 1;
        let activeFileId = null;
        let modalZoom = 1.0;
        
        // Metadata fields
        let docProjectName = '';
        let docVersion = '';
        let docLogoBase64 = '';
        let docLogoLeftBase64 = '';
        let conversionHistory = [];

        function getStyleConfig() {
            return {
                theme_color: document.getElementById('styleThemeColor').value,
                font_family: document.getElementById('styleFontFamily').value,
                margin: document.getElementById('styleMargin').value,
                orientation: document.getElementById('styleOrientation').value,
                footer_format: document.getElementById('styleFooterFormat').value,
                page_size: document.getElementById('stylePageSize').value,
                
                custom_colors_enabled: document.getElementById('customColorsEnabled').checked,
                h1_color: document.getElementById('colorH1').value,
                h2_color: document.getElementById('colorH2').value,
                h3_color: document.getElementById('colorH3').value,
                h4_color: document.getElementById('colorH4').value,
                bold_color: document.getElementById('colorBold').value,
                table_header_bg: document.getElementById('colorTableHeaderBg').value,
                hr_color: document.getElementById('colorHr').value,
                toc_color: document.getElementById('colorToc').value,
                quote_border: document.getElementById('colorQuoteBorder').value,
                quote_bg: document.getElementById('colorQuoteBg').value
            };
        }

        function setQuickColor(hex) {
            document.getElementById('styleThemeColor').value = hex;
            
            const r = parseInt(hex.substr(1,2), 16) || 15;
            const g = parseInt(hex.substr(3,2), 16) || 52;
            const b = parseInt(hex.substr(5,2), 16) || 96;
            
            let h1 = hex;
            let h2 = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
            let h3 = `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.min(255, b + 40)})`;
            let h4 = hex;
            let bold = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
            let tableHeader = hex;
            let hr = `rgb(${Math.max(0, r - 10)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`;
            let toc = hex;
            let qBorder = h3;
            let qBg = '#f8f6ff';
            
            if (hex.toLowerCase() === '#a91d22') {
                h1 = '#a91d22';
                h2 = '#a91d22';
                h3 = '#f5a623';
                h4 = '#a91d22';
                bold = '#a91d22';
                tableHeader = '#a91d22';
                hr = '#f5a623';
                toc = '#a91d22';
                qBorder = '#f5a623';
                qBg = '#fefbec';
            }
            
            function rgbToHex(rgbStr) {
                if (rgbStr.startsWith('#')) return rgbStr;
                const match = rgbStr.match(/\d+/g);
                if (!match) return '#000000';
                return "#" + match.map(x => {
                    const hex = parseInt(x).toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                }).join("");
            }
            
            document.getElementById('colorH1').value = rgbToHex(h1);
            document.getElementById('colorH2').value = rgbToHex(h2);
            document.getElementById('colorH3').value = rgbToHex(h3);
            document.getElementById('colorH4').value = rgbToHex(h4);
            document.getElementById('colorBold').value = rgbToHex(bold);
            document.getElementById('colorTableHeaderBg').value = rgbToHex(tableHeader);
            document.getElementById('colorHr').value = rgbToHex(hr);
            document.getElementById('colorToc').value = rgbToHex(toc);
            document.getElementById('colorQuoteBorder').value = rgbToHex(qBorder);
            document.getElementById('colorQuoteBg').value = rgbToHex(qBg);
            
            applyStyles();
        }

        function toggleAdvancedColors() {
            const panel = document.getElementById('advColorPanel');
            const icon = document.getElementById('advColorIcon');
            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                icon.textContent = '▲';
            } else {
                panel.style.display = 'none';
                icon.textContent = '▼';
            }
        }

        function onCustomColorInput() {
            document.getElementById('customColorsEnabled').checked = true;
            applyStyles();
        }

        function applyStyles() {
            const config = getStyleConfig();
            const previewArea = document.getElementById('previewArea');
            const a4Pages = document.querySelectorAll('.a4-page');
            
            let fontCSS = 'Arial, sans-serif';
            if (config.font_family === 'Segoe UI') fontCSS = '"Segoe UI", -apple-system, sans-serif';
            else if (config.font_family === 'Times New Roman') fontCSS = '"Times New Roman", Times, serif';
            else if (config.font_family === 'Georgia') fontCSS = 'Georgia, serif';
            else if (config.font_family === 'Calibri') fontCSS = 'Calibri, sans-serif';
            else if (config.font_family === 'Courier New') fontCSS = '"Courier New", Courier, monospace';
            
            previewArea.style.fontFamily = fontCSS;
            a4Pages.forEach(p => p.style.fontFamily = fontCSS);
            
            let styleEl = document.getElementById('dynamic-document-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'dynamic-document-styles';
                document.head.appendChild(styleEl);
            }
            
            let h1Color, h2Color, h3Color, h4Color, boldColor, tableHeaderBg, hrColor, qBorderColor, qBgColor;
            
            if (config.custom_colors_enabled) {
                h1Color = config.h1_color;
                h2Color = config.h2_color;
                h3Color = config.h3_color;
                h4Color = config.h4_color;
                boldColor = config.bold_color;
                tableHeaderBg = config.table_header_bg;
                hrColor = config.hr_color;
                qBorderColor = config.quote_border;
                qBgColor = config.quote_bg;
            } else {
                const r = parseInt(config.theme_color.substr(1,2), 16) || 15;
                const g = parseInt(config.theme_color.substr(3,2), 16) || 52;
                const b = parseInt(config.theme_color.substr(5,2), 16) || 96;

                h1Color = config.theme_color;
                h2Color = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
                h3Color = `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.min(255, b + 40)})`;
                h4Color = config.theme_color;
                boldColor = h2Color;
                tableHeaderBg = h1Color;
                hrColor = `rgb(${Math.max(0, r - 10)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`;
                qBorderColor = h3Color;
                qBgColor = '#f8f6ff';
                
                if (config.theme_color.toLowerCase() === '#a91d22') {
                    h1Color = '#a91d22';
                    h2Color = '#a91d22';
                    h3Color = '#f5a623';
                    h4Color = '#a91d22';
                    boldColor = '#a91d22';
                    tableHeaderBg = '#a91d22';
                    hrColor = '#f5a623';
                    qBorderColor = '#f5a623';
                    qBgColor = '#fefbec';
                }
            }
            
            let paddingCSS = '20mm';
            if (config.margin === 'narrow') paddingCSS = '15mm';
            else if (config.margin === 'wide') paddingCSS = '25mm';
            
            let widthCSS = '210mm';
            let heightCSS = '297mm';
            if (config.orientation === 'L') {
                widthCSS = '297mm';
                heightCSS = '210mm';
            }
            
            styleEl.innerHTML = `
                .preview-area h1 { color: ${h1Color} !important; border-bottom-color: ${hrColor} !important; }
                .preview-area h2 { color: ${h2Color} !important; border-bottom-color: #d5dbe5 !important; }
                .preview-area h3 { color: ${h3Color} !important; }
                .preview-area h4 { color: ${h4Color} !important; }
                .preview-area strong { color: ${boldColor} !important; }
                .preview-area hr { border-top-color: ${hrColor} !important; }
                .preview-area th { background-color: ${tableHeaderBg} !important; }
                .preview-area blockquote { border-left-color: ${qBorderColor} !important; background: ${qBgColor} !important; }
                
                .a4-page {
                    width: ${widthCSS} !important;
                    padding: ${paddingCSS} !important;
                    font-family: ${fontCSS} !important;
                }
                .a4-page h1 { color: ${h1Color} !important; border-bottom-color: ${hrColor} !important; }
                .a4-page h2 { color: ${h2Color} !important; border-bottom-color: #d5dbe5 !important; }
                .a4-page h3 { color: ${h3Color} !important; }
                .a4-page h4 { color: ${h4Color} !important; }
                .a4-page strong { color: ${boldColor} !important; }
                .a4-page blockquote { 
                    border-left-color: ${qBorderColor} !important; 
                    background: ${qBgColor} !important;
                }
                .a4-page code {
                    color: #e94560 !important;
                    background: #f0f0f5 !important;
                }
                .a4-page pre {
                    background: #1a1a2e !important;
                    border-left: 2px solid ${hrColor} !important;
                }
                .a4-page pre code {
                    color: #e0e0e0 !important;
                    background: transparent !important;
                }
                .a4-page th { 
                    background-color: ${tableHeaderBg} !important; 
                    border-color: ${tableHeaderBg} !important; 
                }
                .a4-page td { border-color: #d5dbe5 !important; }
                .a4-page tr:nth-child(even) td { background: #f4f6fa !important; }
                .a4-page hr { border-top: 1px solid ${hrColor} !important; }
            `;
            
            const modal = document.getElementById('fullscreenModal');
            if (modal.classList.contains('show')) {
                updatePreview();
            }
        }

        // Load history and settings on page load
        window.addEventListener('DOMContentLoaded', () => {
            loadHistory();
            renderHistory();
            applyStyles();
        });

        // Tab switching
        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            if (tab === 'file') {
                document.querySelectorAll('.tab')[0].classList.add('active');
                document.getElementById('tab-file').classList.add('active');
                
                if (selectedFiles.length > 0) {
                    setActiveFile(activeFileId || selectedFiles[0].id);
                    enableButtons();
                } else {
                    currentMdContent = '';
                    disableButtons();
                    updatePreview();
                }
            } else {
                document.querySelectorAll('.tab')[1].classList.add('active');
                document.getElementById('tab-text').classList.add('active');
                
                currentMdContent = document.getElementById('mdTextarea').value;
                currentFileName = 'document';
                updateStats();
                if (currentMdContent.trim()) {
                    enableButtons();
                    updatePreview();
                } else {
                    disableButtons();
                    updatePreview();
                }
            }
        }

        // Drag & Drop
        const dropZone = document.getElementById('dropZone');

        ['dragenter', 'dragover'].forEach(event => {
            dropZone.addEventListener(event, e => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(event => {
            dropZone.addEventListener(event, e => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                processFiles(Array.from(files));
            }
        });

        function handleFileSelect(event) {
            const files = event.target.files;
            if (files && files.length > 0) {
                processFiles(Array.from(files));
            }
        }

        function processFiles(files) {
            let loadedCount = 0;
            const validFiles = files.filter(file => {
                if (!file.name.match(/\.(md|markdown|txt)$/i)) {
                    showToast(`File "${file.name}" không được hỗ trợ (chỉ nhận .md, .markdown, .txt)`, 'error');
                    return false;
                }
                return true;
            });

            if (validFiles.length === 0) return;

            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    const fileId = nextFileId++;
                    
                    selectedFiles.push({
                        id: fileId,
                        file: file,
                        name: file.name,
                        size: file.size,
                        content: content
                    });

                    loadedCount++;
                    if (loadedCount === validFiles.length) {
                        renderFileList();
                        if (activeFileId === null) {
                            setActiveFile(fileId);
                        }
                        enableButtons();
                        showToast(`Đã tải ${validFiles.length} file thành công!`, 'success');
                    }
                };
                reader.readAsText(file, 'utf-8');
            });
        }

        function renderFileList() {
            const container = document.getElementById('fileList');
            const btnPdf = document.getElementById('btnPdf');
            const btnDocx = document.getElementById('btnDocx');
            const btnPdfText = btnPdf.querySelector('.btn-text');
            const btnDocxText = btnDocx.querySelector('.btn-text');

            if (selectedFiles.length === 0) {
                container.style.display = 'none';
                disableButtons();
                btnPdfText.textContent = '📕 Xuất PDF';
                btnDocxText.textContent = '📘 Xuất Word';
                document.getElementById('dropZone').classList.remove('has-file');
                activeFileId = null;
                currentMdContent = '';
                updatePreview();
                document.getElementById('statsBar').style.display = 'none';
                return;
            }

            document.getElementById('dropZone').classList.add('has-file');
            container.style.display = 'flex';

            container.innerHTML = selectedFiles.map(f => `
                <div class="file-item ${f.id === activeFileId ? 'active' : ''}" onclick="setActiveFile(${f.id})">
                    <span style="font-size: 16px;">📎</span>
                    <span class="file-item-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
                    <span class="file-item-size">${formatSize(f.size)}</span>
                    <span class="file-item-remove" onclick="removeFile(event, ${f.id})">✕</span>
                </div>
            `).join('');

            if (selectedFiles.length > 1) {
                btnPdfText.textContent = `📕 Xuất PDF (${selectedFiles.length} files)`;
                btnDocxText.textContent = `📘 Xuất Word (${selectedFiles.length} files)`;
            } else {
                btnPdfText.textContent = '📕 Xuất PDF';
                btnDocxText.textContent = '📘 Xuất Word';
            }
        }

        function setActiveFile(id) {
            activeFileId = id;
            const fileObj = selectedFiles.find(f => f.id === id);
            if (fileObj) {
                currentMdContent = fileObj.content;
                currentFileName = fileObj.name.replace(/\.[^.]+$/, '');
                renderFileList();
                updateStats();
                updatePreview();
            }
        }

        function removeFile(event, id) {
            event.stopPropagation();
            selectedFiles = selectedFiles.filter(f => f.id !== id);
            
            if (activeFileId === id) {
                if (selectedFiles.length > 0) {
                    setActiveFile(selectedFiles[0].id);
                } else {
                    activeFileId = null;
                }
            }
            renderFileList();
            showToast('Đã gỡ bỏ file khỏi danh sách', 'info');
        }

        // Textarea input
        document.getElementById('mdTextarea').addEventListener('input', function() {
            currentMdContent = this.value;
            currentFileName = 'document';
            updateStats();
            if (currentMdContent.trim()) {
                enableButtons();
            } else {
                disableButtons();
            }
        });

        // Sync Metadata from input fields
        function syncMetadata() {
            docProjectName = document.getElementById('metaProjectName').value;
            docVersion = document.getElementById('metaVersion').value;
        }

        // Base64 Logo parsing
        function handleLogoSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.match(/image\/(png|jpeg|jpg)/i)) {
                showToast('Chỉ nhận ảnh định dạng PNG hoặc JPG/JPEG', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                docLogoBase64 = e.target.result;
                document.getElementById('logoFileName').textContent = file.name;
                showToast('Đã lưu Logo bên phải!', 'success');
                updatePreview();
            };
            reader.readAsDataURL(file);
        }

        function handleLogoLeftSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.match(/image\/(png|jpeg|jpg)/i)) {
                showToast('Chỉ nhận ảnh định dạng PNG hoặc JPG/JPEG', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                docLogoLeftBase64 = e.target.result;
                document.getElementById('logoLeftFileName').textContent = file.name;
                showToast('Đã lưu Logo bên trái!', 'success');
                updatePreview();
            };
            reader.readAsDataURL(file);
        }

        function updatePreview() {
            if (!currentMdContent.trim()) {
                document.getElementById('previewArea').innerHTML = `
                    <div class="preview-empty">
                        <span class="preview-empty-icon">🔍</span>
                        <p>Upload file hoặc nhập Markdown để xem trước</p>
                    </div>`;
                return;
            }

            fetch('/api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: currentMdContent })
            })
            .then(res => res.json())
            .then(data => {
                document.getElementById('previewArea').innerHTML = data.html;
                // If fullscreen modal is open, trigger pagination update
                const modal = document.getElementById('fullscreenModal');
                if (modal.classList.contains('show')) {
                    paginatePreview(data.html);
                }
            })
            .catch(() => {
                document.getElementById('previewArea').innerHTML = '<p style="color:var(--error)">Lỗi preview</p>';
            });
        }

        function updateStats() {
            const text = currentMdContent;
            document.getElementById('statChars').textContent = text.length.toLocaleString();
            document.getElementById('statWords').textContent = text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : '0';
            document.getElementById('statLines').textContent = text.split('\n').length.toLocaleString();
            document.getElementById('statsBar').style.display = 'flex';
        }

        function enableButtons() {
            document.getElementById('btnPdf').disabled = false;
            document.getElementById('btnDocx').disabled = false;
        }

        function disableButtons() {
            document.getElementById('btnPdf').disabled = true;
            document.getElementById('btnDocx').disabled = true;
        }

        // Convert single file
        async function convert(format) {
            const isFileTab = document.getElementById('tab-file').classList.contains('active');
            
            if (isFileTab && selectedFiles.length > 1) {
                await convertBatch(format);
                return;
            }

            if (!currentMdContent.trim()) {
                showToast('Chưa có nội dung Markdown!', 'error');
                return;
            }

            const btn = format === 'pdf' ? document.getElementById('btnPdf') : document.getElementById('btnDocx');
            btn.classList.add('loading');
            btn.disabled = true;

            try {
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: currentMdContent,
                        format: format,
                        filename: currentFileName,
                        metadata: {
                            project_name: docProjectName,
                            doc_version: docVersion,
                            logo_base64: docLogoBase64,
                            logo_left_base64: docLogoLeftBase64,
                            style: getStyleConfig()
                        }
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Conversion failed');
                }

                const blob = await response.blob();
                const ext = format === 'pdf' ? 'pdf' : 'docx';
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentFileName}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);

                saveToHistory(currentFileName, format);
                showToast(`Đã xuất ${ext.toUpperCase()} thành công! 🎉`, 'success');
            } catch (err) {
                showToast(`Lỗi: ${err.message}`, 'error');
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }

        // Batch convert multiple files to ZIP
        async function convertBatch(format) {
            const btn = format === 'pdf' ? document.getElementById('btnPdf') : document.getElementById('btnDocx');
            btn.classList.add('loading');
            btn.disabled = true;

            try {
                const formData = new FormData();
                formData.append('format', format);
                formData.append('project_name', docProjectName);
                formData.append('doc_version', docVersion);
                formData.append('logo_base64', docLogoBase64);
                formData.append('logo_left_base64', docLogoLeftBase64);
                formData.append('style', JSON.stringify(getStyleConfig()));

                selectedFiles.forEach(f => {
                    const blob = new Blob([f.content], { type: 'text/markdown' });
                    formData.append('files', blob, f.name);
                });

                const response = await fetch('/api/convert-batch', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Batch conversion failed');
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `converted_files_${format.toUpperCase()}.zip`;
                a.click();
                URL.revokeObjectURL(url);

                saveToHistory(`Batch_${selectedFiles.length}_files`, format);
                showToast(`Đã xuất ZIP chứa ${selectedFiles.length} file thành công! 🎉`, 'success');
            } catch (err) {
                showToast(`Lỗi: ${err.message}`, 'error');
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }

        // Fullscreen Modal and Pagination
        function openFullscreen() {
            if (!currentMdContent.trim()) {
                showToast('Chưa có nội dung để xem trước!', 'error');
                return;
            }
            
            const previewContent = document.getElementById('previewArea').innerHTML;
            
            const modal = document.getElementById('fullscreenModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            modalZoom = 1.0;
            updateZoomStyle();

            // Run pagination after rendering layout
            setTimeout(() => {
                paginatePreview(previewContent);
            }, 100);
        }

        function paginatePreview(html) {
            const config = getStyleConfig();
            const isLandscape = config.orientation === 'L';
            
            // Standard dimensions at 96 DPI: Portrait 794x1122, Landscape 1122x794
            const maxPageHeightPx = isLandscape ? 794 : 1122;
            const pageHeightCSS = isLandscape ? '210mm' : '297mm';
            const pageWidthCSS = isLandscape ? '297mm' : '210mm';
            
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            const container = document.getElementById('a4PageContainer');
            container.innerHTML = '';
            
            // Check if there are headings to determine if we need a TOC page
            const headings = Array.from(temp.querySelectorAll('h1, h2, h3'));
            const hasHeadings = headings.length > 0;
            
            // If TOC is generated, content pages start at index 2
            let pageIndex = hasHeadings ? 2 : 1;
            const headingsLog = [];
            
            // Helper function to create page with pre-inserted header/footer to include in offsetHeight
            function createPage() {
                const page = document.createElement('div');
                page.className = 'a4-page';
                page.style.height = 'auto'; // Use auto height during measurement
                page.style.position = 'relative';
                page.style.display = 'flex';
                page.style.flexDirection = 'column';
                
                // 1) Add header info (excluding page 1 if page 1 is TOC/Title page)
                if (pageIndex > 1) {
                    const header = document.createElement('div');
                    header.className = 'preview-header';
                    header.style.display = 'flex';
                    header.style.justifyContent = 'space-between';
                    header.style.alignItems = 'center';
                    header.style.fontSize = '8pt';
                    header.style.color = '#777';
                    header.style.borderBottom = '1px solid #ddd';
                    header.style.paddingBottom = '4px';
                    header.style.marginBottom = '12px';
                    
                    // Container for left logo and project text
                    const leftContainer = document.createElement('div');
                    leftContainer.style.display = 'flex';
                    leftContainer.style.alignItems = 'center';
                    leftContainer.style.gap = '8px';
                    
                    if (docLogoLeftBase64) {
                        const logoLeftImg = document.createElement('img');
                        logoLeftImg.src = docLogoLeftBase64;
                        logoLeftImg.style.height = '14px';
                        leftContainer.appendChild(logoLeftImg);
                    }
                    
                    const leftText = document.createElement('span');
                    leftText.textContent = docProjectName + (docVersion ? ` - Version: ${docVersion}` : '');
                    leftContainer.appendChild(leftText);
                    
                    header.appendChild(leftContainer);
                    
                    if (docLogoBase64) {
                        const logoImg = document.createElement('img');
                        logoImg.src = docLogoBase64;
                        logoImg.style.height = '14px';
                        header.appendChild(logoImg);
                    }
                    
                    page.appendChild(header);
                }

                // 2) Add footer info placeholder
                const footer = document.createElement('div');
                footer.className = 'preview-footer';
                footer.style.fontSize = '8pt';
                footer.style.color = '#888';
                footer.style.marginTop = 'auto';
                footer.style.borderTop = '1px solid #ddd';
                footer.style.paddingTop = '8px';
                footer.style.paddingBottom = '2px';
                
                if (config.footer_format === 'right_align') {
                    footer.style.textAlign = 'right';
                } else {
                    footer.style.textAlign = 'center';
                }
                page.appendChild(footer);
                
                pageIndex++;
                return page;
            }

            // --- Helper functions for splitting overflowing elements ---
            function splitList(listContainer, currentPage, maxPageHeightPx, createPage, container) {
                const listNode = listContainer.tagName === 'UL' || listContainer.tagName === 'OL' ? listContainer : listContainer.querySelector('ul, ol');
                if (!listNode) {
                    const footer = currentPage.querySelector('.preview-footer');
                    currentPage.insertBefore(listContainer.cloneNode(true), footer);
                    return currentPage;
                }

                const items = Array.from(listNode.querySelectorAll(':scope > li'));
                if (items.length === 0) return currentPage;

                const footer = currentPage.querySelector('.preview-footer');
                const currentContainer = listContainer.cloneNode(false);
                let currentList;
                if (listContainer === listNode) {
                    currentList = currentContainer;
                } else {
                    currentList = listNode.cloneNode(false);
                    currentContainer.appendChild(currentList);
                }
                
                currentPage.insertBefore(currentContainer, footer);

                let activeContainer = currentContainer;
                let activeList = currentList;
                let activePage = currentPage;

                items.forEach(item => {
                    const subListNode = item.querySelector('ul, ol');
                    
                    if (!subListNode) {
                        const clonedItem = item.cloneNode(true);
                        activeList.appendChild(clonedItem);

                        if (activePage.offsetHeight > maxPageHeightPx) {
                            if (activeList.children.length > 1) {
                                activeList.removeChild(clonedItem);

                                activePage = createPage();
                                container.appendChild(activePage);
                                
                                activeContainer = listContainer.cloneNode(false);
                                if (listContainer === listNode) {
                                    activeList = activeContainer;
                                } else {
                                    activeList = listNode.cloneNode(false);
                                    activeContainer.appendChild(activeList);
                                }
                                
                                const newFooter = activePage.querySelector('.preview-footer');
                                activePage.insertBefore(activeContainer, newFooter);

                                activeList.appendChild(clonedItem);
                            }
                        }
                    } else {
                        // Handle nested list structure
                        const clonedParentItem = item.cloneNode(true);
                        const nestedSubList = clonedParentItem.querySelector('ul, ol');
                        if (nestedSubList) {
                            clonedParentItem.removeChild(nestedSubList);
                        }

                        const activeSubList = subListNode.cloneNode(false);
                        clonedParentItem.appendChild(activeSubList);
                        
                        activeList.appendChild(clonedParentItem);

                        if (activePage.offsetHeight > maxPageHeightPx && activeList.children.length > 1) {
                            activeList.removeChild(clonedParentItem);

                            activePage = createPage();
                            container.appendChild(activePage);
                            
                            activeContainer = listContainer.cloneNode(false);
                            if (listContainer === listNode) {
                                activeList = activeContainer;
                            } else {
                                activeList = listNode.cloneNode(false);
                                activeContainer.appendChild(activeList);
                            }
                            
                            const newFooter = activePage.querySelector('.preview-footer');
                            activePage.insertBefore(activeContainer, newFooter);

                            activeList.appendChild(clonedParentItem);
                        }

                        const subItems = Array.from(subListNode.querySelectorAll(':scope > li'));
                        let currentActiveSubList = activeSubList;
                        let currentClonedParentItem = clonedParentItem;

                        subItems.forEach(subItem => {
                            const clonedSubItem = subItem.cloneNode(true);
                            currentActiveSubList.appendChild(clonedSubItem);

                            if (activePage.offsetHeight > maxPageHeightPx) {
                                if (currentActiveSubList.children.length > 1) {
                                    currentActiveSubList.removeChild(clonedSubItem);

                                    activePage = createPage();
                                    container.appendChild(activePage);
                                    
                                    activeContainer = listContainer.cloneNode(false);
                                    if (listContainer === listNode) {
                                        activeList = activeContainer;
                                    } else {
                                        activeList = listNode.cloneNode(false);
                                        activeContainer.appendChild(activeList);
                                    }

                                    currentClonedParentItem = item.cloneNode(true);
                                    const tempNested = currentClonedParentItem.querySelector('ul, ol');
                                    if (tempNested) {
                                        currentClonedParentItem.removeChild(tempNested);
                                    }

                                    currentActiveSubList = subListNode.cloneNode(false);
                                    currentClonedParentItem.appendChild(currentActiveSubList);
                                    activeList.appendChild(currentClonedParentItem);

                                    const newFooter = activePage.querySelector('.preview-footer');
                                    activePage.insertBefore(activeContainer, newFooter);

                                    currentActiveSubList.appendChild(clonedSubItem);
                                }
                            }
                        });
                    }
                });

                return activePage;
            }

            function splitTable(tableContainer, currentPage, maxPageHeightPx, createPage, container) {
                const tableNode = tableContainer.tagName === 'TABLE' ? tableContainer : tableContainer.querySelector('table');
                if (!tableNode) {
                    const footer = currentPage.querySelector('.preview-footer');
                    currentPage.insertBefore(tableContainer.cloneNode(true), footer);
                    return currentPage;
                }

                const rows = Array.from(tableNode.querySelectorAll('tbody > tr, tr'));
                if (rows.length === 0) return currentPage;

                let thead = tableNode.querySelector('thead');
                let headerRows = [];
                if (thead) {
                    headerRows = Array.from(thead.querySelectorAll('tr'));
                } else {
                    const firstRow = rows[0];
                    if (firstRow && firstRow.querySelector('th')) {
                        headerRows = [firstRow];
                    }
                }

                const dataRows = rows.filter(row => !headerRows.includes(row));
                if (dataRows.length === 0) {
                    const footer = currentPage.querySelector('.preview-footer');
                    currentPage.insertBefore(tableContainer.cloneNode(true), footer);
                    return currentPage;
                }

                const footer = currentPage.querySelector('.preview-footer');
                const currentContainer = tableContainer.cloneNode(false);
                let currentTable;
                if (tableContainer === tableNode) {
                    currentTable = currentContainer;
                } else {
                    currentTable = tableNode.cloneNode(false);
                    currentContainer.appendChild(currentTable);
                }
                
                let currentTableHead = thead ? thead.cloneNode(false) : null;
                let currentTableBody = tableNode.querySelector('tbody') ? tableNode.querySelector('tbody').cloneNode(false) : null;
                
                if (currentTableHead) {
                    headerRows.forEach(hRow => currentTableHead.appendChild(hRow.cloneNode(true)));
                    currentTable.appendChild(currentTableHead);
                } else if (headerRows.length > 0) {
                    headerRows.forEach(hRow => currentTable.appendChild(hRow.cloneNode(true)));
                }

                if (currentTableBody) {
                    currentTable.appendChild(currentTableBody);
                }

                currentPage.insertBefore(currentContainer, footer);

                let activeContainer = currentContainer;
                let activeTable = currentTable;
                let activeTableBody = currentTableBody || currentTable;
                let activePage = currentPage;

                dataRows.forEach(row => {
                    const clonedRow = row.cloneNode(true);
                    activeTableBody.appendChild(clonedRow);

                    if (activePage.offsetHeight > maxPageHeightPx) {
                        const tbodyRows = activeTableBody.querySelectorAll('tr');
                        const hasOtherRows = currentTableHead ? tbodyRows.length > 1 : tbodyRows.length > headerRows.length + 1;
                        
                        if (hasOtherRows) {
                            activeTableBody.removeChild(clonedRow);

                            activePage = createPage();
                            container.appendChild(activePage);

                            activeContainer = tableContainer.cloneNode(false);
                            if (tableContainer === tableNode) {
                                activeTable = activeContainer;
                            } else {
                                activeTable = tableNode.cloneNode(false);
                                activeContainer.appendChild(activeTable);
                            }
                            
                            if (currentTableHead) {
                                activeTable.appendChild(currentTableHead.cloneNode(true));
                            } else if (headerRows.length > 0) {
                                headerRows.forEach(hRow => activeTable.appendChild(hRow.cloneNode(true)));
                            }

                            activeTableBody = tableNode.querySelector('tbody') ? tableNode.querySelector('tbody').cloneNode(false) : null;
                            if (activeTableBody) {
                                activeTable.appendChild(activeTableBody);
                            } else {
                                activeTableBody = activeTable;
                            }

                            const newFooter = activePage.querySelector('.preview-footer');
                            activePage.insertBefore(activeContainer, newFooter);

                            activeTableBody.appendChild(clonedRow);
                        }
                    }
                });

                return activePage;
            }

            function splitPre(preContainer, currentPage, maxPageHeightPx, createPage, container) {
                const preNode = preContainer.tagName === 'PRE' ? preContainer : preContainer.querySelector('pre');
                if (!preNode) {
                    const footer = currentPage.querySelector('.preview-footer');
                    currentPage.insertBefore(preContainer.cloneNode(true), footer);
                    return currentPage;
                }

                const codeNode = preNode.querySelector('code');
                if (!codeNode) {
                    const footer = currentPage.querySelector('.preview-footer');
                    currentPage.insertBefore(preContainer.cloneNode(true), footer);
                    return currentPage;
                }

                const text = codeNode.textContent;
                const lines = text.split('\n');
                if (lines.length <= 1) {
                    const footer = currentPage.querySelector('.preview-footer');
                    currentPage.insertBefore(preContainer.cloneNode(true), footer);
                    return currentPage;
                }

                const footer = currentPage.querySelector('.preview-footer');
                const currentContainer = preContainer.cloneNode(false);
                let currentPre;
                
                if (preContainer.tagName === 'PRE') {
                    currentPre = currentContainer;
                } else {
                    currentPre = preNode.cloneNode(false);
                    currentContainer.appendChild(currentPre);
                }
                
                const currentCode = codeNode.cloneNode(false);
                currentPre.appendChild(currentCode);
                currentPage.insertBefore(currentContainer, footer);

                let activeContainer = currentContainer;
                let activePre = currentPre;
                let activeCode = currentCode;
                let activePage = currentPage;
                let activeLines = [];

                lines.forEach((line, index) => {
                    activeLines.push(line);
                    activeCode.textContent = activeLines.join('\n');

                    if (activePage.offsetHeight > maxPageHeightPx) {
                        if (activeLines.length > 1) {
                            activeLines.pop();
                            activeCode.textContent = activeLines.join('\n');

                            activePage = createPage();
                            container.appendChild(activePage);

                            activeContainer = preContainer.cloneNode(false);
                            if (preContainer.tagName === 'PRE') {
                                activePre = activeContainer;
                            } else {
                                activePre = preNode.cloneNode(false);
                                activeContainer.appendChild(activePre);
                            }
                            
                            activeCode = codeNode.cloneNode(false);
                            activePre.appendChild(activeCode);
                            
                            const newFooter = activePage.querySelector('.preview-footer');
                            activePage.insertBefore(activeContainer, newFooter);

                            activeLines = [line];
                            activeCode.textContent = line;
                        }
                    }
                });

                return activePage;
            }
            // -------------------------------------------------------------
            
            let currentPage = createPage();
            container.appendChild(currentPage);
            
            const children = Array.from(temp.children);
            
            children.forEach(child => {
                const tagName = child.tagName.toUpperCase();
                
                const isTable = (tagName === 'TABLE' || child.querySelector('table') !== null);
                const isList = (tagName === 'UL' || tagName === 'OL' || child.querySelector('ul, ol') !== null);
                const isPre = (tagName === 'PRE' || child.querySelector('pre') !== null);
                const isSplittable = isTable || isList || isPre;
                
                const footer = currentPage.querySelector('.preview-footer');
                const cloned = child.cloneNode(true);
                
                currentPage.insertBefore(cloned, footer);
                
                const headerCount = currentPage.querySelector('.preview-header') ? 1 : 0;
                const contentCount = currentPage.children.length - headerCount - 1; // subtract footer
                
                if (currentPage.offsetHeight > maxPageHeightPx) {
                    if (contentCount > 1) {
                        currentPage.removeChild(cloned);
                        
                        if (isSplittable) {
                            if (isTable) {
                                currentPage = splitTable(child, currentPage, maxPageHeightPx, createPage, container);
                            } else if (isList) {
                                currentPage = splitList(child, currentPage, maxPageHeightPx, createPage, container);
                            } else if (isPre) {
                                currentPage = splitPre(child, currentPage, maxPageHeightPx, createPage, container);
                            }
                        } else {
                            currentPage = createPage();
                            container.appendChild(currentPage);
                            
                            const newFooter = currentPage.querySelector('.preview-footer');
                            currentPage.insertBefore(cloned.cloneNode(true), newFooter);
                        }
                    } else {
                        if (isSplittable) {
                            currentPage.removeChild(cloned);
                            if (isTable) {
                                currentPage = splitTable(child, currentPage, maxPageHeightPx, createPage, container);
                            } else if (isList) {
                                currentPage = splitList(child, currentPage, maxPageHeightPx, createPage, container);
                            } else if (isPre) {
                                currentPage = splitPre(child, currentPage, maxPageHeightPx, createPage, container);
                            }
                        }
                    }
                }
                
                if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3') {
                    headingsLog.push({
                        text: child.textContent.trim(),
                        level: parseInt(tagName.substring(1)),
                        pageElement: currentPage
                    });
                }
            });
            
            // If TOC is required, dynamically create the first page
            if (hasHeadings) {
                const tocPage = document.createElement('div');
                tocPage.className = 'a4-page';
                tocPage.style.position = 'relative';
                tocPage.style.display = 'flex';
                tocPage.style.flexDirection = 'column';
                
                let h1Color, h2Color, h3Color, borderColor, tocColor;
                if (config.custom_colors_enabled) {
                    h1Color = config.h1_color;
                    h2Color = config.h2_color;
                    h3Color = config.h3_color;
                    borderColor = config.hr_color;
                    tocColor = config.toc_color;
                } else {
                    const r = parseInt(config.theme_color.substr(1,2), 16) || 15;
                    const g = parseInt(config.theme_color.substr(3,2), 16) || 52;
                    const b = parseInt(config.theme_color.substr(5,2), 16) || 96;

                    h1Color = config.theme_color;
                    h2Color = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
                    h3Color = `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.min(255, b + 40)})`;
                    borderColor = `rgb(${Math.max(0, r - 10)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`;
                    tocColor = h1Color;
                    
                    if (config.theme_color.toLowerCase() === '#a91d22') {
                        h1Color = '#a91d22';
                        h2Color = '#a91d22';
                        h3Color = '#f5a623';
                        borderColor = '#f5a623';
                        tocColor = '#a91d22';
                    }
                }
                
                // TOC Title
                const tocTitle = document.createElement('h1');
                tocTitle.textContent = 'Mục lục';
                tocTitle.style.color = tocColor;
                tocTitle.style.borderBottom = `2px solid ${borderColor}`;
                tocTitle.style.paddingBottom = '6px';
                tocTitle.style.marginBottom = '20px';
                tocPage.appendChild(tocTitle);
                
                // TOC List container
                const tocList = document.createElement('div');
                tocList.className = 'preview-toc-list';
                tocList.style.flex = '1';
                
                headingsLog.forEach(h => {
                    if (h.level <= 3) {
                        const item = document.createElement('div');
                        item.className = `toc-item level-${h.level}`;
                        item.style.display = 'flex';
                        item.style.alignItems = 'baseline';
                        item.style.marginBottom = '12px';
                        item.style.lineHeight = '1.4';
                        item.style.fontSize = h.level === 1 ? '11pt' : '10pt';
                        item.style.fontWeight = h.level === 1 ? 'bold' : 'normal';
                        item.style.paddingLeft = `${(h.level - 1) * 16}px`;
                        
                        let hColor = tocColor;
                        
                        const textSpan = document.createElement('span');
                        textSpan.textContent = h.text;
                        textSpan.style.color = hColor;
                        
                        const dotsSpan = document.createElement('span');
                        dotsSpan.style.flexGrow = '1';
                        dotsSpan.style.borderBottom = `1px dotted ${hColor}`;
                        dotsSpan.style.opacity = '0.5';
                        dotsSpan.style.margin = '0 8px';
                        dotsSpan.style.position = 'relative';
                        dotsSpan.style.top = '-4px';
                        
                        const pageSpan = document.createElement('span');
                        const pIndex = Array.from(container.querySelectorAll('.a4-page')).indexOf(h.pageElement);
                        pageSpan.textContent = pIndex + 2;
                        pageSpan.style.color = hColor;
                        pageSpan.style.fontWeight = h.level === 1 ? 'bold' : 'normal';
                        
                        item.appendChild(textSpan);
                        item.appendChild(dotsSpan);
                        item.appendChild(pageSpan);
                        tocList.appendChild(item);
                    }
                });
                tocPage.appendChild(tocList);
                
                // TOC Footer
                const tocFooter = document.createElement('div');
                tocFooter.className = 'preview-footer';
                tocFooter.style.fontSize = '8pt';
                tocFooter.style.color = '#888';
                tocFooter.style.marginTop = 'auto';
                tocFooter.style.borderTop = '1px solid #ddd';
                tocFooter.style.paddingTop = '8px';
                tocFooter.style.paddingBottom = '2px';
                if (config.footer_format === 'right_align') {
                    tocFooter.style.textAlign = 'right';
                } else {
                    tocFooter.style.textAlign = 'center';
                }
                tocPage.appendChild(tocFooter);
                
                // Insert as page 1
                container.insertBefore(tocPage, container.firstChild);
            }
            
            // Post-process: Update all page counts in footers and apply final fixed dimensions
            const pages = container.querySelectorAll('.a4-page');
            pages.forEach((page, idx) => {
                const footer = page.querySelector('.preview-footer');
                if (footer) {
                    let footerText = `Trang ${idx + 1}/${pages.length}`;
                    if (config.footer_format === 'page_only') {
                        footerText = `${idx + 1}`;
                    } else if (config.footer_format === 'brackets') {
                        footerText = `- ${idx + 1} -`;
                    }
                    footer.textContent = footerText;
                }
                
                // Apply the final fixed dimensions
                page.style.height = pageHeightCSS;
                page.style.width = pageWidthCSS;
            });
        }

        function closeFullscreen() {
            const modal = document.getElementById('fullscreenModal');
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }

        function closeFullscreenOnBackdrop(event) {
            if (event.target.classList.contains('modal-body')) {
                closeFullscreen();
            }
        }

        function zoomModal(delta) {
            modalZoom += delta;
            modalZoom = Math.max(0.5, Math.min(2.0, modalZoom));
            updateZoomStyle();
        }

        function updateZoomStyle() {
            const container = document.getElementById('a4PageContainer');
            container.style.transform = `scale(${modalZoom})`;
            document.getElementById('modalZoomLabel').textContent = `${Math.round(modalZoom * 100)}%`;
        }

        // localStorage History handling
        function saveToHistory(name, format) {
            const item = {
                id: Date.now(),
                name: name,
                format: format,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: currentMdContent,
                project_name: docProjectName,
                doc_version: docVersion,
                logo_base64: docLogoBase64,
                logo_left_base64: docLogoLeftBase64,
                style: getStyleConfig()
            };
            conversionHistory.unshift(item);
            if (conversionHistory.length > 5) {
                conversionHistory.pop(); // keep last 5
            }
            localStorage.setItem('md_conv_history', JSON.stringify(conversionHistory));
            renderHistory();
        }

        function loadHistory() {
            const raw = localStorage.getItem('md_conv_history');
            if (raw) {
                try {
                    conversionHistory = JSON.parse(raw);
                } catch(e) {
                    conversionHistory = [];
                }
            }
        }

        function renderHistory() {
            const container = document.getElementById('historyList');
            if (conversionHistory.length === 0) {
                container.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px 0;">Chưa có lịch sử chuyển đổi</div>`;
                return;
            }

            container.innerHTML = conversionHistory.map(item => `
                <div class="history-item" onclick="restoreFromHistory(${item.id})" style="cursor: pointer;" title="Nhấp để khôi phục tài liệu và cấu hình này">
                    <span style="font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 150px;">${escapeHtml(item.name)}</span>
                    <span style="margin-left:auto; margin-right: 12px; color: var(--cyan); font-weight:600;">${item.format.toUpperCase()}</span>
                    <span style="color:var(--text-muted); font-size:10px;">${item.time}</span>
                </div>
            `).join('');
        }

        function restoreFromHistory(id) {
            const item = conversionHistory.find(h => h.id === id);
            if (!item) return;

            // Khôi phục các metadata cấu hình
            docProjectName = item.project_name || '';
            document.getElementById('metaProjectName').value = docProjectName;

            docVersion = item.doc_version || '';
            document.getElementById('metaVersion').value = docVersion;

            docLogoBase64 = item.logo_base64 || '';
            if (docLogoBase64) {
                document.getElementById('logoFileName').textContent = 'Đã nạp logo phải';
            } else {
                document.getElementById('logoFileName').textContent = 'Chưa chọn';
            }

            docLogoLeftBase64 = item.logo_left_base64 || '';
            if (docLogoLeftBase64) {
                document.getElementById('logoLeftFileName').textContent = 'Đã nạp logo trái';
            } else {
                document.getElementById('logoLeftFileName').textContent = 'Chưa chọn';
            }

            if (item.style) {
                document.getElementById('styleThemeColor').value = item.style.theme_color || '#0f3460';
                document.getElementById('styleFontFamily').value = item.style.font_family || 'Arial';
                document.getElementById('styleMargin').value = item.style.margin || 'standard';
                document.getElementById('styleOrientation').value = item.style.orientation || 'P';
                document.getElementById('styleFooterFormat').value = item.style.footer_format || 'page_of_total';
                if (item.style.page_size) {
                    document.getElementById('stylePageSize').value = item.style.page_size;
                }
            }
            applyStyles();

            // Chuyển sang tab Nhập trực tiếp để hiển thị nội dung text
            switchTab('text');
            
            // Khôi phục nội dung văn bản vào textarea
            document.getElementById('mdTextarea').value = item.content || '';
            currentMdContent = item.content || '';
            currentFileName = item.name;

            updateStats();
            updatePreview();
            enableButtons();

            showToast(`Đã khôi phục tài liệu "${item.name}" từ lịch sử!`, 'success');
        }

        function clearHistory() {
            conversionHistory = [];
            localStorage.removeItem('md_conv_history');
            renderHistory();
            showToast('Đã xóa lịch sử chuyển đổi', 'info');
        }

        // Toast notification
        function showToast(msg, type = 'info') {
            const toast = document.getElementById('toast');
            const icons = { success: '✅', error: '❌', info: 'ℹ️' };
            toast.className = `toast ${type}`;
            toast.innerHTML = `${icons[type] || ''} ${msg}`;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 4000);
        }

        // Utils
        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        }

        function escapeHtml(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // Debounce preview for textarea
        let previewTimeout;
        document.getElementById('mdTextarea').addEventListener('input', function() {
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(updatePreview, 500);
        });
    </script>
</body>
</html>
"""


@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/preview', methods=['POST'])
def preview():
    """Render MD to HTML for preview"""
    data = request.get_json()
    content = data.get('content', '')
    html = md_to_html(content)
    return jsonify({'html': html})


def _process_metadata_logo(metadata: dict):
    """Decodes base64 logo in metadata if present, returning (metadata, temp_logo_file, temp_logo_left_file)"""
    logo_base64 = metadata.get('logo_base64', '')
    logo_left_base64 = metadata.get('logo_left_base64', '')
    temp_logo_file = None
    temp_logo_left_file = None
    
    if logo_base64:
        try:
            if ',' in logo_base64:
                header, data = logo_base64.split(',', 1)
            else:
                data = logo_base64
            logo_data = base64.b64decode(data)
            
            ext = '.png'
            if 'image/jpeg' in logo_base64 or 'image/jpg' in logo_base64:
                ext = '.jpg'
                
            import tempfile
            temp_logo_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
            temp_logo_file.write(logo_data)
            temp_logo_file.close()
            metadata['logo_path'] = temp_logo_file.name
        except Exception as e:
            print(f"Error decoding base64 logo: {e}")
            
    if logo_left_base64:
        try:
            if ',' in logo_left_base64:
                header, data = logo_left_base64.split(',', 1)
            else:
                data = logo_left_base64
            logo_data = base64.b64decode(data)
            
            ext = '.png'
            if 'image/jpeg' in logo_left_base64 or 'image/jpg' in logo_left_base64:
                ext = '.jpg'
                
            import tempfile
            temp_logo_left_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
            temp_logo_left_file.write(logo_data)
            temp_logo_left_file.close()
            metadata['logo_left_path'] = temp_logo_left_file.name
        except Exception as e:
            print(f"Error decoding base64 logo left: {e}")
            
    return metadata, temp_logo_file, temp_logo_left_file


def _cleanup_temp_logo(temp_logo_file, temp_logo_left_file=None):
    if temp_logo_file:
        try:
            os.unlink(temp_logo_file.name)
        except Exception:
            pass
    if temp_logo_left_file:
        try:
            os.unlink(temp_logo_left_file.name)
        except Exception:
            pass


@app.route('/api/convert', methods=['POST'])
def convert():
    """Convert MD to PDF or DOCX"""
    data = request.get_json()
    content = data.get('content', '')
    fmt = data.get('format', 'pdf')
    filename = data.get('filename', 'document')
    metadata = data.get('metadata', {})
    
    if not content.strip():
        return jsonify({'error': 'Nội dung Markdown trống'}), 400
    
    metadata, temp_logo, temp_logo_left = _process_metadata_logo(metadata)
    try:
        if fmt == 'pdf':
            output = convert_md_to_pdf(content, title=filename, metadata=metadata)
            mimetype = 'application/pdf'
            ext = 'pdf'
        elif fmt == 'docx':
            output = convert_md_to_docx(content, title=filename, metadata=metadata)
            mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ext = 'docx'
        else:
            return jsonify({'error': f'Format "{fmt}" không hỗ trợ'}), 400
        
        buffer = BytesIO(output)
        return send_file(
            buffer,
            mimetype=mimetype,
            as_attachment=True,
            download_name=f'{filename}.{ext}'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _cleanup_temp_logo(temp_logo, temp_logo_left)


@app.route('/api/convert-batch', methods=['POST'])
def convert_batch():
    """Convert multiple MD files to PDF or DOCX and return a ZIP archive"""
    fmt = request.form.get('format', 'pdf')
    uploaded_files = request.files.getlist('files')
    
    project_name = request.form.get('project_name', '')
    doc_version = request.form.get('doc_version', '')
    logo_base64 = request.form.get('logo_base64', '')
    logo_left_base64 = request.form.get('logo_left_base64', '')
    style_json = request.form.get('style', '')
    
    import json
    style_config = {}
    if style_json:
        try:
            style_config = json.loads(style_json)
        except Exception:
            pass
            
    metadata = {
        'project_name': project_name,
        'doc_version': doc_version,
        'logo_base64': logo_base64,
        'logo_left_base64': logo_left_base64,
        'style': style_config
    }
    
    if not uploaded_files or len(uploaded_files) == 0:
        return jsonify({'error': 'Không nhận được file nào để chuyển đổi'}), 400
        
    metadata, temp_logo, temp_logo_left = _process_metadata_logo(metadata)
    try:
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file in uploaded_files:
                filename = file.filename
                if not filename:
                    continue
                try:
                    content = file.read().decode('utf-8')
                except UnicodeDecodeError:
                    file.seek(0)
                    content = file.read().decode('utf-8-sig', errors='ignore')
                
                # Strip extension from filename if exists
                base_name = os.path.splitext(filename)[0]
                
                if fmt == 'pdf':
                    output = convert_md_to_pdf(content, title=base_name, metadata=metadata)
                    ext = 'pdf'
                elif fmt == 'docx':
                    output = convert_md_to_docx(content, title=base_name, metadata=metadata)
                    ext = 'docx'
                else:
                    return jsonify({'error': f'Format "{fmt}" không hỗ trợ'}), 400
                    
                zip_file.writestr(f'{base_name}.{ext}', output)
                
        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'converted_files_{fmt.upper()}.zip'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _cleanup_temp_logo(temp_logo, temp_logo_left)


if __name__ == '__main__':
    print("\n" + "="*60)
    print("  MD Converter - Markdown to PDF / Word")
    print("  URL: http://localhost:5500")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5500, debug=True)
