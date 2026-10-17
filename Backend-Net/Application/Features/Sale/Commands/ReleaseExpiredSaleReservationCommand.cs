using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Releases one proforma whose reservation has run out (Sale.ReservationExpiresAt plus SaleProformaPipeline.ExpirySweepGrace):
    /// its RESERVED units go back to IN_STOCK, a WAREHOUSE_CHECKED proforma goes back to CUSTOMER_APPROVED, and a
    /// RESERVATION_EXPIRED event is written. Sent by the background sweep (WMS/BackgroundJobs/SaleReservationExpiryJob), one sale
    /// per command so one bad sale cannot hold the others back. Not exposed through a controller.
    ///
    /// Idempotent: a sale that has since been paid, re-checked, cancelled or deleted no longer matches and is left alone.
    /// </summary>
    [AuditAction(AuditActionEnum.ReleaseExpiredSaleReservation)]
    public class ReleaseExpiredSaleReservationCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
    }

    public class ReleaseExpiredSaleReservationCommandHandler : IRequestHandler<ReleaseExpiredSaleReservationCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IUnitOfWork _unitOfWork;

        public ReleaseExpiredSaleReservationCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReleaseExpiredSaleReservationCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Items)
                .Where(SaleProformaPipeline.ReservationDueForRelease(DateTime.Now))
                .FirstOrDefaultAsync(x => x.Id == request.SaleId, cancellationToken);

            if (sale != null)
            {
                await SaleProformaPipeline.ExpireReservationAsync(_context, _productUnitService, sale, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            res.Data = sale != null;
            res.Message = sale != null ? "رزرو منقضی‌شده آزاد شد." : "رزروی برای آزاد کردن نبود.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
