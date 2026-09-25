using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Common.Sales;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// A sale is always born PROFORMA and leaves it on its first payment, which issues the official invoice number
    /// (SaleInvoiceFinalizer). There is no status to send: nobody chooses to issue an invoice nobody has paid towards.
    /// </summary>
    public class CreateSaleCommand : IRequest<ResponseDto>
    {
        /// <summary>Optional on a proforma; set by the finalizer when the invoice is issued, if still empty.</summary>
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }

        /// <summary>
        /// Payments taken with the order. Optional; always money the customer paid (IN). PaidAmount is their sum - it is
        /// not accepted from the client. Not allowed on an installment sale, whose payments belong to its plan.
        /// </summary>
        public List<PaymentDetailDto> PaymentDetails { get; set; } = new();
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<CreateSaleItemDto> ProductIds { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class CreateSaleCommandValidator : AbstractValidator<CreateSaleCommand>
    {
        public CreateSaleCommandValidator()
        {
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate.HasValue)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.ProductIds).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.ProductIds).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر محصول باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).InclusiveBetween(0, 100).WithMessage("تخفیف باید بین ۰ تا ۱۰۰ درصد باشد.");
            });
            RuleForEach(x => x.PaymentDetails).SetValidator(new PaymentRowValidator());
            // فروش اقساطی: پیش‌پرداخت و اقساط را خود دستورهای قرارداد اقساطی ثبت می‌کنند.
            RuleFor(x => x.PaymentDetails).Must(p => p == null || p.Count == 0)
                .When(x => x.PaymentType == PaymentTypeEnum.INSTALLMENT)
                .WithMessage("پرداخت‌های فروش اقساطی از مسیر قرارداد اقساطی ثبت می‌شوند.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class CreateSaleCommandHandler : IRequestHandler<CreateSaleCommand, ResponseDto>
    {
        private readonly IMapper _mapper;
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserContextService _userContextService;

        public CreateSaleCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork, IMapper mapper, IUserContextService userContextService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(CreateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = _mapper.Map<Domain.Entities.Sale>(request);

            sale.InvoiceNumber ??= string.Empty;
            sale.SalesUserId = _userContextService.GetUserId().ToInt();

            // مبالغ هر قلم (با مالیاتِ کالا) و جمع فاکتور را سرور حساب می‌کند؛ جمعی از کلاینت گرفته نمی‌شود.
            var products = await DocumentProducts.LoadAsync(_context, sale.Items.Select(i => i.ProductId), cancellationToken);
            foreach (var item in sale.Items)
                InvoiceLineMath.Stamp(item, products[item.ProductId]);
            sale.TotalAmount = InvoiceLineMath.DocumentTotal(sale.Items);

            sale.PaymentDetails ??= new();
            foreach (var payment in sale.PaymentDetails)
            {
                payment.Direction = DocumentPayments.SaleDirection;
                payment.Purpose = PaymentPurposeEnum.NORMAL;
                if (payment.PaidAt == default)
                    payment.PaidAt = DateTime.Now;
            }
            sale.PaidAmount = DocumentPayments.NetPaid(sale.PaymentDetails, DocumentPayments.SaleDirection);
            foreach (var payment in sale.PaymentDetails)
                await PartyLedger.SalePaymentAsync(_context, sale, payment, cancellationToken);

            // پیش‌فاکتور یعنی فروشی که هنوز هیچ پولی بابتش جابه‌جا نشده؛ اولین ریال آن را نهایی می‌کند. فروش اقساطی
            // اینجا پرداختی ندارد و با ثبت قرارداد و پیش‌پرداخت (CreateSaleInstallmentPlan) نهایی می‌شود.
            if (sale.PaidAmount > 0)
                await SaleInvoiceFinalizer.FinalizeAsync(_context, sale, cancellationToken);

            await _context.Sales.AddAsync(sale, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (request.Attachments.Count > 0)
            {
                await DocumentAttachmentWriter.AddAsync(_context, _objectStorageService, DocumentKindEnum.SALE, sale.Id, request.Attachments, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            res.Data = new CreatedSaleDto { Id = sale.Id, InvoiceNumber = sale.InvoiceNumber, Status = sale.Status };
            res.Message = "فروش با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
