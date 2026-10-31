using Application.Common.Contracts.Documents;
using Application.Common.Documents;
using Application.Features.Invoice.Dtos;

namespace WMS.Tests.Unit
{
    /// <summary>The notes of a printed document (one list for the official template's notes cell and the print-data endpoints).</summary>
    public class InvoiceDocumentNotesTests
    {
        [Fact]
        public void Notes_AreChargeThenDueDateThenTheDocumentsOwn_WithoutTheDescription()
        {
            var model = new InvoiceDocumentModel
            {
                InstallmentChargeAmount = 1_200_000,
                PayableAmount = 11_200_000,
                PaymentDueDate = new DateTime(2026, 11, 20),
                Description = "توضیح سند",
                Notes = new() { "مرجوعی فاکتور خرید شماره ۷", " " },
            };

            var notes = InvoiceDocumentNotes.For(model);

            Assert.Equal(3, notes.Count);
            Assert.StartsWith("سود اقساط: ۱٬۲۰۰٬۰۰۰", notes[0].Replace(",", "٬"));
            Assert.StartsWith("مهلت پرداخت: ", notes[1]);
            Assert.Equal("مرجوعی فاکتور خرید شماره ۷", notes[2]);
            Assert.DoesNotContain("توضیح سند", notes);
        }

        [Fact]
        public void Notes_OfAPlainInvoice_AreEmpty()
        {
            Assert.Empty(InvoiceDocumentNotes.For(new InvoiceDocumentModel()));
        }

        [Fact]
        public void Dto_SendsNullForMissingText_NeverAnEmptyString()
        {
            var dto = InvoiceDocumentDto.From(new InvoiceDocumentModel
            {
                Title = "فاکتور فروش",
                DocumentNumber = "",
                Company = new CompanyInfo { Name = "شرکت", EconomicCode = "  " },
                Counterparty = new PartyInfo { Name = "علی", Address = "" },
                Lines = new() { new InvoiceLineModel { ProductName = "لنت", ProductCode = "" } },
            });

            Assert.Null(dto.DocumentNumber);
            Assert.Null(dto.StatusText);
            Assert.Null(dto.Company.EconomicCode);
            Assert.Null(dto.Counterparty.Address);
            Assert.Null(dto.Lines.Single().ProductCode);
            Assert.Equal("عدد", dto.Lines.Single().Unit);
            Assert.Equal("ریال", dto.Company.Currency);
        }
    }
}
