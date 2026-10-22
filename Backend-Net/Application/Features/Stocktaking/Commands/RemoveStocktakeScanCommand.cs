using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Stocktaking.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>Takes back a scan made by mistake (by barcode). Only while COUNTING.</summary>
    [AuditAction(AuditActionEnum.RemoveStocktakeScan)]
    public class RemoveStocktakeScanCommand : IRequest<ResponseDto>
    {
        public int StocktakeId { get; set; }
        public string Barcode { get; set; } = string.Empty;
    }

    public class RemoveStocktakeScanCommandValidator : AbstractValidator<RemoveStocktakeScanCommand>
    {
        public RemoveStocktakeScanCommandValidator()
        {
            RuleFor(x => x.Barcode).Must(b => !string.IsNullOrWhiteSpace(b)).WithMessage("بارکد را بفرستید.");
        }
    }

    public class RemoveStocktakeScanCommandHandler : IRequestHandler<RemoveStocktakeScanCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveStocktakeScanCommandHandler(IWMSDbContext context, IProductCodeService productCodeService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productCodeService = productCodeService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveStocktakeScanCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var stocktake = await StocktakeLoader.LoadAsync(_context, request.StocktakeId, cancellationToken, StocktakeStatusEnum.COUNTING);
            var payload = _productCodeService.ToPayload(request.Barcode);
            var scans = stocktake.Scans
                .Where(s => s.Barcode == request.Barcode.Trim() || _productCodeService.ToPayload(s.Barcode) == payload)
                .ToList();
            if (scans.Count == 0)
                throw new NotFoundCustomException("این بارکد در این انبارگردانی اسکن نشده است.");

            foreach (var scan in scans)
                _context.StocktakeScans.Remove(scan);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "اسکن حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
