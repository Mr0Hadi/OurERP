using Application.Common.Contracts.Documents;
using Application.Common.Documents;

namespace Application.Features.Invoice.Dtos
{
    /// <summary>
    /// The print data of an official document (docs/frontend-requests.fa.md section 27): InvoiceDocumentModel as the wire sees it.
    /// Amounts are whole rials, dates ISO - formatting is the frontend's. A missing value is null, never an empty string.
    /// <see cref="Notes"/> are exactly what the official template prints in its notes cell, without <see cref="Description"/>.
    /// </summary>
    public class InvoiceDocumentDto
    {
        public string Title { get; set; } = string.Empty;
        public bool IsProforma { get; set; }
        public string? DocumentNumber { get; set; }
        public DateTime DocumentDate { get; set; }
        public DateTime? PaymentDueDate { get; set; }
        public string? StatusText { get; set; }
        public string? Description { get; set; }
        public List<string> Notes { get; set; } = new();
        public InvoicePartyDto Company { get; set; } = new();
        public string CounterpartyLabel { get; set; } = string.Empty;
        public InvoicePartyDto Counterparty { get; set; } = new();
        public List<InvoiceDocumentLineDto> Lines { get; set; } = new();
        public ulong SubTotal { get; set; }
        public ulong TotalDiscount { get; set; }
        public ulong TotalTax { get; set; }
        public ulong GrandTotal { get; set; }
        public ulong? InstallmentChargeAmount { get; set; }
        public ulong? PayableAmount { get; set; }
        public ulong PaidAmount { get; set; }
        public long Balance { get; set; }

        public static InvoiceDocumentDto From(InvoiceDocumentModel model) => new()
        {
            Title = model.Title,
            IsProforma = model.IsProforma,
            DocumentNumber = Blank(model.DocumentNumber),
            DocumentDate = model.DocumentDate,
            PaymentDueDate = model.PaymentDueDate,
            StatusText = Blank(model.StatusText),
            Description = Blank(model.Description),
            Notes = InvoiceDocumentNotes.For(model),
            Company = new InvoicePartyDto
            {
                Name = Blank(model.Company.Name),
                NationalId = Blank(model.Company.NationalId),
                EconomicCode = Blank(model.Company.EconomicCode),
                RegistrationNumber = Blank(model.Company.RegistrationNumber),
                Address = Blank(model.Company.Address),
                PhoneNumber = Blank(model.Company.PhoneNumber),
                PostalCode = Blank(model.Company.PostalCode),
                Province = Blank(model.Company.Province),
                City = Blank(model.Company.City),
                Currency = Blank(model.Company.Currency),
            },
            CounterpartyLabel = model.CounterpartyLabel,
            Counterparty = new InvoicePartyDto
            {
                Name = Blank(model.Counterparty.Name),
                NationalId = Blank(model.Counterparty.NationalId),
                EconomicCode = Blank(model.Counterparty.EconomicCode),
                RegistrationNumber = Blank(model.Counterparty.RegistrationNumber),
                Address = Blank(model.Counterparty.Address),
                PhoneNumber = Blank(model.Counterparty.PhoneNumber),
                PostalCode = Blank(model.Counterparty.PostalCode),
                Province = Blank(model.Counterparty.Province),
                City = Blank(model.Counterparty.City),
            },
            Lines = model.Lines.Select(l => new InvoiceDocumentLineDto
            {
                RowNumber = l.RowNumber,
                ProductCode = Blank(l.ProductCode),
                ProductName = l.ProductName,
                Unit = Blank(l.Unit),
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                GrossAmount = l.GrossAmount,
                DiscountAmount = l.DiscountAmount,
                NetAmount = l.NetAmount,
                TaxPercent = l.TaxPercent,
                TaxAmount = l.TaxAmount,
                LineTotal = l.LineTotal,
            }).ToList(),
            SubTotal = model.SubTotal,
            TotalDiscount = model.TotalDiscount,
            TotalTax = model.TotalTax,
            GrandTotal = model.GrandTotal,
            InstallmentChargeAmount = model.InstallmentChargeAmount,
            PayableAmount = model.PayableAmount,
            PaidAmount = model.PaidAmount,
            Balance = model.Balance,
        };

        private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
    }

    /// <summary>The seller (our company) or the counterparty. <see cref="Currency"/> is set on the company only.</summary>
    public class InvoicePartyDto
    {
        public string? Name { get; set; }
        public string? NationalId { get; set; }
        public string? EconomicCode { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? PostalCode { get; set; }
        public string? Province { get; set; }
        public string? City { get; set; }
        public string? Currency { get; set; }
    }

    public class InvoiceDocumentLineDto
    {
        public int RowNumber { get; set; }
        public string? ProductCode { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? Unit { get; set; }
        public int Quantity { get; set; }
        public ulong UnitPrice { get; set; }
        public ulong GrossAmount { get; set; }
        public ulong DiscountAmount { get; set; }
        public ulong NetAmount { get; set; }
        public int TaxPercent { get; set; }
        public ulong TaxAmount { get; set; }
        public ulong LineTotal { get; set; }
    }
}
