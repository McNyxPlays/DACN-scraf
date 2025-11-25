// src/utils/usePDFHandlers.js
import generateInvoicePDF from "./generateInvoicePDF";

export const usePDFHandlers = (order) => {
  const handleDownloadPDF = async () => {
    await generateInvoicePDF(order);
  };
  const handleViewPDF = async () => {
    const blob = await generateInvoicePDF(order, { download: false });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
  return { handleDownloadPDF, handleViewPDF };
};