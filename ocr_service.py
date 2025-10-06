#!/usr/bin/env python3
"""
PaddleOCR Microservice for expenseApp
Provides high-accuracy OCR for receipt text extraction
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR
import os
import tempfile
import logging
from typing import Dict, List, Any
import re
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="expenseApp OCR Service",
    description="PaddleOCR-powered receipt text extraction",
    version="1.0.0"
)

# Initialize PaddleOCR (runs once at startup)
# use_textline_orientation=True enables text direction detection  
# lang='en' for English, supports 80+ languages
logger.info("Initializing PaddleOCR...")
ocr = PaddleOCR(lang='en')
logger.info("PaddleOCR initialized successfully")


def extract_receipt_data(text: str) -> Dict[str, Any]:
    """
    Extract structured data from receipt text using pattern matching
    
    Args:
        text: Raw OCR text from receipt
        
    Returns:
        Dictionary with extracted structured data
    """
    structured = {
        'merchant': None,
        'total': None,
        'date': None,
        'location': None,
        'category': None
    }
    
    # Extract total amount (common patterns)
    # Matches: Total: $45.99, TOTAL 45.99, Total: 45.99, etc.
    total_patterns = [
        r'total[\s:$]*(\d+[.,]\d{2})',
        r'amount[\s:$]*(\d+[.,]\d{2})',
        r'balance[\s:$]*(\d+[.,]\d{2})',
        r'\$\s*(\d+[.,]\d{2})',
    ]
    
    for pattern in total_patterns:
        match = re.search(pattern, text.lower())
        if match:
            amount_str = match.group(1).replace(',', '.')
            try:
                structured['total'] = float(amount_str)
                break
            except ValueError:
                continue
    
    # Extract date (various formats)
    date_patterns = [
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
        r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}[,\s]+\d{4}',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text.lower())
        if match:
            structured['date'] = match.group(0)
            break
    
    # Extract merchant (usually at top, look for capitalized words)
    lines = text.split('\n')
    for line in lines[:5]:  # Check first 5 lines
        line = line.strip()
        if len(line) > 3 and not any(char.isdigit() for char in line):
            # Likely a merchant name if it's text-only and at the top
            if line.isupper() or line.istitle():
                structured['merchant'] = line
                break
    
    # Guess category based on merchant name or keywords
    text_lower = text.lower()
    if any(keyword in text_lower for keyword in ['restaurant', 'cafe', 'diner', 'food', 'kitchen']):
        structured['category'] = 'Meals'
    elif any(keyword in text_lower for keyword in ['hotel', 'inn', 'lodge', 'marriott', 'hilton']):
        structured['category'] = 'Accommodation'
    elif any(keyword in text_lower for keyword in ['uber', 'lyft', 'taxi', 'cab', 'transport']):
        structured['category'] = 'Transportation'
    elif any(keyword in text_lower for keyword in ['office', 'staples', 'depot', 'supplies']):
        structured['category'] = 'Office Supplies'
    
    return structured


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "expenseApp OCR Service",
        "engine": "PaddleOCR v3.2.0",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "ocr_engine": "PaddleOCR",
        "version": "3.2.0",
        "gpu_enabled": False,
        "languages": ["en"]
    }


@app.post("/ocr/process")
async def process_ocr(file: UploadFile = File(...)):
    """
    Process an uploaded receipt image with OCR
    
    Args:
        file: Uploaded image file (JPEG, PNG, PDF)
        
    Returns:
        JSON with extracted text, confidence, and structured data
    """
    try:
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, PDF"
            )
        
        logger.info(f"Processing file: {file.filename} ({file.content_type})")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        try:
            # Run PaddleOCR
            logger.info(f"Running PaddleOCR on {tmp_path}...")
            result = ocr.ocr(tmp_path, cls=True)
            
            if not result or not result[0]:
                logger.warning("No text detected in image")
                return JSONResponse(content={
                    "text": "",
                    "confidence": 0.0,
                    "structured": {},
                    "lines": [],
                    "message": "No text detected in image"
                })
            
            # Extract text and confidence from results
            lines = []
            all_text = []
            total_confidence = 0
            count = 0
            
            for line in result[0]:
                if line:
                    box = line[0]  # Bounding box coordinates
                    text_info = line[1]  # (text, confidence)
                    text = text_info[0]
                    confidence = text_info[1]
                    
                    all_text.append(text)
                    total_confidence += confidence
                    count += 1
                    
                    lines.append({
                        "text": text,
                        "confidence": round(confidence, 4),
                        "box": box
                    })
            
            # Combine all text
            full_text = '\n'.join(all_text)
            avg_confidence = total_confidence / count if count > 0 else 0.0
            
            # Extract structured data
            structured = extract_receipt_data(full_text)
            
            logger.info(f"OCR completed: {len(lines)} lines, {avg_confidence:.2%} avg confidence")
            
            return JSONResponse(content={
                "text": full_text,
                "confidence": round(avg_confidence, 4),
                "structured": structured,
                "lines": lines,
                "line_count": len(lines)
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        logger.error(f"OCR processing error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/ocr/batch")
async def process_batch(files: List[UploadFile] = File(...)):
    """
    Process multiple receipt images in batch
    
    Args:
        files: List of uploaded image files
        
    Returns:
        JSON array with results for each file
    """
    results = []
    
    for file in files:
        try:
            result = await process_ocr(file)
            results.append({
                "filename": file.filename,
                "status": "success",
                "result": result
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })
    
    return JSONResponse(content={"results": results})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

