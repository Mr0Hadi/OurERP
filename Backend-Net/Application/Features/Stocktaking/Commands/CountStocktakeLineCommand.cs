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
    /// A typed count for one product - for stock whose units carry no labels. Null clears it. Once any unit of the product is
    /// scanned, the scans are the count and this is ignored. Only while COUNTING.
    /// </summary>
    [AuditAction(AuditActionEnum.CountStocktakeLine)]
    public class CountStocktakeLineCommand : IRequest<ResponseDto>
    {
        public int StocktakeId { get; set; }
        public int ProductId { get; set; }
        public int? Quantity { get; set; }
    }

    public class CountStocktakeLineCommandValidator : AbstractValidator<CountStocktakeLineCommand>
    {
        public CountStocktakeLineCommandValidator()
        {
            RuleFor(x => x.ProductId).GreaterThan(0).WithMessage("کالا نامعتبر است.");
            RuleFor(x => x.Quantity).GreaterThanOrEqualTo(0).When(x => x.Quantity.HasValue).WithMessage("تعداد شمرده‌شده نمی‌تواند منفی باشد.");
        }
    }

    public class CountStocktakeLineCommandHandler : IRequestHandler<CountStocktakeLineCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public CountStocktakeLineCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CountStocktakeLineCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var stocktake = await StocktakeLoader.LoadAsync(_context, request.StocktakeId, cancellationToken, StocktakeStatusEnum.COUNTING);
            if (!await _context.Products.AnyAsync(x => x.Id == request.ProductId && x.IsActive, cancellationToken))
                throw new NotFoundCustomException("کالای مورد نظر یافت نشد.");

            var line = StocktakeLoader.EnsureLine(stocktake, request.ProductId);
            line.ManualCount = request.Quantity;
            line.ManualCountedAt = request.Quantity.HasValue ? DateTime.Now : null;
            line.ManualCountedByUserId = request.Quantity.HasValue && int.TryParse(_userContextService.GetUserId(), out var id) ? id : null;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await StocktakeReader.ReadAsync(_context, stocktake.Id, cancellationToken);
            res.Message = "شمارش ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
