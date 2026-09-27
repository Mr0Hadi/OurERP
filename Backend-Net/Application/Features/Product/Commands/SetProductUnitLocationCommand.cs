using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Commands
{
    /// <summary>
    /// Puts these units on a shelf (<see cref="BinLocation"/>, normalised) or clears it (blank). Only units that are here - IN_STOCK
    /// or QUARANTINED. Moving between shelves is not a change of status, so no ProductUnitMovement row. All or nothing.
    /// </summary>
    public class SetProductUnitLocationCommand : IRequest<ResponseDto>
    {
        public List<int> ProductUnitIds { get; set; } = new();
        public string? BinLocation { get; set; }
    }

    public class SetProductUnitLocationCommandValidator : AbstractValidator<SetProductUnitLocationCommand>
    {
        public SetProductUnitLocationCommandValidator()
        {
            RuleFor(x => x.ProductUnitIds).NotEmpty().WithMessage(Validation.RequiredMessage("دانه‌ها"));
            RuleFor(x => x.ProductUnitIds).Must(ids => ids.Count <= ApplyProductUnitActionCommandValidator.MaxUnits)
                .WithMessage($"در هر درخواست حداکثر {ApplyProductUnitActionCommandValidator.MaxUnits} دانه.");
            RuleFor(x => x.ProductUnitIds).Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("یک دانه بیش از یک‌بار انتخاب شده است.");
            RuleFor(x => x.BinLocation).Must(b => (BinLocations.Normalize(b)?.Length ?? 0) <= BinLocations.MaxLength)
                .WithMessage($"کد قفسه حداکثر {BinLocations.MaxLength} نویسه است.");
        }
    }

    public class SetProductUnitLocationCommandHandler : IRequestHandler<SetProductUnitLocationCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public SetProductUnitLocationCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(SetProductUnitLocationCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var units = await _context.ProductUnits
                .Where(u => request.ProductUnitIds.Contains(u.Id) && u.IsActive)
                .ToListAsync(cancellationToken);
            if (units.Count != request.ProductUnitIds.Count)
                throw new NotFoundCustomException("یک یا چند دانه‌ی انتخاب‌شده یافت نشد.");

            var gone = units.Where(u => u.Status is not (ProductUnitStatusEnum.IN_STOCK or ProductUnitStatusEnum.QUARANTINED)).ToList();
            if (gone.Count > 0)
                throw new ValidationCustomException($"فقط دانه‌ای که در انبار یا قرنطینه است قفسه دارد: {string.Join("، ", gone.Take(5).Select(u => u.Barcode))}.");

            var binLocation = BinLocations.Normalize(request.BinLocation);
            foreach (var unit in units)
                unit.BinLocation = binLocation;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { AffectedCount = units.Count };
            res.Message = binLocation == null ? "قفسه‌ی دانه‌ها پاک شد." : "قفسه‌ی دانه‌ها ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
