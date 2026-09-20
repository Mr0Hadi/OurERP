using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleInstallment.Mappings;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Queries
{
    /// <summary>
    /// جزئیات یک قرارداد اقساطی: فیلدهای پلن + roll-upها + لیست کامل سطرهای قسط +
    /// PaymentDetailهای همان فروش. با <c>PlanId</c> یا <c>SaleId</c>.
    /// </summary>
    public class GetSaleInstallmentPlanDetailQuery : IRequest<ResponseDto>
    {
        public int? PlanId { get; set; }
        public int? SaleId { get; set; }
    }

    public class GetSaleInstallmentPlanDetailQueryValidator : AbstractValidator<GetSaleInstallmentPlanDetailQuery>
    {
        public GetSaleInstallmentPlanDetailQueryValidator()
        {
            RuleFor(x => x).Must(x => x.PlanId.HasValue || x.SaleId.HasValue)
                .WithMessage("شناسه‌ی قرارداد اقساطی یا شناسه‌ی فروش باید ارسال شود.");
        }
    }

    public class GetSaleInstallmentPlanDetailQueryHandler : IRequestHandler<GetSaleInstallmentPlanDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleInstallmentPlanDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleInstallmentPlanDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var planId = request.PlanId;
            if (!planId.HasValue)
            {
                // اگر چند پلن روی یک فروش وجود داشته باشد (پلن ابطال‌شده + پلن جدید)، پلن
                // جاری اولویت دارد؛ وگرنه آخرین پلن ساخته‌شده.
                planId = await _context.SaleInstallmentPlans.AsNoTracking()
                    .Where(x => x.SaleId == request.SaleId!.Value)
                    .OrderByDescending(x => x.IsActive && x.Status == SaleInstallmentPlanStatusEnum.ACTIVE)
                    .ThenByDescending(x => x.Id)
                    .Select(x => (int?)x.Id)
                    .FirstOrDefaultAsync(cancellationToken);

                if (!planId.HasValue)
                    throw new NotFoundCustomException("قرارداد اقساطی مورد نظر یافت نشد.");
            }

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, planId.Value, cancellationToken);
            res.Message = "اطلاعات قرارداد اقساطی با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
