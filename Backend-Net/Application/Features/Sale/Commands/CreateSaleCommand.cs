using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    public class CreateSaleCommand : IRequest<ResponseDto>
    {
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<CreateSaleItemDto> ProductIds { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class CreateSaleCommandValidator : AbstractValidator<CreateSaleCommand>
    {
        public CreateSaleCommandValidator()
        {
            // تا وقتی مشتری پول را کامل نپرداخته، فروش پیش‌فاکتور است و شماره‌ی رسمی ندارد.
            RuleFor(x => x.InvoiceNumber).NotEmpty().When(x => x.Status != SalesStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().When(x => x.Status != SalesStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.ProductIds).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.ProductIds).ChildRules(item =>
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
            // شماره فاکتور در مرحله‌ی پیش‌فاکتور می‌تواند خالی باشد، ولی ستون NOT NULL است.
            sale.InvoiceNumber ??= string.Empty;
            sale.SalesUserId = _userContextService.GetUserId().ToInt();

            // مشتری همان لحظه‌ی ثبت هم می‌تواند کامل پرداخت کرده باشد؛ آن‌وقت دیگر پیش‌فاکتور نمی‌ماند.
            if (sale.Status == SalesStatusEnum.PROFORMA && sale.PaidAmount >= sale.TotalAmount)
            {
                var seq = await _context.Sales.CountAsync(cancellationToken) + 1;
                sale.InvoiceNumber = Generator.GenerateInvoiceNumber(seq);
                sale.InvoiceDate = DateTime.Now;
                sale.Status = SalesStatusEnum.PROCESSING;
            }

            await _context.Sales.AddAsync(sale, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

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

            if (request.Attachments.Count > 0)
                await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "فروش با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
