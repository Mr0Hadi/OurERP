using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Edits a sale that is still a PROFORMA - every field and the line items. Refused once the sale has left PROFORMA
    /// (its first payment issued the invoice; DocumentLockRules). There is no status here: a sale leaves PROFORMA only
    /// through a payment (AddSalePayment) or an installment plan's down payment. Payments, status, attachments and the
    /// due date have their own commands, which stay open after the invoice is issued.
    /// </summary>
    public class UpdateSaleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<UpdateSaleItemDto> Items { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdateSaleCommandValidator : AbstractValidator<UpdateSaleCommand>
    {
        public UpdateSaleCommandValidator()
        {
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate.HasValue)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.Items).ChildRules(item =>
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

    public class UpdateSaleCommandHandler : IRequestHandler<UpdateSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleInstallmentPlanRepository _installmentPlanRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public UpdateSaleCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, ISaleInstallmentPlanRepository installmentPlanRepository, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _installmentPlanRepository = installmentPlanRepository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<ResponseDto> Handle(UpdateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            DocumentLockRules.EnsureDraft(sale.Status);

            var hasUnknownItems = request.Items.Where(x => x.Id != 0).Select(x => x.Id).Except(sale.Items.Select(x => x.Id)).Any();
            if (hasUnknownItems)
                throw new NotFoundCustomException("ردیف کالای مورد نظر در این فروش یافت نشد.");

            // A proforma may already carry an installment plan with no down payment yet. The sale cannot stop being an
            // installment sale while the plan exists, and its total cannot move away from the plan's principal (checked below).
            var installmentPlan = await _installmentPlanRepository.GetActiveBySaleIdAsync(sale.Id, cancellationToken);
            if (installmentPlan != null && request.PaymentType != PaymentTypeEnum.INSTALLMENT)
                throw new ValidationCustomException("این فروش قرارداد اقساطی دارد؛ برای تغییر روش پرداخت ابتدا قرارداد را حذف کنید.");

            var products = await DocumentProducts.LoadAsync(_context, request.Items.Select(i => i.ProductId), cancellationToken);

            sale.InvoiceDate = request.InvoiceDate;
            sale.PaymentDate = request.PaymentDate;
            sale.PaymentType = request.PaymentType;
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

            // A draft is recalculated on every save, the tax re-read from the product; once issued the snapshot is fixed.
            foreach (var line in sale.Items)
                InvoiceLineMath.Stamp(line, products[line.ProductId]);
            sale.TotalAmount = InvoiceLineMath.DocumentTotal(sale.Items);

            if (installmentPlan != null && sale.TotalAmount != installmentPlan.CashAmount)
                throw new ValidationCustomException("این پیش‌فاکتور قرارداد اقساطی دارد و جمع آن نمی‌تواند عوض شود؛ برای تغییر اقلام ابتدا قرارداد را حذف کنید.");

            await DocumentAttachmentWriter.ReplaceAsync(_context, _objectStorageService, DocumentKindEnum.SALE, sale.Id, request.Attachments, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, sale.Id, cancellationToken);
            res.Message = "فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
