using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Product.Commands;
using Application.Features.WarehouseIssue.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.WarehouseIssue.Commands
{
    /// <summary>
    /// Accounting's decision on a unit the warehouse reported during a proforma check. The unit has been in quarantine since the
    /// report; this takes it out, or deliberately leaves it there:
    /// <list type="bullet">
    /// <item>RELEASE - found, or not really damaged: back on the shelf at the value it was held at.</item>
    /// <item>SCRAP - gone for good: the held value is booked as a loss (sale report ScrapLoss).</item>
    /// <item>SUPPLIER_RETURN - the supplier's fault: it stays in quarantine (custody WAREHOUSE_HOLD on its purchase line) for an
    /// ON_ORDER purchase-return claim to send back.</item>
    /// </list>
    /// RELEASE and SCRAP go through ApplyProductUnitAction, so stock, unit and ledger move exactly as the units page moves them.
    /// The decision is never a gate on the proforma, which went on (or back to the customer) when the issue was reported.
    /// </summary>
    [AuditAction(AuditActionEnum.ResolveSaleWarehouseIssue)]
    public class ResolveSaleWarehouseIssueCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public SaleWarehouseIssueResolutionEnum Resolution { get; set; }
        public string? Note { get; set; }
    }

    public class ResolveSaleWarehouseIssueCommandValidator : AbstractValidator<ResolveSaleWarehouseIssueCommand>
    {
        public ResolveSaleWarehouseIssueCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("گزارش نامعتبر است.");
            RuleFor(x => x.Resolution).IsInEnum().WithMessage("تصمیم انتخاب‌شده نامعتبر است.");
            RuleFor(x => x.Note).MaximumLength(1000).WithMessage("یادداشت حداکثر ۱۰۰۰ نویسه است.");
            // Scrap is a loss: it is said on purpose and explained.
            RuleFor(x => x.Note).Must(n => !string.IsNullOrWhiteSpace(n))
                .When(x => x.Resolution == SaleWarehouseIssueResolutionEnum.SCRAP)
                .WithMessage("برای اسقاط، توضیح لازم است.");
        }
    }

    public class ResolveSaleWarehouseIssueCommandHandler : IRequestHandler<ResolveSaleWarehouseIssueCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IMediator _mediator;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public ResolveSaleWarehouseIssueCommandHandler(IWMSDbContext context, IMediator mediator, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _mediator = mediator;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ResolveSaleWarehouseIssueCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var issue = await _context.SaleWarehouseIssues.Include(x => x.ProductUnit)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
                ?? throw new NotFoundCustomException("گزارش انبار مورد نظر یافت نشد.");

            if (issue.ResolvedAt != null)
                throw new ValidationCustomException("برای این گزارش قبلاً تصمیم گرفته شده است.");

            if (issue.ProductUnit.Status != ProductUnitStatusEnum.QUARANTINED)
                throw new ValidationCustomException("این دانه دیگر در قرنطینه نیست (از مسیر دیگری جابه‌جا شده است)؛ تصمیمی برای ثبت نمانده.");

            if (request.Resolution == SaleWarehouseIssueResolutionEnum.SUPPLIER_RETURN && issue.ProductUnit.PurchaseItemId == null)
                throw new ValidationCustomException("این دانه به قلم خرید مشخصی وصل نیست و از مسیر مرجوعی خرید برگشت داده نمی‌شود.");

            var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

            await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                if (request.Resolution != SaleWarehouseIssueResolutionEnum.SUPPLIER_RETURN)
                {
                    var release = request.Resolution == SaleWarehouseIssueResolutionEnum.RELEASE;
                    await _mediator.Send(new ApplyProductUnitActionCommand
                    {
                        Action = release ? ProductUnitActionEnum.RELEASE : ProductUnitActionEnum.SCRAP,
                        ProductUnitIds = new() { issue.ProductUnitId },
                        Reason = release ? UnitActionReasonEnum.INSPECTION_PASSED : issue.Reason,
                        Note = note ?? issue.Description,
                    }, ct);
                }

                issue.Resolution = request.Resolution;
                issue.ResolutionNote = note;
                issue.ResolvedByUserId = int.TryParse(_userContextService.GetUserId(), out var userId) ? userId : null;
                issue.ResolvedAt = DateTime.Now;
                await _unitOfWork.SaveChangesAsync(ct);
                return true;
            }, cancellationToken);

            var dto = await _context.SaleWarehouseIssues.Where(x => x.Id == issue.Id)
                .Select(SaleWarehouseIssueProjection.ToDto(_context))
                .FirstAsync(cancellationToken);
            SaleWarehouseIssueProjection.FillTitles(dto);

            res.Data = dto;
            res.Message = "تصمیم حسابداری برای این گزارش ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
