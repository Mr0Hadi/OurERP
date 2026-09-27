using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Commands
{
    /// <summary>
    /// Records that these units' labels were printed (the frontend asks "were they printed?" after the browser's print dialog and
    /// sends this only on yes). Each call adds one to PrintCount, stamps LastPrintedAt/By and FirstPrintedAt the first time. Not a
    /// movement - printing does not change where a unit is - so it writes no ProductUnitMovement row. All or nothing.
    /// </summary>
    public class MarkProductUnitsPrintedCommand : IRequest<ResponseDto>
    {
        public List<int> ProductUnitIds { get; set; } = new();
    }

    public class MarkProductUnitsPrintedCommandValidator : AbstractValidator<MarkProductUnitsPrintedCommand>
    {
        public MarkProductUnitsPrintedCommandValidator()
        {
            RuleFor(x => x.ProductUnitIds).NotEmpty().WithMessage(Validation.RequiredMessage("دانه‌ها"));
            RuleFor(x => x.ProductUnitIds).Must(ids => ids.Count <= ApplyProductUnitActionCommandValidator.MaxUnits)
                .WithMessage($"در هر درخواست حداکثر {ApplyProductUnitActionCommandValidator.MaxUnits} دانه.");
            RuleFor(x => x.ProductUnitIds).Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("یک دانه بیش از یک‌بار انتخاب شده است.");
        }
    }

    public class MarkProductUnitsPrintedCommandHandler : IRequestHandler<MarkProductUnitsPrintedCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public MarkProductUnitsPrintedCommandHandler(IWMSDbContext context, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(MarkProductUnitsPrintedCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var units = await _context.ProductUnits
                .Where(u => request.ProductUnitIds.Contains(u.Id) && u.IsActive)
                .ToListAsync(cancellationToken);
            if (units.Count != request.ProductUnitIds.Count)
                throw new NotFoundCustomException("یک یا چند دانه‌ی انتخاب‌شده یافت نشد.");

            var now = DateTime.Now;
            int? userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : null;
            foreach (var unit in units)
            {
                unit.PrintCount++;
                unit.FirstPrintedAt ??= now;
                unit.LastPrintedAt = now;
                unit.LastPrintedByUserId = userId;
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { UpdatedCount = units.Count };
            res.Message = "چاپ برچسب‌ها ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
