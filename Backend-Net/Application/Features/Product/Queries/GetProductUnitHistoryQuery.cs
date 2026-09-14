using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Product.Dtos;
using Application.Features.Product.Mappings;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    // One unit's full story: where it is now, and every movement that got it there - who it came from, who it
    // went to, what came back. The movements come from the append-only ProductUnitMovement ledger, since the unit
    // row itself only keeps its current state.
    public class GetProductUnitHistoryQuery : IRequest<ResponseDto>
    {
        public int? ProductUnitId { get; set; }

        /// <summary>A scanned unit barcode, in any raw format the scanner produces.</summary>
        public string? Barcode { get; set; }
    }

    public class GetProductUnitHistoryQueryValidator : AbstractValidator<GetProductUnitHistoryQuery>
    {
        public GetProductUnitHistoryQueryValidator()
        {
            RuleFor(x => x).Must(x => x.ProductUnitId.HasValue || !string.IsNullOrWhiteSpace(x.Barcode))
                .WithMessage(Validation.RequiredMessage("شناسه یا بارکد دانه"));
        }
    }

    public class GetProductUnitHistoryQueryHandler : IRequestHandler<GetProductUnitHistoryQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;

        public GetProductUnitHistoryQueryHandler(IWMSDbContext context, IProductCodeService productCodeService)
        {
            _context = context;
            _productCodeService = productCodeService;
        }

        public async Task<ResponseDto> Handle(GetProductUnitHistoryQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.ProductUnits.AsNoTracking();

            if (request.ProductUnitId.HasValue)
            {
                query = query.Where(x => x.Id == request.ProductUnitId.Value);
            }
            else
            {
                var payload = _productCodeService.ToPayload(request.Barcode!);
                query = query.Where(x => x.BarcodePayload == payload);
            }

            var unit = await query.SelectDto(_context).FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("دانه‌ی مورد نظر یافت نشد.");

            var movements = await _context.ProductUnitMovements.AsNoTracking()
                .Where(x => x.ProductUnitId == unit.Id)
                .OrderBy(x => x.OccurredAt)
                .ThenBy(x => x.Id)
                .ToListAsync(cancellationToken);

            // Names and numbers are looked up once per kind rather than per movement.
            List<int> IdsOf(DocumentKindEnum kind) => movements.Where(m => m.DocumentKind == kind && m.DocumentId.HasValue).Select(m => m.DocumentId!.Value).Distinct().ToList();

            var purchaseIds = IdsOf(DocumentKindEnum.PURCHASE);
            var saleIds = IdsOf(DocumentKindEnum.SALE);
            var purchaseReturnIds = IdsOf(DocumentKindEnum.PURCHASE_RETURN);
            var saleReturnIds = IdsOf(DocumentKindEnum.SALE_RETURN);
            var customerIds = movements.Where(m => m.CustomerId.HasValue).Select(m => m.CustomerId!.Value).Distinct().ToList();
            var supplierIds = movements.Where(m => m.SupplierId.HasValue).Select(m => m.SupplierId!.Value).Distinct().ToList();
            var userIds = movements.Where(m => m.UserId.HasValue).Select(m => m.UserId!.Value).Distinct().ToList();

            var purchaseNumbers = await _context.Purchases.Where(x => purchaseIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.InvoiceNumber, cancellationToken);
            var saleNumbers = await _context.Sales.Where(x => saleIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.InvoiceNumber, cancellationToken);
            var purchaseReturnNumbers = await _context.PurchaseReturns.Where(x => purchaseReturnIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ReturnNumber, cancellationToken);
            var saleReturnNumbers = await _context.SaleReturns.Where(x => saleReturnIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ReturnNumber, cancellationToken);
            var customerNames = await _context.Customers.Where(x => customerIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.FirstName + " " + x.LastName, cancellationToken);
            var supplierNames = await _context.Suppliers.Where(x => supplierIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.CompanyName, cancellationToken);
            var userNames = await _context.Users.Where(x => userIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.FirstName + " " + x.LastName, cancellationToken);

            string? DocumentNumberOf(Domain.Entities.ProductUnitMovement m)
            {
                if (m.DocumentId is not int id)
                    return null;

                var numbers = m.DocumentKind switch
                {
                    DocumentKindEnum.PURCHASE => purchaseNumbers,
                    DocumentKindEnum.SALE => saleNumbers,
                    DocumentKindEnum.PURCHASE_RETURN => purchaseReturnNumbers,
                    DocumentKindEnum.SALE_RETURN => saleReturnNumbers,
                    _ => null,
                };

                return numbers != null && numbers.TryGetValue(id, out var number) ? number : null;
            }

            res.Data = new ProductUnitHistoryDto
            {
                Unit = unit,
                Movements = movements.Select(m => new ProductUnitMovementDto
                {
                    Id = m.Id,
                    OccurredAt = m.OccurredAt,
                    FromStatus = m.FromStatus,
                    ToStatus = m.ToStatus,
                    Reason = m.Reason,
                    ReasonTitle = m.Reason.GetDescription(),
                    DocumentKind = m.DocumentKind,
                    DocumentId = m.DocumentId,
                    DocumentNumber = DocumentNumberOf(m),
                    PurchaseItemId = m.PurchaseItemId,
                    SaleItemId = m.SaleItemId,
                    CustomerId = m.CustomerId,
                    CustomerName = m.CustomerId is int c && customerNames.TryGetValue(c, out var customerName) ? customerName : null,
                    SupplierId = m.SupplierId,
                    SupplierName = m.SupplierId is int s && supplierNames.TryGetValue(s, out var supplierName) ? supplierName : null,
                    UserId = m.UserId,
                    UserName = m.UserId is int u && userNames.TryGetValue(u, out var userName) ? userName : null,
                    Note = m.Note,
                }).ToList(),
            };
            res.Message = "تاریخچه‌ی دانه با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
