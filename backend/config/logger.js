const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Tạo thư mục logs nếu chưa có
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom format: timestamp [LEVEL]  message | meta
const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' | ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}${metaStr}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console — có màu sắc
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            )
        }),

        // combined.log — tất cả log (info trở lên)
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),

        // error.log — chỉ lỗi
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 5
        }),

        // ai.log — AI/ML specific
        new winston.transports.File({
            filename: path.join(logDir, 'ai.log'),
            level: 'info',
            maxsize: 10485760,
            maxFiles: 5
        })
    ]
});

module.exports = logger;
