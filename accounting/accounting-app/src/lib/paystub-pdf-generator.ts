import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PaystubData {
  paystub: {
    id: number;
    grossPay: string;
    netPay: string;
    federalTax: string;
    provincialTax: string;
    cpp: string;
    ei: string;
    otherDeductions: string;
  };
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  payrollRun: {
    payRunNumber: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
  };
}

export class PaystubPDFGenerator {
  /**
   * Generate a single paystub PDF
   */
  static generatePaystubPDF(data: PaystubData): jsPDF {
    const doc = new jsPDF();
    const { paystub, employee, payrollRun } = data;
    
    // Company header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYSTUB', 105, 20, { align: 'center' });
    
    // Pay period info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pay Run: ${payrollRun.payRunNumber}`, 20, 35);
    doc.text(`Pay Period: ${new Date(payrollRun.payPeriodStart).toLocaleDateString()} - ${new Date(payrollRun.payPeriodEnd).toLocaleDateString()}`, 20, 42);
    doc.text(`Pay Date: ${new Date(payrollRun.payDate).toLocaleDateString()}`, 20, 49);
    
    // Employee information
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 20, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${employee.firstName} ${employee.lastName}`, 20, 70);
    doc.text(`Employee #: ${employee.employeeNumber}`, 20, 77);
    if (employee.address) {
      doc.text(`Address: ${employee.address}`, 20, 84);
      if (employee.city) {
        doc.text(`${employee.city}, ${employee.province} ${employee.postalCode}`, 20, 91);
      }
    }
    
    // Earnings section
    const earningsY = 105;
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS', 20, earningsY);
    
    autoTable(doc, {
      startY: earningsY + 5,
      head: [['Description', 'Amount']],
      body: [
        ['Gross Pay', `$${parseFloat(paystub.grossPay).toFixed(2)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Deductions section
    const deductionsY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DEDUCTIONS', 20, deductionsY);
    
    const deductions = [];
    
    if (parseFloat(paystub.federalTax) > 0) {
      deductions.push(['Federal Income Tax', `-$${parseFloat(paystub.federalTax).toFixed(2)}`]);
    }
    if (parseFloat(paystub.provincialTax) > 0) {
      deductions.push(['Provincial Income Tax', `-$${parseFloat(paystub.provincialTax).toFixed(2)}`]);
    }
    if (parseFloat(paystub.cpp) > 0) {
      deductions.push(['CPP (Canada Pension Plan)', `-$${parseFloat(paystub.cpp).toFixed(2)}`]);
    }
    if (parseFloat(paystub.ei) > 0) {
      deductions.push(['EI (Employment Insurance)', `-$${parseFloat(paystub.ei).toFixed(2)}`]);
    }
    if (parseFloat(paystub.otherDeductions) > 0) {
      deductions.push(['Other Deductions', `-$${parseFloat(paystub.otherDeductions).toFixed(2)}`]);
    }
    
    const totalDeductions = parseFloat(paystub.federalTax) + 
                           parseFloat(paystub.provincialTax) + 
                           parseFloat(paystub.cpp) + 
                           parseFloat(paystub.ei) + 
                           parseFloat(paystub.otherDeductions);
    
    deductions.push(['Total Deductions', `-$${totalDeductions.toFixed(2)}`]);
    
    autoTable(doc, {
      startY: deductionsY + 5,
      head: [['Description', 'Amount']],
      body: deductions,
      theme: 'striped',
      headStyles: { fillColor: [217, 83, 79] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Net pay section
    const netPayY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAY:', 20, netPayY);
    doc.setTextColor(0, 128, 0); // Green color
    doc.text(`$${parseFloat(paystub.netPay).toFixed(2)}`, 190, netPayY, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Year-to-date summary box
    const ytdY = netPayY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('YEAR-TO-DATE SUMMARY', 20, ytdY);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('(YTD calculations would be displayed here in production)', 20, ytdY + 7);
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text('This is an official payroll document. Please retain for your records.', 105, pageHeight - 20, { align: 'center' });
    doc.text('For questions regarding this paystub, please contact your payroll administrator.', 105, pageHeight - 15, { align: 'center' });
    
    return doc;
  }
  
  /**
   * Generate and download a single paystub PDF
   */
  static downloadPaystubPDF(data: PaystubData): void {
    const doc = this.generatePaystubPDF(data);
    const fileName = `Paystub-${data.employee.employeeNumber}-${data.payrollRun.payRunNumber}.pdf`;
    doc.save(fileName);
  }
  
  /**
   * Generate and download multiple paystubs as separate PDFs
   */
  static downloadBulkPaystubPDFs(paystubs: PaystubData[]): void {
    paystubs.forEach((paystubData, index) => {
      // Add a small delay between downloads to avoid browser blocking
      setTimeout(() => {
        this.downloadPaystubPDF(paystubData);
      }, index * 300);
    });
  }
  
  /**
   * Generate a single PDF containing all paystubs
   */
  static generateCombinedPaystubsPDF(paystubs: PaystubData[]): jsPDF {
    if (paystubs.length === 0) {
      throw new Error('No paystubs to generate');
    }
    
    // Create first paystub
    const doc = this.generatePaystubPDF(paystubs[0]);
    
    // Add remaining paystubs on new pages
    for (let i = 1; i < paystubs.length; i++) {
      doc.addPage();
      const tempDoc = this.generatePaystubPDF(paystubs[i]);
      
      // Copy content from temp doc to main doc
      // Note: This is a simplified approach - in production, you'd use a more robust method
      const pageContent = (tempDoc as any).internal.pages[1];
      if (pageContent) {
        (doc as any).internal.pages[doc.internal.getNumberOfPages()] = pageContent;
      }
    }
    
    return doc;
  }
  
  /**
   * Download a combined PDF of all paystubs
   */
  static downloadCombinedPaystubsPDF(paystubs: PaystubData[], payRunNumber: string): void {
    const doc = this.generateCombinedPaystubsPDF(paystubs);
    const fileName = `Paystubs-${payRunNumber}.pdf`;
    doc.save(fileName);
  }
}
