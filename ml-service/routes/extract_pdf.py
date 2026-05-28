import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

from utils.pdf_extractor import extract_pdf_text

logger = logging.getLogger('ml-service')
router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

@router.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    if not file.content_type or 'pdf' not in file.content_type.lower():
        raise HTTPException(status_code=400, detail='Chỉ chấp nhận file PDF')
    
    file_bytes = await file.read()
    
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail='File rỗng')
    
    # Kiểm tra magic bytes
    if not file_bytes.startswith(b'%PDF'):
        raise HTTPException(status_code=400, detail='File không hợp lệ (không phải PDF)')
    
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail='File quá lớn (tối đa 20MB)')
    
    logger.info(f'[EXTRACT] Processing PDF | size={len(file_bytes)} bytes | name={file.filename}')
    
    result = extract_pdf_text(file_bytes)
    
    logger.info(f'[EXTRACT] Done | method={result["method"]} | pages={result["page_count"]} | textLen={len(result["text"])} | warnings={len(result["warnings"])}')
    
    return result
