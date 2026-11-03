using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Warehouses;

using Application.Features.Stocktaking.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>
    /// Opens a stocktake (انبارگردانی): picks the products in scope - the listed ones, or every active product of a category
    /// and/or brand, or those with stock on shelves starting with a bin prefix - and snapshots what is on the warehouse's shelf
    /// for each right now. The shop keeps selling and receiving meanwhile; the snapshot is what the count is compared with.
    /// The warehouse is the default one unless multi-warehouse is on. Refused while another open stocktake of the same warehouse
    /// covers one of the same products (two counts would correct the same stock twice).
    /// </summary>
    [AuditAction(AuditActionEnum.CreateStocktake)]
    public class CreateStocktakeCommand : IRequest<ResponseDto>
    {
        public string Title { get; set; } = string.Empty;
        public int? WarehouseId { get; set; }
        public int? ProductCategoryId { get; set; }
        public string? Brand { get; set; }
        public string? BinLocationPrefix { get; set; }
        public List<int>? ProductIds { get; set; }
        public string? Note { get; set; }
    }

    public class CreateStocktakeCommandValidator : AbstractValidator<CreateStocktakeCommand>
    {
        public CreateStocktakeCommandValidator()
        {
            RuleFor(x => x.Title).Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("عنوان انبارگردانی را بنویسید.");
            RuleFor(x => x.Title).MaximumLength(200).WithMessage("عنوان حداکثر ۲۰۰ نویسه است.");
            RuleFor(x => x.Brand).MaximumLength(100).WithMessage("برند حداکثر ۱۰۰ نویسه است.");
            RuleFor(x => x.BinLocationPrefix).MaximumLength(50).WithMessage("پیشوند قفسه حداکثر ۵۰ نویسه است.");
            RuleFor(x => x.Note).MaximumLength(1000).WithMessage("یادداشت حداکثر ۱۰۰۰ نویسه است.");
        }
    }

    public class CreateStocktakeCommandHandler : IRequestHandler<CreateStocktakeCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public CreateStocktakeCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateStocktakeCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var warehouseId = await WarehouseScope.ResolveAsync(_context, request.WarehouseId, cancellationToken)
                ?? await _productUnitService.DefaultWarehouseIdAsync(cancellationToken);
            var binPrefix = BinLocations.Normalize(request.BinLocationPrefix);
            var brand = string.IsNullOrWhiteSpace(request.Brand) ? null : request.Brand.Trim();

            var products = _context.Products.Where(x => x.IsActive);
            if (request.ProductIds is { Count: > 0 })
                products = products.Where(x => request.ProductIds.Contains(x.Id));
            if (request.ProductCategoryId.HasValue)
                products = products.Where(x => x.ProductCategoryId == request.ProductCategoryId);
            if (brand != null)
                products = products.Where(x => x.Brand == brand);
            if (binPrefix != null)
                products = products.Where(x => _context.ProductUnits.Any(u => u.ProductId == x.Id && u.WarehouseId == warehouseId
                    && u.Status == ProductUnitStatusEnum.IN_STOCK && u.BinLocation != null && u.BinLocation.StartsWith(binPrefix)));
            var productIds = await products.Select(x => x.Id).ToListAsync(cancellationToken);
            if (productIds.Count == 0)
                throw new ValidationCustomException("هیچ کالایی در دامنه‌ی این انبارگردانی نیست.");

            var overlapping = await _context.StocktakeLines.AnyAsync(l => productIds.Contains(l.ProductId) && l.Stocktake.WarehouseId == warehouseId
                && (l.Stocktake.Status == StocktakeStatusEnum.COUNTING || l.Stocktake.Status == StocktakeStatusEnum.SUBMITTED), cancellationToken);
            if (overlapping)
                throw new ValidationCustomException("انبارگردانی باز دیگری در همین انبار بعضی از همین کالاها را می‌شمارد؛ اول آن را تمام یا لغو کنید.");

            var units = await _context.ProductUnits.AsNoTracking()
                .Where(u => productIds.Contains(u.ProductId) && u.WarehouseId == warehouseId && u.Status == ProductUnitStatusEnum.IN_STOCK)
                .Where(u => binPrefix == null || (u.BinLocation != null && u.BinLocation.StartsWith(binPrefix)))
                .Select(u => new { u.Id, u.ProductId })
                .ToListAsync(cancellationToken);
            var perProduct = units.GroupBy(u => u.ProductId).ToDictionary(g => g.Key, g => g.Count());

            var now = DateTime.Now;
            var stocktake = new Stocktake
            {
                Number = $"STK-{now.Year}-{await _context.NextDocumentNumberAsync(Application.Common.Documents.DocumentNumbers.StocktakeKey, cancellationToken):D4}",
                Title = request.Title.Trim(),
                WarehouseId = warehouseId,
                ProductCategoryId = request.ProductCategoryId,
                Brand = brand,
                BinLocationPrefix = binPrefix,
                Status = StocktakeStatusEnum.COUNTING,
                SnapshotAt = now,
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                CreatedAt = now,
                CreatedByUserId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null,
                Lines = productIds.Select(p => new StocktakeLine { ProductId = p, SystemQuantity = perProduct.GetValueOrDefault(p) }).ToList(),
                SnapshotUnits = units.Select(u => new StocktakeSnapshotUnit { ProductUnitId = u.Id, ProductId = u.ProductId }).ToList(),
            };
            await _context.Stocktakes.AddAsync(stocktake, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "انبارگردانی ایجاد شد؛ شمارش را شروع کنید.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
