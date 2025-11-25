// src/utils/usePDFHandlers.js
import generateInvoicePDF from "./generateInvoicePDF";

export const usePDFHandlers = (order) => {
  const handleDownloadPDF = () => generateInvoicePDF(order);
  const handleViewPDF = () => {
    const blob = generateInvoicePDF(order, { download: false });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
  return { handleDownloadPDF, handleViewPDF };
};