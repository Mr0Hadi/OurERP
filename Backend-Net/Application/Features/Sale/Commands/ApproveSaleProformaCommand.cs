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
    /// The customer has agreed to this proforma (quantities, prices, terms) - a checkbox for the salesperson, recorded with who
    /// and when. DRAFT -> CUSTOMER_APPROVED, which puts it in the warehouse's queue; straight to WAREHOUSE_CHECKED when every
    /// line is still fully reserved from an earlier warehouse check (only prices or terms changed since).
    /// </summary>
    [AuditAction(AuditActionEnum.ApproveSaleProforma)]
    public class ApproveSaleProformaCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }

        /// <summary>The revision the screen showed (SaleDto.Revision).</summary>
        public int Revision { get; set; }
    }

    public class ApproveSaleProformaCommandValidator : AbstractValidator<ApproveSaleProformaCommand>
    {
        public ApproveSaleProformaCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
        }
    }

    public class ApproveSaleProformaCommandHandler : IRequestHandler<ApproveSaleProformaCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public ApproveSaleProformaCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ApproveSaleProformaCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status != SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException("فقط پیش‌فاکتور تأیید مشتری می‌گیرد.");
            if (sale.ProformaStage != SaleProformaStageEnum.DRAFT)
                throw new ValidationCustomException("این پیش‌فاکتور تأیید مشتری را گرفته است.");
            SaleProformaPipeline.EnsureRevision(sale, request.Revision);

            var fullyReserved = true;
            foreach (var line in sale.Items)
            {
                if (await _productUnitService.CountReservedAsync(line.Id, cancellationToken) < line.Quantity)
                {
                    fullyReserved = false;
                    break;
                }
            }

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.CUSTOMER_APPROVED, SaleProformaStageEnum.CUSTOMER_APPROVED, userId, null, cancellationToken);
            // An expired reservation (not swept yet) does not count: the warehouse checks again, which restarts the clock.
            if (fullyReserved && !SaleProformaPipeline.IsReservationExpired(sale, DateTime.Now))
                await SaleProformaPipeline.RecordAsync(_context, sale, SaleProformaEventEnum.WAREHOUSE_CHECKED, SaleProformaStageEnum.WAREHOUSE_CHECKED, userId,
                    "کالای همه‌ی اقلام از بررسی قبلی انبار رزرو مانده است.", cancellationToken);

            sale.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, sale.Id, cancellationToken);
            res.Message = fullyReserved
                ? "تأیید مشتری ثبت شد؛ کالا از قبل رزرو است و پیش‌فاکتور آماده‌ی پرداخت است."
                : "تأیید مشتری ثبت شد و پیش‌فاکتور برای بررسی به انبار رفت.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
