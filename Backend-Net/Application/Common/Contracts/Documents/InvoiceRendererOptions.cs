namespace Application.Common.Contracts.Documents
{
    /// <summary>
    /// Selects which <see cref="IPdfDocumentService"/> implementation renders invoices/credit
    /// notes. Two engines exist on purpose: the LibreOffice one is pixel-faithful to the official
    /// government Excel template but needs `soffice` installed on the deploy target, while the
    /// QuestPDF one is a pure in-process renderer (no shell-out, no external dependency) at the
    /// cost of being only visually close to that template. Making it configuration rather than a
    /// compile-time choice lets ops run the process-free renderer where LibreOffice can't be
    /// installed without touching any call site.
    /// Defaults to LibreOffice so existing deployments keep their current output byte-for-byte.
    /// </summary>
    public class InvoiceRendererOptions
    {
        public const string SectionName = "InvoiceRenderer";

        public const string LibreOfficeEngine = "LibreOffice";
        public const string QuestPdfEngine = "QuestPdf";

        public string Engine { get; set; } = LibreOfficeEngine;

        /// <summary>True when <see cref="Engine"/> selects the process-free QuestPDF renderer.</summary>
        public bool UsesQuestPdf => string.Equals(Engine, QuestPdfEngine, StringComparison.OrdinalIgnoreCase);
    }
}
