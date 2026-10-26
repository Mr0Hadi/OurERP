using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Puts a proforma's reserved units back on the shelf before the deadline - what the expiry sweep
    /// (ReleaseExpiredSaleReservationCommand) does, but by hand. The lines and their ids stay as they are; a WAREHOUSE_CHECKED
    /// proforma goes back to CUSTOMER_APPROVED (the customer's approval of this revision still stands, the warehouse has to check
    /// again), and a RESERVATION_RELEASED event records who did it. Refused when nothing is reserved.
    /// </summary>
    [AuditAction(AuditActionEnum.ReleaseSaleReservation)]
    public class ReleaseSaleReservationCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }

        /// <summary>The revision the screen showed (SaleDto.Revision).</summary>
        public int Revision { get; set; }

        public string? Note { get; set; }
    }

    public class ReleaseSaleReservationCommandValidator : AbstractValidator<ReleaseSaleReservationCommand>
    {
        public ReleaseSaleReservationCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleFor(x => x.Note).MaximumLength(1000).WithMessage("یادداشت حداکثر ۱۰۰۰ نویسه است.");
        }
    }

    public class ReleaseSaleReservationCommandHandler : IRequestHandler<ReleaseSaleReservationCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public ReleaseSaleReservationCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReleaseSaleReservationCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status != SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException("فاکتور این فروش صادر شده است؛ کالای آن برای ارسال نگه داشته می‌شود و رزروش دستی آزاد نمی‌شود.");
            SaleProformaPipeline.EnsureRevision(sale, request.Revision);

            var reserved = 0;
            foreach (var line in sale.Items)
                reserved += await _productUnitService.CountReservedAsync(line.Id, cancellationToken);
            if (reserved == 0)
                throw new ValidationCustomException("کالایی برای این پیش‌فاکتور رزرو نیست.");

            sale.ReservationExpiresAt = null;
            await SaleProformaPipeline.ReleaseAsync(_context, _productUnitService, sale, sale.Items.Select(i => i.Id), cancellationToken);

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            var toStage = sale.ProformaStage == SaleProformaStageEnum.WAREHOUSE_CHECKED ? SaleProformaStageEnum.CUSTOMER_APPROVED : sale.ProformaStage;
            await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.RESERVATION_RELEASED, toStage, userId,
                string.IsNullOrWhiteSpace(request.Note) ? $"{reserved} دانه به موجودی آزاد برگشت." : request.Note.Trim(), cancellationToken);

            sale.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, sale.Id, cancellationToken);
            res.Message = $"رزرو {reserved} دانه آزاد شد؛ برای پرداخت، انبار باید دوباره بررسی کند.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
