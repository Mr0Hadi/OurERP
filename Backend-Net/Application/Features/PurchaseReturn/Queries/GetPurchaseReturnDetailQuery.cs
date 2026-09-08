using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries
{
    public class GetPurchaseReturnDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPurchaseReturnDetailQueryHandler : IRequestHandler<GetPurchaseReturnDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnQueryService _purchaseReturnQueryService;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IObjectStorageService _objectStorageService;

        public GetPurchaseReturnDetailQueryHandler(IWMSDbContext context, IPurchaseReturnQueryService purchaseReturnQueryService, IPurchaseReturnCalculationService purchaseReturnCalculationService, IObjectStorageService objectStorageService)
        {
            _context = context;
            _purchaseReturnQueryService = purchaseReturnQueryService;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _purchaseReturnQueryService
                .WithReturnGraph(_purchaseReturnQueryService.WhereNotDeleted(_context.PurchaseReturns).Where(x => x.Id == request.Id))
                .Include(x => x.Purchase)
                    .ThenInclude(x => x.Supplier)
                .Include(x => x.ReceivingImages)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var untouched = _purchaseReturnCalculationService.IsUntouched(purchaseReturn);
            var totalAmount = (UInt64)purchaseReturn.Claims.Sum(c => (long)c.Quantity * (long)c.UnitPrice);

            // The related return is a plain FK on the entity; resolve its number here so the
            // client can name it without a second round-trip.
            var previousReturnNumber = purchaseReturn.PreviousReturnId == null
                ? null
                : await _context.PurchaseReturns
                    .Where(x => x.Id == purchaseReturn.PreviousReturnId.Value)
                    .Select(x => x.ReturnNumber)
                    .FirstOrDefaultAsync(cancellationToken);

            res.Data = new PurchaseReturnDetailDto
            {
                Id = purchaseReturn.Id,
                ReturnNumber = purchaseReturn.ReturnNumber,
                ReturnDate = purchaseReturn.ReturnDate,
                PurchaseId = purchaseReturn.PurchaseId,
                PurchaseInvoiceNumber = purchaseReturn.Purchase!.InvoiceNumber,
                SupplierId = purchaseReturn.Purchase.SupplierId,
                SupplierName = purchaseReturn.Purchase.Supplier.CompanyName,
                Description = purchaseReturn.Description,
                PreviousReturnId = purchaseReturn.PreviousReturnId,
                PreviousReturnNumber = previousReturnNumber,
                Status = purchaseReturn.Status,
                TotalAmount = totalAmount,
                Quantity = purchaseReturn.Quantity,
                DecidedQuantity = purchaseReturn.DecidedQuantity,
                RemainingQuantity = purchaseReturn.RemainingQuantity,
                CanDelete = !_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status) && untouched,
                CanCancel = !_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status) && untouched,
                CanReject = !_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status) && untouched,
                CanReopen = purchaseReturn.Status == Domain.Enums.ReturnStatusEnum.REJECTED,
                ReceivingImages = purchaseReturn.ReceivingImages
                    .OrderBy(img => img.CreatedAt)
                    .Select(img => new PurchaseReceivingImageDto
                    {
                        Id = img.Id,
                        PurchaseId = img.PurchaseId,
                        PurchaseReturnId = img.PurchaseReturnId,
                        ObjectKey = img.ObjectKey,
                        Url = _objectStorageService.GetFixedUrl(img.ObjectKey),
                        FileName = img.FileName,
                        Note = img.Note,
                        UploadedAt = img.CreatedAt,
                    }).ToList(),
                Claims = purchaseReturn.Claims.Select(c => new PurchaseReturnClaimDto
                {
                    Id = c.Id,
                    Scope = c.Scope,
                    OffScopeKind = c.OffScopeKind,
                    PurchaseItemId = c.PurchaseItemId,
                    ProductId = c.ProductId,
                    ProductCode = c.Product!.Code,
                    ProductName = c.Product.Name,
                    Unit = c.Product.Unit.GetDescription(),
                    UnitPrice = c.UnitPrice,
                    Quantity = c.Quantity,
                    Problem = c.Problem,
                    Note = c.Note,
                    DecidedQuantity = c.DecidedQuantity,
                    RemainingQuantity = c.RemainingQuantity,
                    Resolutions = c.Resolutions.Select(r => new PurchaseReturnResolutionDto
                    {
                        Id = r.Id,
                        Quantity = r.Quantity,
                        Note = r.Note,
                        DecidedAt = r.CreatedAt,
                        Effects = r.Effects.Select(e => new PurchaseReturnEffectDto
                        {
                            Id = e.Id,
                            Direction = e.Direction,
                            Quantity = e.Quantity,
                            AppliedQuantity = e.AppliedQuantity,
                            RemainingQuantity = e.RemainingQuantity,
                            RestockedQuantity = e.RestockedQuantity,
                            ProductId = e.ProductId,
                            ProductName = e.Product != null ? e.Product.Name : null,
                            Amount = e.Amount,
                            Method = e.Method,
                            Reference = e.Reference,
                            Note = e.Note,
                            Status = e.Status,
                            AppliedAt = e.AppliedAt,
                            MoneyParts = e.MoneyParts.Select(p => new PurchaseReturnEffectMoneyPartDto
                            {
                                Id = p.Id,
                                Method = p.Method,
                                Amount = p.Amount,
                                CheckNumber = p.CheckNumber,
                                TransferRef = p.TransferRef,
                            }).ToList(),
                            History = e.History.Select(h => new PurchaseReturnEffectRoundDto
                            {
                                Id = h.Id,
                                Date = h.Date,
                                Quantity = h.Quantity,
                                HealthyQuantity = h.HealthyQuantity,
                                PartyName = h.PartyName,
                                PartyNationalId = h.PartyNationalId,
                                VehiclePlate = h.VehiclePlate,
                                Note = h.Note,
                                Observations = h.Observations.Select(o => new PurchaseReturnEffectObservationDto
                                {
                                    Id = o.Id,
                                    Problem = o.Problem,
                                    Quantity = o.Quantity,
                                    Note = o.Note,
                                }).ToList(),
                            }).ToList(),
                        }).ToList(),
                    }).ToList(),
                }).ToList(),
            };

            res.Message = "اطلاعات مرجوعی با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
