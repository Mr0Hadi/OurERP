using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Stocktaking.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking.Commands
{
    /// <summary>
    /// <see cref="CountStocktakeLineCommand"/> for several products in one request, all or nothing, answered with one read of
    /// the session. Same rules per line: null clears the count, scans win over a typed count, only while COUNTING.
    /// </summary>
    [AuditAction(AuditActionEnum.CountStocktakeLines)]
    public class CountStocktakeLinesCommand : IRequest<ResponseDto>
    {
        public int StocktakeId { get; set; }
        public List<CountStocktakeLineInput> Lines { get; set; } = new();
    }

    public class CountStocktakeLineInput
    {
        public int ProductId { get; set; }
        public int? Quantity { get; set; }
    }

    public class CountStocktakeLinesCommandValidator : AbstractValidator<CountStocktakeLinesCommand>
    {
        public CountStocktakeLinesCommandValidator()
        {
            RuleFor(x => x.Lines).NotEmpty().WithMessage("هیچ ردیفی فرستاده نشده است.");
            RuleFor(x => x.Lines.Count).LessThanOrEqualTo(500).WithMessage("هر بار حداکثر ۵۰۰ ردیف.");
            RuleFor(x => x.Lines).Must(l => l.Select(x => x.ProductId).Distinct().Count() == l.Count).WithMessage("هر کالا فقط یک بار می‌تواند بیاید.");
            RuleForEach(x => x.Lines).ChildRules(line =>
            {
                line.RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.");
                line.RuleFor(x => x.Quantity).GreaterThanOrEqualTo(0).When(x => x.Quantity.HasValue).WithMessage("تعداد شمرده‌شده نمی‌تواند منفی باشد.");
            });
        }
    }

    public class CountStocktakeLinesCommandHandler : IRequestHandler<CountStocktakeLinesCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public CountStocktakeLinesCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CountStocktakeLinesCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var stocktake = await StocktakeLoader.LoadAsync(_context, request.StocktakeId, cancellationToken, StocktakeStatusEnum.COUNTING);
            var productIds = request.Lines.Select(x => x.ProductId).ToList();
            var found = await _context.Products.Where(x => productIds.Contains(x.Id) && x.IsActive).CountAsync(cancellationToken);
            if (found != productIds.Count)
                throw new NotFoundCustomException("یکی از کالاها یافت نشد.");

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            var now = DateTime.Now;
            foreach (var input in request.Lines)
                StocktakeLoader.SetManualCount(StocktakeLoader.EnsureLine(stocktake, input.ProductId), input.Quantity, userId, now);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = $"شمارش {request.Lines.Count} ردیف ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
