using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Stocktaking.Queries;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>
    /// Units found on the shelf, by barcode (a batch from the scanner). A unit already scanned in this session is ignored, so
    /// re-scanning is harmless. A unit of a product outside the scope adds that product (system quantity 0 - found extra). A
    /// barcode the system does not know is kept and listed (unknownBarcodes) - it changes nothing. Only while COUNTING.
    /// </summary>
    [AuditAction(AuditActionEnum.ScanStocktakeUnits)]
    public class ScanStocktakeUnitsCommand : IRequest<ResponseDto>
    {
        public int StocktakeId { get; set; }
        public List<string> Barcodes { get; set; } = new();
    }

    public class ScanStocktakeUnitsCommandValidator : AbstractValidator<ScanStocktakeUnitsCommand>
    {
        public ScanStocktakeUnitsCommandValidator()
        {
            RuleFor(x => x.Barcodes).NotEmpty().WithMessage("هیچ بارکدی فرستاده نشده است.");
            RuleFor(x => x.Barcodes.Count).LessThanOrEqualTo(500).WithMessage("هر بار حداکثر ۵۰۰ بارکد.");
        }
    }

    public class ScanStocktakeUnitsCommandHandler : IRequestHandler<ScanStocktakeUnitsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public ScanStocktakeUnitsCommandHandler(IWMSDbContext context, IProductCodeService productCodeService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productCodeService = productCodeService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ScanStocktakeUnitsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var stocktake = await StocktakeLoader.LoadAsync(_context, request.StocktakeId, cancellationToken, StocktakeStatusEnum.COUNTING);
            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            var now = DateTime.Now;

            var payloads = request.Barcodes.Where(b => !string.IsNullOrWhiteSpace(b)).Select(b => (Raw: b.Trim(), Payload: _productCodeService.ToPayload(b))).ToList();
            var keys = payloads.Select(p => p.Payload).Distinct().ToList();
            var units = await _context.ProductUnits.AsNoTracking()
                .Where(x => keys.Contains(x.BarcodePayload))
                .Select(x => new { x.Id, x.ProductId, x.Barcode, x.BarcodePayload })
                .ToListAsync(cancellationToken);
            var byPayload = units.GroupBy(u => u.BarcodePayload).ToDictionary(g => g.Key, g => g.First());

            var seenUnits = stocktake.Scans.Where(s => s.ProductUnitId.HasValue).Select(s => s.ProductUnitId!.Value).ToHashSet();
            var seenUnknown = stocktake.Scans.Where(s => s.ProductUnitId == null).Select(s => s.Barcode).ToHashSet();
            int added = 0, repeated = 0, unknown = 0;
            foreach (var (raw, payload) in payloads)
            {
                if (byPayload.TryGetValue(payload, out var unit))
                {
                    if (!seenUnits.Add(unit.Id))
                    {
                        repeated++;
                        continue;
                    }
                    StocktakeLoader.EnsureLine(stocktake, unit.ProductId);
                    stocktake.Scans.Add(new StocktakeScan { ProductUnitId = unit.Id, ProductId = unit.ProductId, Barcode = unit.Barcode, ScannedAt = now, ScannedByUserId = userId });
                    added++;
                }
                else if (seenUnknown.Add(raw))
                {
                    stocktake.Scans.Add(new StocktakeScan { Barcode = raw, ScannedAt = now, ScannedByUserId = userId });
                    unknown++;
                }
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = $"{added} دانه ثبت شد" + (repeated > 0 ? $"، {repeated} تکراری" : string.Empty) + (unknown > 0 ? $"، {unknown} بارکد ناشناخته" : string.Empty) + ".";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
