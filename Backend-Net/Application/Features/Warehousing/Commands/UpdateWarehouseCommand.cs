using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Warehousing.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>
    /// Edits a warehouse. IsDefault = true moves the default here; the default cannot be un-defaulted directly (make another
    /// warehouse the default instead) - there is always exactly one.
    /// </summary>
    [AuditAction(AuditActionEnum.UpdateWarehouse)]
    public class UpdateWarehouseCommand : WarehouseInput, IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class UpdateWarehouseCommandValidator : AbstractValidator<UpdateWarehouseCommand>
    {
        public UpdateWarehouseCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("انبار نامعتبر است.");
            Include(new WarehouseInputValidator());
        }
    }

    public class UpdateWarehouseCommandHandler : IRequestHandler<UpdateWarehouseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateWarehouseCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateWarehouseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("انبار مورد نظر یافت نشد.");
            if (warehouse.IsDefault && !request.IsDefault)
                throw new ValidationCustomException("انبار پیش‌فرض را نمی‌شود از پیش‌فرض بودن درآورد؛ انبار دیگری را پیش‌فرض کنید.");

            await WarehouseRules.EnsureUniqueCodeAsync(_context, request.Code, warehouse.Id, cancellationToken);
            request.ApplyTo(warehouse);
            warehouse.UpdatedAt = DateTime.Now;
            await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                await _unitOfWork.SaveChangesAsync(ct);
                if (request.IsDefault && !warehouse.IsDefault)
                    await WarehouseRules.MoveDefaultAsync(_context, _unitOfWork, warehouse, ct);
                return warehouse.Id;
            }, cancellationToken);

            res.Data = await WarehouseReader.ReadAsync(_context, warehouse.Id, cancellationToken);
            res.Message = "انبار ویرایش شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
