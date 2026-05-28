"""
MD Converter — Web UI
Flask server with beautiful drag-and-drop interface
"""

import os
import sys
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

        .file-info {
            display: none;
            margin-top: 16px;
            padding: 12px 16px;
            background: rgba(0,184,148,0.1);
            border: 1px solid rgba(0,184,148,0.3);
            border-radius: var(--radius-sm);
            font-size: 13px;
            color: var(--success);
        }

        .file-info.show { display: flex; align-items: center; gap: 8px; }

        input[type="file"] { display: none; }

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
                            <div class="drop-zone-text">Kéo thả file <strong>.md</strong> vào đây</div>
                            <div class="drop-zone-hint">hoặc nhấn để chọn file (tối đa 50MB)</div>
                            <input type="file" id="fileInput" accept=".md,.markdown,.txt" onchange="handleFileSelect(event)">
                        </div>
                        <div class="file-info" id="fileInfo">
                            <span>📎</span>
                            <span id="fileName"></span>
                            <span id="fileSize" style="margin-left:auto; color: var(--text-muted);"></span>
                        </div>
                    </div>

                    <!-- Tab: Direct Input -->
                    <div id="tab-text" class="tab-content">
                        <textarea class="md-textarea" id="mdTextarea" 
                            placeholder="# Tiêu đề&#10;&#10;Nhập nội dung Markdown ở đây...&#10;&#10;## Mục 2&#10;&#10;- Danh sách 1&#10;- Danh sách 2&#10;&#10;**Bold** và *italic*&#10;&#10;```javascript&#10;console.log('Hello');&#10;```"
                            oninput="updatePreview()"></textarea>
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
                <div class="card-header">
                    <div class="card-header-icon cyan">👁️</div>
                    <h3>Xem trước</h3>
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
            <p>MD Converter — Built for <a href="#">Web3GiangVien</a> Project • Python Flask + xhtml2pdf + python-docx</p>
        </div>
    </div>

    <!-- Toast -->
    <div class="toast" id="toast"></div>

    <script>
        let currentMdContent = '';
        let currentFileName = 'document';

        // Tab switching
        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            if (tab === 'file') {
                document.querySelectorAll('.tab')[0].classList.add('active');
                document.getElementById('tab-file').classList.add('active');
            } else {
                document.querySelectorAll('.tab')[1].classList.add('active');
                document.getElementById('tab-text').classList.add('active');
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
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        });

        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) processFile(file);
        }

        function processFile(file) {
            if (!file.name.match(/\.(md|markdown|txt)$/i)) {
                showToast('Chỉ hỗ trợ file .md, .markdown hoặc .txt', 'error');
                return;
            }

            currentFileName = file.name.replace(/\.[^.]+$/, '');

            const reader = new FileReader();
            reader.onload = function(e) {
                currentMdContent = e.target.result;
                
                // Update UI
                dropZone.classList.add('has-file');
                document.getElementById('fileInfo').classList.add('show');
                document.getElementById('fileName').textContent = file.name;
                document.getElementById('fileSize').textContent = formatSize(file.size);
                
                updateStats();
                updatePreview();
                enableButtons();
                showToast(`Đã tải "${file.name}" thành công!`, 'success');
            };
            reader.readAsText(file, 'utf-8');
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

        // Convert
        async function convert(format) {
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
                        filename: currentFileName
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

                showToast(`Đã xuất ${ext.toUpperCase()} thành công! 🎉`, 'success');
            } catch (err) {
                showToast(`Lỗi: ${err.message}`, 'error');
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
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


@app.route('/api/convert', methods=['POST'])
def convert():
    """Convert MD to PDF or DOCX"""
    data = request.get_json()
    content = data.get('content', '')
    fmt = data.get('format', 'pdf')
    filename = data.get('filename', 'document')
    
    if not content.strip():
        return jsonify({'error': 'Nội dung Markdown trống'}), 400
    
    try:
        if fmt == 'pdf':
            output = convert_md_to_pdf(content, title=filename)
            mimetype = 'application/pdf'
            ext = 'pdf'
        elif fmt == 'docx':
            output = convert_md_to_docx(content, title=filename)
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


if __name__ == '__main__':
    print("\n" + "="*60)
    print("  MD Converter - Markdown to PDF / Word")
    print("  URL: http://localhost:5500")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5500, debug=True)
