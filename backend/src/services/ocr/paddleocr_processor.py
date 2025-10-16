#!/usr/bin/env python3
"""
PaddleOCR Receipt Processor

This script provides PaddleOCR integration for Node.js backend.
It accepts an image path and returns structured OCR results as JSON.

Usage:
    python3 paddleocr_processor.py <image_path>

Output (JSON):
    {
        "text": "extracted text",
        "confidence": 0.95,
        "words": [...],
        "processingTime": 1.23
    }

Requirements:
    pip install paddleocr paddlepaddle opencv-python
"""

import sys
import json
import time
from pathlib import Path

try:
    from paddleocr import PaddleOCR
    import cv2
    import numpy as np
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False


def preprocess_image(image_path):
    """
    Preprocess image for better OCR results.
    Applies deskewing, contrast enhancement, and noise reduction.
    """
    img = cv2.imread(image_path)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding for better contrast
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(binary)
    
    # Deskewing (simple rotation correction)
    coords = np.column_stack(np.where(denoised > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        if abs(angle) > 0.5:  # Only rotate if necessary
            (h, w) = denoised.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            denoised = cv2.warpAffine(
                denoised, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
    
    return denoised


def process_receipt(image_path):
    """
    Process receipt image with PaddleOCR.
    Returns OCR results with confidence scores.
    """
    if not PADDLEOCR_AVAILABLE:
        return {
            "error": "PaddleOCR not installed. Please run: pip install paddleocr paddlepaddle opencv-python",
            "available": False
        }
    
    start_time = time.time()
    
    try:
        # Initialize PaddleOCR (use_angle_cls=True for rotated text)
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            show_log=False,
            use_gpu=False  # Set to True if GPU available
        )
        
        # Preprocess image
        preprocessed = preprocess_image(image_path)
        
        # Run OCR
        result = ocr.ocr(preprocessed, cls=True)
        
        if not result or not result[0]:
            return {
                "text": "",
                "confidence": 0.0,
                "words": [],
                "processingTime": time.time() - start_time,
                "available": True
            }
        
        # Extract text and confidence
        words = []
        full_text_lines = []
        total_confidence = 0.0
        word_count = 0
        
        for line in result[0]:
            if line and len(line) >= 2:
                text = line[1][0]
                confidence = line[1][1]
                bbox = line[0]
                
                words.append({
                    "text": text,
                    "confidence": float(confidence),
                    "bbox": [[float(x), float(y)] for x, y in bbox]
                })
                
                full_text_lines.append(text)
                total_confidence += confidence
                word_count += 1
        
        # Calculate average confidence
        avg_confidence = total_confidence / word_count if word_count > 0 else 0.0
        
        processing_time = time.time() - start_time
        
        return {
            "text": "\n".join(full_text_lines),
            "confidence": float(avg_confidence),
            "words": words,
            "processingTime": float(processing_time),
            "available": True,
            "wordCount": word_count
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "text": "",
            "confidence": 0.0,
            "words": [],
            "processingTime": time.time() - start_time,
            "available": True
        }


def check_availability():
    """Check if PaddleOCR is available and working."""
    return {
        "available": PADDLEOCR_AVAILABLE,
        "version": "2.7.0" if PADDLEOCR_AVAILABLE else None,
        "gpu_available": False  # TODO: Check actual GPU availability
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Check if file exists
    if not Path(image_path).exists():
        print(json.dumps({"error": f"Image file not found: {image_path}"}))
        sys.exit(1)
    
    # Process image
    result = process_receipt(image_path)
    
    # Output JSON
    print(json.dumps(result, indent=2))

