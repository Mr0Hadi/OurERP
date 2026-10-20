using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Warehouses;
using Application.Features.Warehousing.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>
    /// Sends stock from one warehouse to another (حواله‌ی بین انبار) - dispatched at once: the units leave the source shelf
    /// (IN_TRANSIT, out of Product.Stock) until ReceiveStockTransfer puts them on the destination's. Units are the scanned ones
    /// (required for a product with RequiresUnitTracking) or the oldest on the source shelf. No cost-ledger row: the goods stay ours.
    /// Only while the Warehouse.MultiWarehouseEnabled setting is on.
    /// </summary>
    [AuditAction(AuditActionEnum.CreateStockTransfer)]
    public class CreateStockTransferCommand : IRequest<ResponseDto>
    {
        public int FromWarehouseId { get; set; }
        public int ToWarehouseId { get; set; }
        public List<StockTransferLineInput> Lines { get; set; } = new();
        public string? Description { get; set; }
    }

    public class StockTransferLineInput
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }

        /// <summary>The exact units sent; empty = the oldest ones on the source shelf.</summary>
        public List<string>? ProductUnitBarcodes { get; set; }
    }

    public class CreateStockTransferCommandValidator : AbstractValidator<CreateStockTransferCommand>
    {
        public CreateStockTransferCommandValidator()
        {
            RuleFor(x => x.FromWarehouseId).GreaterThan(0).WithMessage("انبار مبدأ را انتخاب کنید.");
            RuleFor(x => x.ToWarehouseId).GreaterThan(0).WithMessage("انبار مقصد را انتخاب کنید.");
            RuleFor(x => x.ToWarehouseId).NotEqual(x => x.FromWarehouseId).WithMessage("انبار مبدأ و مقصد نمی‌توانند یکی باشند.");
            RuleFor(x => x.Lines).NotEmpty().WithMessage("هیچ کالایی در حواله نیست.");
            RuleFor(x => x.Lines).Must(l => l.Select(i => i.ProductId).Distinct().Count() == l.Count).WithMessage("هر کالا فقط یک‌بار در حواله می‌آید.");
            RuleForEach(x => x.Lines).ChildRules(l =>
            {
                l.RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("تعداد هر ردیف باید از صفر بیشتر باشد.");
                l.RuleFor(x => x).Must(x => x.ProductUnitBarcodes == null || x.ProductUnitBarcodes.Count == 0 || x.ProductUnitBarcodes.Count == x.Quantity)
                    .WithMessage("تعداد بارکدهای اسکن‌شده با تعداد ردیف یکی نیست.");
            });
            RuleFor(x => x.Description).MaximumLength(500).WithMessage("توضیح حداکثر ۵۰۰ نویسه است.");
        }
    }

    public class CreateStockTransferCommandHandler : IRequestHandler<CreateStockTransferCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public CreateStockTransferCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateStockTransferCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await WarehouseScope.EnsureEnabledAsync(_context, cancellationToken);
            var active = await _context.Warehouses.CountAsync(x => (x.Id == request.FromWarehouseId || x.Id == request.ToWarehouseId) && x.IsActive, cancellationToken);
            if (active != 2)
                throw new ValidationCustomException("انبار مبدأ یا مقصد یافت نشد یا غیرفعال است.");

            var productIds = request.Lines.Select(x => x.ProductId).ToList();
            var products = await _context.Products.Where(x => productIds.Contains(x.Id) && x.IsActive).ToDictionaryAsync(x => x.Id, cancellationToken);
            if (products.Count != productIds.Count)
                throw new NotFoundCustomException("کالای حواله یافت نشد.");

            var now = DateTime.Now;
            var transfer = new StockTransfer
            {
                TransferNumber = await NextNumberAsync(cancellationToken),
                FromWarehouseId = request.FromWarehouseId,
                ToWarehouseId = request.ToWarehouseId,
                Status = StockTransferStatusEnum.IN_TRANSIT,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                DispatchedAt = now,
                DispatchedByUserId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null,
                CreatedAt = now,
            };
            await _context.StockTransfers.AddAsync(transfer, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var movement = new UnitMovementContext(ProductUnitMovementReasonEnum.STOCK_TRANSFER_DISPATCHED, now, Note: transfer.TransferNumber);
            foreach (var line in request.Lines)
            {
                var product = products[line.ProductId];
                if (product.RequiresUnitTracking && (line.ProductUnitBarcodes == null || line.ProductUnitBarcodes.Count == 0))
                    throw new ValidationCustomException($"کالای «{product.Name}» ردیابی دانه‌ای دارد؛ بارکد دانه‌ها را اسکن کنید.");

                var units = await _productUnitService.DispatchToTransferAsync(product, line.Quantity, request.FromWarehouseId, line.ProductUnitBarcodes, movement, cancellationToken);
                product.Stock -= units.Count;
                transfer.Units.AddRange(units.Select(u => new StockTransferUnit { ProductUnit = u, ProductId = product.Id }));
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StockTransferReader.ReadAsync(_context, transfer.Id, cancellationToken);
            res.Message = "حواله‌ی بین انبار ثبت و ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        private async Task<string> NextNumberAsync(CancellationToken cancellationToken)
        {
            var seq = await _context.StockTransfers.CountAsync(cancellationToken) + 1;
            return $"ST-{DateTime.Now.Year}-{seq:D4}";
        }
    }
}
