using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// In-person sale, first step: the proforma is written at the counter with the units scanned in front of the customer.
    /// CreateSale, ApproveSaleProforma and CheckSaleWarehouse run back to back inside one transaction, sent through IMediator so
    /// their validators run, and the sale is marked <see cref="Domain.Entities.Sale.IsInPerson"/>. Every line must be fully
    /// scanned - there is no warehouse queue to send a shortage to - and a failure at any step leaves nothing behind. Payment
    /// then follows with CompleteInPersonSale (at once, or later at the cash desk) like for any WAREHOUSE_CHECKED proforma.
    /// </summary>
    [AuditAction(AuditActionEnum.CreateInPersonProforma)]
    public class CreateInPersonProformaCommand : IRequest<ResponseDto>
    {
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }

        /// <summary>The lines, each with the barcodes of exactly <c>Quantity</c> units scanned for it.</summary>
        public List<InPersonProformaItemDto> Items { get; set; } = new();
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class InPersonProformaItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Discount { get; set; }
        public List<string> ProductUnitBarcodes { get; set; } = new();
    }

    public class CreateInPersonProformaCommandValidator : AbstractValidator<CreateInPersonProformaCommand>
    {
        public CreateInPersonProformaCommandValidator()
        {
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductUnitBarcodes).Must((i, b) => (b?.Count ?? 0) == i.Quantity)
                    .WithMessage("در فروش حضوری برای هر قلم به اندازه‌ی تعدادش دانه اسکن می‌شود.");
            });
        }
    }

    public class CreateInPersonProformaCommandHandler : IRequestHandler<CreateInPersonProformaCommand, ResponseDto>
    {
        private readonly IMediator _mediator;
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public CreateInPersonProformaCommandHandler(IMediator mediator, IWMSDbContext context, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _mediator = mediator;
            _context = context;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateInPersonProformaCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleId = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                var created = (CreatedSaleDto)(await _mediator.Send(new CreateSaleCommand
                {
                    InvoiceDate = request.InvoiceDate,
                    PaymentDate = request.PaymentDate,
                    PaymentType = request.PaymentType,
                    Description = request.Description,
                    CustomerId = request.CustomerId,
                    ProductIds = request.Items.Select(i => new CreateSaleItemDto
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        Discount = i.Discount,
                    }).ToList(),
                    Attachments = request.Attachments,
                }, ct)).Data!;

                // The tracked sale CreateSale just added: its Items are in request order, so line i takes the barcodes of item i.
                var sale = await _context.Sales.Include(x => x.Items).FirstAsync(x => x.Id == created.Id, ct);

                await _mediator.Send(new ApproveSaleProformaCommand { SaleId = sale.Id, Revision = sale.Revision }, ct);

                var check = await _mediator.Send(new CheckSaleWarehouseCommand
                {
                    SaleId = sale.Id,
                    Revision = sale.Revision,
                    Lines = sale.Items.Select((line, index) => new CheckSaleWarehouseLineDto
                    {
                        SaleItemId = line.Id,
                        ProductUnitBarcodes = request.Items[index].ProductUnitBarcodes,
                    }).ToList(),
                    Note = "فروش حضوری: کالا جلوی مشتری اسکن و رزرو شد.",
                }, ct);

                if (sale.ProformaStage != SaleProformaStageEnum.WAREHOUSE_CHECKED)
                    throw new ValidationCustomException(check.Message ?? "رزرو کالای فروش حضوری انجام نشد.");

                sale.IsInPerson = true;
                await _unitOfWork.SaveChangesAsync(ct);
                return sale.Id;
            }, cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, saleId, cancellationToken);
            res.Message = "پیش‌فاکتور حضوری ثبت و کالا رزرو شد؛ آماده‌ی پرداخت است.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
