using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    // In-person sale: the customer pays in full and leaves with the goods. One atomic command that composes the three
    // existing steps - CreateSale (which issues the invoice number/date once fully paid), ShipSale (stock + scanned units
    // out) and the final DELIVERED status - so a failure at any step leaves no half-finished sale behind.
    public class CreateInPersonSaleCommand : IRequest<ResponseDto>
    {
        public CreateSaleCommand Sale { get; set; } = null!;
        public List<InPersonScannedItemDto> ScannedItems { get; set; } = new();
        public string? ShippingNote { get; set; }
    }

    public class InPersonScannedItemDto
    {
        public int ProductId { get; set; }
        public List<string> ProductUnitBarcodes { get; set; } = new();
    }

    public class CreateInPersonSaleCommandValidator : AbstractValidator<CreateInPersonSaleCommand>
    {
        public CreateInPersonSaleCommandValidator()
        {
            RuleFor(x => x.Sale).NotNull().WithMessage("اطلاعات فروش الزامی است.");
            RuleFor(x => x.Sale.PaidAmount).GreaterThanOrEqualTo(x => x.Sale.TotalAmount)
                .When(x => x.Sale != null)
                .WithMessage("در تحویل حضوری پرداخت باید کامل باشد.");
            RuleForEach(x => x.ScannedItems).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("محصول اسکن‌شده نامعتبر است.");
                item.RuleFor(i => i.ProductUnitBarcodes).NotEmpty().WithMessage("بارکد دانه‌ها الزامی است.");
            });
        }
    }

    public class CreateInPersonSaleCommandHandler : IRequestHandler<CreateInPersonSaleCommand, ResponseDto>
    {
        private readonly IMediator _mediator;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CreateInPersonSaleCommandHandler(IMediator mediator, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _mediator = mediator;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateInPersonSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Created as a proforma with full payment: CreateSale itself issues the official invoice number and date.
            request.Sale.Status = SalesStatusEnum.PROFORMA;

            res.Data = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                var created = (await _mediator.Send(request.Sale, ct)).Data as CreatedSaleDto
                    ?? throw new InternalServerErrorCustomException("شناسه‌ی فروش ثبت‌شده در دسترس نیست.");

                var sale = await _context.Sales.Include(x => x.Items).FirstAsync(x => x.Id == created.Id, ct);

                // Scanned barcodes are pooled per product and handed to that product's lines in order.
                var pools = request.ScannedItems
                    .GroupBy(x => x.ProductId)
                    .ToDictionary(g => g.Key, g => new Queue<string>(g.SelectMany(x => x.ProductUnitBarcodes)));

                var shipItems = new List<ShipSaleItemDto>();
                foreach (var line in sale.Items)
                {
                    List<string>? barcodes = null;
                    if (pools.TryGetValue(line.ProductId, out var pool))
                    {
                        if (pool.Count < line.Quantity)
                            throw new ValidationCustomException("تعداد بارکدهای اسکن‌شده با تعداد اقلام فروش برابر نیست.");
                        barcodes = Enumerable.Range(0, line.Quantity).Select(_ => pool.Dequeue()).ToList();
                    }

                    shipItems.Add(new ShipSaleItemDto { SaleItemId = line.Id, ShippedQuantity = line.Quantity, ProductUnitBarcodes = barcodes });
                }

                if (pools.Values.Any(p => p.Count > 0))
                    throw new ValidationCustomException("تعداد بارکدهای اسکن‌شده از تعداد اقلام فروش بیشتر است.");

                await _mediator.Send(new ShipSaleCommand
                {
                    SaleId = sale.Id,
                    ShippingNote = request.ShippingNote ?? "تحویل حضوری به مشتری",
                    Items = shipItems,
                }, ct);

                sale.Status = SalesStatusEnum.DELIVERED;
                sale.UpdatedAt = DateTime.Now;
                await _unitOfWork.SaveChangesAsync(ct);

                return new CreatedSaleDto { Id = sale.Id, InvoiceNumber = sale.InvoiceNumber, Status = sale.Status };
            }, cancellationToken);

            res.Message = "فروش حضوری با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
