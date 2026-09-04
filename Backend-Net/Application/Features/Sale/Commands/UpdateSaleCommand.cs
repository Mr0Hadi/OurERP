using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    public class UpdateSaleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<UpdateSaleItemDto> Items { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdateSaleCommandValidator : AbstractValidator<UpdateSaleCommand>
    {
        public UpdateSaleCommandValidator()
        {
            // تا وقتی مشتری پول را کامل نپرداخته، فروش پیش‌فاکتور است و شماره‌ی رسمی ندارد.
            RuleFor(x => x.InvoiceNumber).NotEmpty().When(x => x.Status != SalesStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            // تاریخ فاکتور فقط در پیش‌فاکتور می‌تواند null بماند؛ در بقیه‌ی وضعیت‌ها الزامی است.
            RuleFor(x => x.InvoiceDate).Must(d => d.HasValue && d.Value != default)
                .When(x => x.Status != SalesStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate.HasValue)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر محصول باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).GreaterThanOrEqualTo(0).WithMessage("تخفیف باید بیشتر یا مساوی صفر باشد.");
            });
            RuleFor(x => x.PaymentDetails).NotEmpty().When(x => x.PaymentType != PaymentTypeEnum.CASH)
                .WithMessage("اطلاعات پرداخت باید به طول کامل پر شود.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class UpdateSaleCommandHandler : IRequestHandler<UpdateSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public UpdateSaleCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<ResponseDto> Handle(UpdateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Include(x => x.Items).Where(x => x.Id == request.Id).FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            var hasUnknownItems = request.Items.Where(x => x.Id != 0).Select(x => x.Id).Except(sale.Items.Select(x => x.Id)).Any();
            if (hasUnknownItems)
                throw new NotFoundCustomException("ردیف کالای مورد نظر در این فروش یافت نشد.");

            // خروج از «پیش‌فاکتور» فقط با پرداخت کامل ممکن است؛ فاکتور رسمی هم خودکار ساخته می‌شود.
            if (sale.Status == SalesStatusEnum.PROFORMA)
            {
                var fullyPaid = request.PaidAmount >= request.TotalAmount;
                if (!fullyPaid && request.Status != SalesStatusEnum.PROFORMA)
                    throw new ValidationCustomException("تا پرداخت کامل نشود، فروش از حالت پیش‌فاکتور خارج نمی‌شود.");

                if (fullyPaid)
                {
                    if (string.IsNullOrWhiteSpace(request.InvoiceNumber))
                    {
                        var seq = await _context.Sales.CountAsync(cancellationToken) + 1;
                        request.InvoiceNumber = Generator.GenerateInvoiceNumber(seq);
                        request.InvoiceDate = DateTime.Now;
                    }
                    if (request.Status == SalesStatusEnum.PROFORMA)
                        request.Status = SalesStatusEnum.PROCESSING;
                }
            }

            sale.InvoiceNumber = request.InvoiceNumber ?? string.Empty;
            sale.InvoiceDate = request.InvoiceDate;
            sale.PaymentDate = request.PaymentDate;
            sale.Status = request.Status;
            sale.PaymentType = request.PaymentType;
            sale.TotalAmount = request.TotalAmount;
            sale.PaidAmount = request.PaidAmount;
            sale.Description = request.Description;
            sale.CustomerId = request.CustomerId;
            sale.UpdatedAt = DateTime.Now;

            foreach (var existing in sale.Items.ToList())
            {
                var incoming = request.Items.FirstOrDefault(x => x.Id == existing.Id);
                if (incoming == null)
                {
                    sale.Items.Remove(existing);
                    continue;
                }

                existing.ProductId = incoming.ProductId;
                existing.Quantity = incoming.Quantity;
                existing.UnitPrice = incoming.UnitPrice;
                existing.Discount = incoming.Discount;
            }

            foreach (var incoming in request.Items.Where(x => x.Id == 0))
                sale.Items.Add(_mapper.Map<Domain.Entities.SaleItem>(incoming));

            _context.Sales.Update(sale);

            // ضمیمه‌ها به‌طور کامل جایگزین می‌شوند، نه اضافه - فرانت همیشه فهرست نهایی را می‌فرستد.
            var existingAttachments = await _context.DocumentAttachments
                .Where(a => a.DocumentKind == DocumentKindEnum.SALE && a.DocumentId == sale.Id)
                .ToListAsync(cancellationToken);
            _context.DocumentAttachments.RemoveRange(existingAttachments);

            foreach (var attachment in request.Attachments)
            {
                await _context.DocumentAttachments.AddAsync(new Domain.Entities.DocumentAttachment
                {
                    DocumentKind = DocumentKindEnum.SALE,
                    DocumentId = sale.Id,
                    ObjectKey = _objectStorageService.NormalizeKey(attachment.ObjectKey) ?? attachment.ObjectKey,
                    FileName = attachment.FileName,
                    Note = attachment.Note,
                    CreatedAt = DateTime.Now,
                }, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
