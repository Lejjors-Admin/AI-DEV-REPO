import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  id: number;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  subtotal: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  notes?: string;
  paymentTerms?: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export class InvoicePDFGenerator {
  private doc: jsPDF;
  
  constructor() {
    this.doc = new jsPDF();
  }

  generateInvoicePDF(invoice: InvoiceData): void {
    // Company header
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INVOICE', 20, 30);
    
    // Invoice details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 50);
    this.doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 20, 60);
    this.doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 70);
    
    // Customer details
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', 20, 90);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(invoice.customerName, 20, 100);
    if (invoice.customerEmail) {
      this.doc.text(invoice.customerEmail, 20, 110);
    }
    if (invoice.customerPhone) {
      this.doc.text(invoice.customerPhone, 20, 120);
    }
    if (invoice.customerAddress) {
      this.doc.text(invoice.customerAddress, 20, 130);
    }
    
    // Items table
    const tableData = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${Number(item.rate).toFixed(2)}`,
      `$${Number(item.amount).toFixed(2)}`
    ]);
    
    autoTable(this.doc, {
      head: [['Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      startY: 150,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });
    
    // Get final Y position after table
    const finalY = (this.doc as any).lastAutoTable.finalY + 10;
    
    // Totals
    const subtotal = Number(invoice.subtotal);
    const discountAmount = Number(invoice.discountAmount);
    const taxAmount = Number(invoice.taxAmount);
    const totalAmount = Number(invoice.totalAmount);
    
    const totalsX = 140;
    this.doc.text(`Subtotal: $${subtotal.toFixed(2)}`, totalsX, finalY);
    
    if (discountAmount > 0) {
      this.doc.text(`Discount: -$${discountAmount.toFixed(2)}`, totalsX, finalY + 10);
    }
    
    if (taxAmount > 0) {
      this.doc.text(`Tax: $${taxAmount.toFixed(2)}`, totalsX, finalY + 20);
    }
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Total: $${totalAmount.toFixed(2)}`, totalsX, finalY + 30);
    
    // Notes
    if (invoice.notes) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('Notes:', 20, finalY + 50);
      this.doc.text(invoice.notes, 20, finalY + 60);
    }
    
    // Payment terms
    if (invoice.paymentTerms) {
      this.doc.text(`Payment Terms: ${invoice.paymentTerms}`, 20, finalY + 80);
    }
  }
  
  download(filename: string): void {
    this.doc.save(filename);
  }
  
  getBlob(): Blob {
    return this.doc.output('blob');
  }
}