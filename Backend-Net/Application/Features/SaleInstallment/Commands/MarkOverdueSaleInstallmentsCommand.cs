using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Settings;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Settings;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Commands
{
    /// <summary>
    /// Marks the PENDING installments of live plans that are past DueDate plus the Installment.OverdueGraceDays setting as
    /// OVERDUE. Sent by the background job (WMS/BackgroundJobs/InstallmentOverdueJob); not on a controller. Idempotent, at
    /// most <see cref="BatchSize"/> rows per run. The status is only a flag - the penalty is computed from DueDate when the
    /// installment is paid, not from when it was marked.
    /// </summary>
    [AuditAction(AuditActionEnum.MarkOverdueSaleInstallments)]
    public class MarkOverdueSaleInstallmentsCommand : IRequest<ResponseDto>
    {
        public int BatchSize { get; set; } = 1000;
    }

    public class MarkOverdueSaleInstallmentsCommandHandler : IRequestHandler<MarkOverdueSaleInstallmentsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISystemSettingService _systemSettingService;
        private readonly IUnitOfWork _unitOfWork;

        public MarkOverdueSaleInstallmentsCommandHandler(IWMSDbContext context, ISystemSettingService systemSettingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _systemSettingService = systemSettingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(MarkOverdueSaleInstallmentsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var graceDays = await _systemSettingService.GetIntegerAsync(SystemSettingCatalog.InstallmentOverdueGraceDays, cancellationToken);
            // Late once the whole due day plus the grace days are over: due on the 10th with 2 days' grace is late on the 13th.
            var lateIfDueBefore = DateTime.Today.AddDays(-graceDays);

            var rows = await _context.SaleInstallments
                .Where(x => x.Status == SaleInstallmentStatusEnum.PENDING && x.DueDate < lateIfDueBefore
                    && x.Plan.IsActive && x.Plan.Status == SaleInstallmentPlanStatusEnum.ACTIVE)
                .OrderBy(x => x.DueDate).ThenBy(x => x.Id)
                .Take(Math.Max(1, request.BatchSize))
                .ToListAsync(cancellationToken);

            var now = DateTime.Now;
            foreach (var row in rows)
            {
                row.Status = SaleInstallmentStatusEnum.OVERDUE;
                row.UpdatedAt = now;
            }

            if (rows.Count > 0)
                await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = rows.Count;
            res.Message = $"{rows.Count} قسط سررسیدگذشته علامت خورد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
