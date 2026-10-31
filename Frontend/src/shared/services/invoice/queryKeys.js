/**
 * کلیدهای کشِ سندهای چاپی — سراسری، چون فروش و هر دو مرجوعی از یک کارتِ سند (`InvoiceDocumentSection`)
 * چاپ می‌کنند.
 */
export const invoiceKeys = {
  all: ["invoice"],
  documents: () => [...invoiceKeys.all, "document"],
  document: (documentKind, documentId) => [...invoiceKeys.documents(), documentKind, String(documentId ?? "")],
};
