import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(level=logging.INFO):
    """
    Cấu hình logging cho ML Service.
    - Console: hiển thị tất cả log
    - ml-service.log: tất cả log (info+)
    - error.log: chỉ error
    - Rotation: 10MB, giữ 5 files cũ
    """
    log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)

    log_format = '%(asctime)s [%(levelname)-5s] %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    formatter = logging.Formatter(log_format, datefmt=date_format)

    # Root logger
    logger = logging.getLogger('ml-service')
    logger.setLevel(level)

    # Tránh duplicate handlers khi reload
    if logger.handlers:
        return logger

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler: ml-service.log (tất cả log)
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'ml-service.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Error file handler: error.log (chỉ error)
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    return logger
