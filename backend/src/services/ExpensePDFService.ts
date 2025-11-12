/**
 * Expense PDF Service
 * 
 * Generates PDF documents for expense records including receipt images.
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ExpenseWithDetails } from '../database/repositories/ExpenseRepository';
import { NotFoundError } from '../utils/errors';

/**
 * Generate PDF for an expense record
 * 
 * @param expense - Expense data with user and event details
 * @returns PDF buffer
 */
export async function generateExpensePDF(expense: ExpenseWithDetails): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    console.log('[ExpensePDF] Starting PDF generation for expense:', expense.id);
    const startTime = Date.now();
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const buffers: Buffer[] = [];
    let dataChunks = 0;
    let totalBytes = 0;
    
    // Set up event handlers BEFORE generating content
    doc.on('data', (chunk: Buffer) => {
      buffers.push(chunk);
      dataChunks++;
      totalBytes += chunk.length;
      console.log(`[ExpensePDF] Received data chunk ${dataChunks}, size: ${chunk.length} bytes, total: ${totalBytes} bytes`);
    });
    
    doc.on('end', () => {
      try {
        console.log(`[ExpensePDF] PDF generation complete. Total chunks: ${dataChunks}, Total bytes: ${totalBytes}`);
        const pdfBuffer = Buffer.concat(buffers);
        const bufferSize = pdfBuffer.length;
        const generationTime = Date.now() - startTime;
        
        console.log(`[ExpensePDF] PDF buffer created. Size: ${bufferSize} bytes, Generation time: ${generationTime}ms`);
        
        if (bufferSize === 0) {
          console.error('[ExpensePDF] ERROR: Generated PDF buffer is empty!');
          reject(new Error('Generated PDF buffer is empty'));
          return;
        }
        
        // Validate PDF header (PDF files start with %PDF)
        if (pdfBuffer.length < 4 || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
          console.error('[ExpensePDF] ERROR: Generated buffer does not have valid PDF header!');
          console.error('[ExpensePDF] First 20 bytes:', pdfBuffer.slice(0, 20).toString('hex'));
          reject(new Error('Generated buffer is not a valid PDF'));
          return;
        }
        
        console.log('[ExpensePDF] PDF validation passed. Ready to send.');
        resolve(pdfBuffer);
      } catch (error) {
        console.error('[ExpensePDF] ERROR in end handler:', error);
        reject(error);
      }
    });
    
    doc.on('error', (error) => {
      console.error('[ExpensePDF] ERROR during PDF generation:', error);
      reject(error);
    });

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Expense Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Expense Details Section
    doc.fontSize(14).font('Helvetica-Bold').text('Expense Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    // Basic Information
    const basicInfo = [
      { label: 'Expense ID:', value: expense.id },
      { label: 'Date:', value: new Date(expense.date).toLocaleDateString() },
      { label: 'Amount:', value: `$${parseFloat(String(expense.amount)).toFixed(2)}` },
      { label: 'Merchant:', value: expense.merchant },
      { label: 'Category:', value: expense.category },
    ];

    basicInfo.forEach(({ label, value }) => {
      doc.font('Helvetica-Bold').text(label, { continued: true });
      doc.font('Helvetica').text(` ${value || 'N/A'}`);
    });

    doc.moveDown(0.5);

    // Additional Information
    if (expense.description) {
      doc.font('Helvetica-Bold').text('Description:', { continued: true });
      doc.font('Helvetica').text(` ${expense.description}`);
      doc.moveDown(0.3);
    }

    if (expense.location) {
      doc.font('Helvetica-Bold').text('Location:', { continued: true });
      doc.font('Helvetica').text(` ${expense.location}`);
      doc.moveDown(0.3);
    }

    if (expense.card_used) {
      doc.font('Helvetica-Bold').text('Card Used:', { continued: true });
      doc.font('Helvetica').text(` ${expense.card_used}`);
      doc.moveDown(0.3);
    }

    doc.moveDown(0.5);

    // Status Information
    doc.fontSize(12).font('Helvetica-Bold').text('Status Information', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);

    const statusInfo = [
      { label: 'Status:', value: expense.status },
      { label: 'Reimbursement Required:', value: expense.reimbursement_required ? 'Yes' : 'No' },
    ];

    if (expense.reimbursement_status) {
      statusInfo.push({ label: 'Reimbursement Status:', value: expense.reimbursement_status });
    }

    statusInfo.forEach(({ label, value }) => {
      doc.font('Helvetica-Bold').text(label, { continued: true });
      doc.font('Helvetica').text(` ${value || 'N/A'}`);
    });

    doc.moveDown(0.5);

    // Zoho Integration Information
    if (expense.zoho_entity || expense.zoho_expense_id) {
      doc.fontSize(12).font('Helvetica-Bold').text('Zoho Integration', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);

      if (expense.zoho_entity) {
        doc.font('Helvetica-Bold').text('Zoho Entity:', { continued: true });
        doc.font('Helvetica').text(` ${expense.zoho_entity}`);
      }

      if (expense.zoho_expense_id) {
        doc.font('Helvetica-Bold').text('Zoho Expense ID:', { continued: true });
        doc.font('Helvetica').text(` ${expense.zoho_expense_id}`);
      }

      doc.moveDown(0.5);
    }

    // Event Information
    if (expense.event_name) {
      doc.fontSize(12).font('Helvetica-Bold').text('Event Information', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.font('Helvetica-Bold').text('Event Name:', { continued: true });
      doc.font('Helvetica').text(` ${expense.event_name}`);
      doc.moveDown(0.5);
    }

    // User Information
    if (expense.user_name) {
      doc.fontSize(12).font('Helvetica-Bold').text('User Information', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.font('Helvetica-Bold').text('Submitted By:', { continued: true });
      doc.font('Helvetica').text(` ${expense.user_name}`);
      doc.moveDown(0.5);
    }

    // Receipt Image Section
    if (expense.receipt_url) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('Receipt', { underline: true });
      doc.moveDown(0.5);

      try {
        // Get the file path from the receipt URL
        // Receipt URLs are stored as /uploads/filename or /api/uploads/filename
        let receiptPath = expense.receipt_url;
        if (receiptPath.startsWith('/uploads/')) {
          receiptPath = receiptPath.substring('/uploads/'.length);
        } else if (receiptPath.startsWith('/api/uploads/')) {
          receiptPath = receiptPath.substring('/api/uploads/'.length);
        }

        // Build full path
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        const fullPath = path.join(uploadDir, receiptPath);

        // Check if file exists
        if (fs.existsSync(fullPath)) {
          // Get file extension to determine if it's an image
          const ext = path.extname(fullPath).toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(ext);

          if (isImage) {
            // For images, embed them in the PDF
            // Get image dimensions to fit on page
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const maxImageWidth = pageWidth;
            const maxImageHeight = 400; // Max height for receipt image

            // Add image to PDF
            doc.image(fullPath, {
              fit: [maxImageWidth, maxImageHeight],
              align: 'center'
            });
          } else if (ext === '.pdf') {
            // For PDF receipts, add a note
            doc.fontSize(10).font('Helvetica-Oblique').text('Receipt is a PDF file. Please view separately.', {
              align: 'center'
            });
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('Receipt File:', { continued: true });
            doc.font('Helvetica').text(` ${expense.receipt_url}`);
          } else {
            // Unknown file type
            doc.fontSize(10).font('Helvetica').text('Receipt file attached:', {
              align: 'left'
            });
            doc.font('Helvetica-Bold').text('File:', { continued: true });
            doc.font('Helvetica').text(` ${expense.receipt_url}`);
          }
        } else {
          // File not found
          doc.fontSize(10).font('Helvetica').fillColor('red').text('Receipt file not found on server.', {
            align: 'left'
          });
          doc.fillColor('black'); // Reset color
          doc.font('Helvetica-Bold').text('Receipt URL:', { continued: true });
          doc.font('Helvetica').text(` ${expense.receipt_url}`);
        }
      } catch (error: any) {
        // Error loading receipt image
        console.error('[ExpensePDF] Error loading receipt image:', error);
        doc.fontSize(10).font('Helvetica').fillColor('red').text('Error loading receipt image.', {
          align: 'left'
        });
        doc.fillColor('black'); // Reset color
        doc.font('Helvetica-Bold').text('Receipt URL:', { continued: true });
        doc.font('Helvetica').text(` ${expense.receipt_url}`);
      }
    }

    // Footer - add after content to prevent blank pages
    // Use normal text flow instead of fixed position to avoid page breaks
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').text(
      `Generated by Expense Management System`,
      { align: 'center' }
    );
    console.log('[ExpensePDF] Footer added after content');

    // Finalize PDF - this triggers the 'end' event
    console.log('[ExpensePDF] Calling doc.end() to finalize PDF...');
    doc.end();
    console.log('[ExpensePDF] doc.end() called. Waiting for PDF generation to complete...');
  });
}
