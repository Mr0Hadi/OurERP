namespace Application.Common.Contracts.Documents
{
    /// <summary>
    /// Points at the LibreOffice headless executable used to convert the filled official-invoice
    /// Excel template to PDF (ExcelInvoiceDocumentService). Not in PATH by default on Windows dev
    /// machines, hence the configurable path rather than always shelling out to bare "soffice".
    /// </summary>
    public class LibreOfficeOptions
    {
        public const string SectionName = "LibreOffice";

        public string ExecutablePath { get; set; } = "soffice";
        public int ConversionTimeoutSeconds { get; set; } = 60;
    }
}
