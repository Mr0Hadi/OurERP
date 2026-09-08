using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries
{
    public class GetSaleReturnDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSaleReturnDetailQueryHandler : IRequestHandler<GetSaleReturnDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;

        public GetSaleReturnDetailQueryHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
        }

        public async Task<ResponseDto> Handle(GetSaleReturnDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_saleReturnQueryService.WhereNotDeleted(_context.SaleReturns))
                .Include(x => x.Sale!)
                    .ThenInclude(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            var untouched = _saleReturnCalculationService.IsUntouched(saleReturn);
            var totalAmount = (UInt64)saleReturn.Claims.Sum(c => (long)c.Quantity * (long)c.UnitPrice);

            // The related return is a plain FK on the entity; resolve its number here so the
            // client can name it without a second round-trip.
            var previousReturnNumber = saleReturn.PreviousReturnId == null
                ? null
                : await _context.SaleReturns
                    .Where(x => x.Id == saleReturn.PreviousReturnId.Value)
                    .Select(x => x.ReturnNumber)
                    .FirstOrDefaultAsync(cancellationToken);

            res.Data = new SaleReturnDetailDto
            {
                Id = saleReturn.Id,
                ReturnNumber = saleReturn.ReturnNumber,
                ReturnDate = saleReturn.ReturnDate,
                SaleId = saleReturn.SaleId,
                SaleInvoiceNumber = saleReturn.Sale!.InvoiceNumber,
                CustomerId = saleReturn.Sale!.CustomerId,
                CustomerName = saleReturn.Sale!.Customer.FirstName + " " + saleReturn.Sale!.Customer.LastName,
                Description = saleReturn.Description,
                PreviousReturnId = saleReturn.PreviousReturnId,
                PreviousReturnNumber = previousReturnNumber,
                Status = saleReturn.Status,
                TotalAmount = totalAmount,
                ClaimedQuantity = saleReturn.ClaimedQuantity,
                DecidedQuantity = saleReturn.DecidedQuantity,
                RemainingQuantity = saleReturn.RemainingQuantity,
                CanDelete = !_saleReturnCalculationService.IsTerminal(saleReturn.Status) && untouched,
                CanCancel = !_saleReturnCalculationService.IsTerminal(saleReturn.Status) && untouched,
                CanReject = !_saleReturnCalculationService.IsTerminal(saleReturn.Status) && untouched,
                CanReopen = saleReturn.Status == Domain.Enums.ReturnStatusEnum.REJECTED,
                Claims = saleReturn.Claims.Select(c => new SaleReturnClaimDto
                {
                    Id = c.Id,
                    Scope = c.Scope,
                    OffScopeKind = c.OffScopeKind,
                    SaleItemId = c.SaleItemId,
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
                    Resolutions = c.Resolutions.Select(r => new SaleReturnResolutionDto
                    {
                        Id = r.Id,
                        Quantity = r.Quantity,
                        Note = r.Note,
                        DecidedAt = r.CreatedAt,
                        Effects = r.Effects.Select(e => new SaleReturnEffectDto
                        {
                            Id = e.Id,
                            Direction = e.Direction,
                            Quantity = e.Quantity,
                            DoneQuantity = e.DoneQuantity,
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
                            MoneyParts = e.MoneyParts.Select(p => new SaleReturnEffectMoneyPartDto
                            {
                                Id = p.Id,
                                Method = p.Method,
                                Amount = p.Amount,
                                CheckNumber = p.CheckNumber,
                                TransferRef = p.TransferRef,
                            }).ToList(),
                            History = e.History.Select(h => new SaleReturnEffectRoundDto
                            {
                                Id = h.Id,
                                Date = h.Date,
                                Quantity = h.Quantity,
                                HealthyQuantity = h.HealthyQuantity,
                                PartyName = h.PartyName,
                                PartyNationalId = h.PartyNationalId,
                                VehiclePlate = h.VehiclePlate,
                                Note = h.Note,
                                Observations = h.Observations.Select(o => new SaleReturnEffectObservationDto
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

            res.Message = "اطلاعات مرجوعی فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
