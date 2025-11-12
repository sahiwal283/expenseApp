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
    
    // Create PDF document with reduced margins for more space
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 30, bottom: 30, left: 40, right: 40 } // Reduced margins for more content space
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

    // Header - compact
    doc.fontSize(16).font('Helvetica-Bold').text('Expense Details', { align: 'center' }); // Reduced from 18
    doc.moveDown(0.2); // Minimal spacing
    doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }); // Reduced from 9
    doc.moveDown(0.3); // Reduced spacing

    // Expense Details Section - compact layout
    doc.fontSize(11).font('Helvetica-Bold').text('Expense Details', { underline: true }); // Reduced from 13
    doc.moveDown(0.15); // Minimal spacing
    doc.fontSize(9).font('Helvetica'); // Reduced from 10

    // Basic Information - compact
    const basicInfo = [
      { label: 'Date:', value: new Date(expense.date).toLocaleDateString() },
      { label: 'Amount:', value: `$${parseFloat(String(expense.amount)).toFixed(2)}` },
      { label: 'Merchant:', value: expense.merchant },
      { label: 'Category:', value: expense.category },
    ];

    basicInfo.forEach(({ label, value }) => {
      doc.font('Helvetica-Bold').text(label, { continued: true });
      doc.font('Helvetica').text(` ${value || 'N/A'}`);
    });

    doc.moveDown(0.2); // Reduced spacing

    // Additional Information - compact
    if (expense.description) {
      doc.font('Helvetica-Bold').text('Description:', { continued: true });
      doc.font('Helvetica').text(` ${expense.description}`);
      doc.moveDown(0.15); // Reduced spacing
    }

    if (expense.location) {
      doc.font('Helvetica-Bold').text('Location:', { continued: true });
      doc.font('Helvetica').text(` ${expense.location}`);
      doc.moveDown(0.15); // Reduced spacing
    }

    if (expense.card_used) {
      doc.font('Helvetica-Bold').text('Card Used:', { continued: true });
      doc.font('Helvetica').text(` ${expense.card_used}`);
      doc.moveDown(0.15); // Reduced spacing
    }

    doc.moveDown(0.2); // Reduced spacing

    // Status Information - compact
    doc.fontSize(10).font('Helvetica-Bold').text('Status Information', { underline: true }); // Reduced from 12
    doc.moveDown(0.1); // Minimal spacing
    doc.fontSize(9); // Reduced from 10

    const statusInfo = [
      { label: 'Approval Status:', value: expense.status },
      { label: 'Reimbursement Required:', value: expense.reimbursement_required ? 'Yes' : 'No' },
    ];

    if (expense.reimbursement_status) {
      statusInfo.push({ label: 'Reimbursement Status:', value: expense.reimbursement_status });
    }

    statusInfo.forEach(({ label, value }) => {
      doc.font('Helvetica-Bold').text(label, { continued: true });
      doc.font('Helvetica').text(` ${value || 'N/A'}`);
    });

    doc.moveDown(0.2); // Reduced spacing

    // Zoho Integration Information - Always show this section - compact
    doc.fontSize(10).font('Helvetica-Bold').text('Zoho Integration', { underline: true }); // Reduced from 12
    doc.moveDown(0.1); // Minimal spacing
    doc.fontSize(9); // Reduced from 10

    // Zoho Push Status
    let zohoPushStatus = 'Not Pushed';
    if (expense.zoho_expense_id) {
      zohoPushStatus = 'Pushed';
    } else if (expense.zoho_entity) {
      zohoPushStatus = 'Not Pushed';
    }
    doc.font('Helvetica-Bold').text('Zoho Push Status:', { continued: true });
    doc.font('Helvetica').text(` ${zohoPushStatus}`);

    // Zoho Entity - Always show, display "Unassigned" if not assigned
    const zohoEntity = expense.zoho_entity && expense.zoho_entity.trim() !== '' 
      ? expense.zoho_entity 
      : 'Unassigned';
    doc.font('Helvetica-Bold').text('Zoho Entity:', { continued: true });
    doc.font('Helvetica').text(` ${zohoEntity}`);

    // Zoho Expense ID - Only show if it exists
    if (expense.zoho_expense_id) {
      doc.font('Helvetica-Bold').text('Zoho Expense ID:', { continued: true });
      doc.font('Helvetica').text(` ${expense.zoho_expense_id}`);
    }

    doc.moveDown(0.2); // Reduced spacing

    // Event Information - compact
    if (expense.event_name) {
      doc.fontSize(10).font('Helvetica-Bold').text('Event Information', { underline: true }); // Reduced from 12
      doc.moveDown(0.1); // Minimal spacing
      doc.fontSize(9); // Reduced from 10
      doc.font('Helvetica-Bold').text('Event Name:', { continued: true });
      doc.font('Helvetica').text(` ${expense.event_name}`);
      doc.moveDown(0.2); // Reduced spacing
    }

    // User Information - compact
    if (expense.user_name) {
      doc.fontSize(10).font('Helvetica-Bold').text('User Information', { underline: true }); // Reduced from 12
      doc.moveDown(0.1); // Minimal spacing
      doc.fontSize(9); // Reduced from 10
      doc.font('Helvetica-Bold').text('Submitted By:', { continued: true });
      doc.font('Helvetica').text(` ${expense.user_name}`);
      doc.moveDown(0.2); // Reduced spacing
    }

    // Receipt Image Section - Optimized for larger image
    if (expense.receipt_url) {
      // Check available space before adding receipt section
      const currentY = doc.y;
      const pageHeight = doc.page.height;
      const bottomMargin = doc.page.margins.bottom;
      const availableSpace = pageHeight - currentY - bottomMargin - 20; // Reserve only 20 points for footer
      
      doc.fontSize(11).font('Helvetica-Bold').text('Receipt', { underline: true }); // Reduced from 13
      doc.moveDown(0.15); // Minimal spacing

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
            // For images, embed them in the PDF - use maximum available space
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const currentYAfterHeader = doc.y;
            const pageHeight = doc.page.height;
            const bottomMargin = doc.page.margins.bottom;
            // Use almost all available space - reserve only 20 points for footer
            const availableHeight = pageHeight - currentYAfterHeader - bottomMargin - 20;
            
            // Use maximum available space for image (no artificial cap)
            const maxImageWidth = pageWidth;
            const maxImageHeight = availableHeight; // Use all available height for larger image

            console.log(`[ExpensePDF] Receipt image sizing: width=${maxImageWidth.toFixed(0)}, height=${maxImageHeight.toFixed(0)}, available=${availableHeight.toFixed(0)}`);

            // Add image to PDF - larger and more prominent
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

    // Footer - compact, minimal spacing
    doc.moveDown(0.5); // Reduced spacing
    doc.fontSize(7).font('Helvetica').text( // Reduced from 8
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
