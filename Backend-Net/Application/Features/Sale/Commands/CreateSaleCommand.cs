using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Application.Common.Audit;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// A sale is always born a PROFORMA in DRAFT (docs/proforma-approval-pipeline.md): written against the stock we have, then
    /// approved by the customer (ApproveSaleProforma) and checked and reserved by the warehouse (CheckSaleWarehouse). Only then
    /// may the customer pay, and the first payment issues the official invoice number (SaleInvoiceFinalizer). So no payment is
    /// taken here, and a line asking for more than the free stock (Product.Stock) is refused.
    /// </summary>
    [AuditAction(AuditActionEnum.CreateSale)]
    public class CreateSaleCommand : IRequest<ResponseDto>
    {
        /// <summary>Optional on a proforma; set by the finalizer when the invoice is issued, if still empty.</summary>
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }

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

            SaleProformaPipeline.EnsureFreeStock(products, sale.Items.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity)));

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
