#!/usr/bin/env python3
"""EasyOCR Microservice for expenseApp - High-accuracy receipt text extraction"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import easyocr
import os
import tempfile
import logging
import re
from typing import Dict, List, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="expenseApp OCR Service", description="EasyOCR-powered receipt extraction", version="1.0.0")

logger.info("Initializing EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
logger.info("EasyOCR initialized successfully")

def extract_receipt_data(text: str) -> Dict[str, Any]:
    structured = {'merchant': None, 'total': None, 'date': None, 'location': None, 'category': None}
    
    # Extract total
    for pattern in [r'total[\s:$]*(\d+[.,]\d{2})', r'amount[\s:$]*(\d+[.,]\d{2})', r'\$\s*(\d+[.,]\d{2})']:
        match = re.search(pattern, text.lower())
        if match:
            try:
                structured['total'] = float(match.group(1).replace(',', '.'))
                break
            except: continue
    
    # Extract date
    for pattern in [r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})']:
        match = re.search(pattern, text.lower())
        if match:
            structured['date'] = match.group(0)
            break
    
    # Extract merchant (first text-only uppercase line)
    lines = text.split('\n')
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 3 and not any(char.isdigit() for char in line) and (line.isupper() or line.istitle()):
            structured['merchant'] = line
            break
    
    # Guess category
    text_lower = text.lower()
    if any(k in text_lower for k in ['restaurant', 'cafe', 'food']): structured['category'] = 'Meals'
    elif any(k in text_lower for k in ['hotel', 'inn', 'marriott', 'hilton']): structured['category'] = 'Accommodation'
    elif any(k in text_lower for k in ['uber', 'lyft', 'taxi']): structured['category'] = 'Transportation'
    
    return structured

@app.get("/")
async def root():
    return {"status": "ok", "service": "expenseApp OCR Service", "engine": "EasyOCR", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "ocr_engine": "EasyOCR", "version": "1.7.2", "languages": ["en"]}

@app.post("/ocr/process")
async def process_ocr(file: UploadFile = File(...)):
    try:
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}")
        
        logger.info(f"Processing: {file.filename}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        try:
            logger.info(f"Running EasyOCR on {tmp_path}")
            result = reader.readtext(tmp_path)
            
            if not result:
                return JSONResponse(content={"text": "", "confidence": 0.0, "structured": {}, "lines": [], "message": "No text detected"})
            
            lines = []
            all_text = []
            total_confidence = 0
            
            for (bbox, text, confidence) in result:
                all_text.append(text)
                total_confidence += confidence
                lines.append({"text": text, "confidence": round(confidence, 4), "box": bbox})
            
            full_text = '\n'.join(all_text)
            avg_confidence = total_confidence / len(result)
            structured = extract_receipt_data(full_text)
            
            logger.info(f"OCR completed: {len(lines)} lines, {avg_confidence:.2%} confidence")
            
            return JSONResponse(content={
                "text": full_text,
                "confidence": round(avg_confidence, 4),
                "structured": structured,
                "lines": lines,
                "line_count": len(lines)
            })
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    except Exception as e:
        logger.error(f"OCR error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

