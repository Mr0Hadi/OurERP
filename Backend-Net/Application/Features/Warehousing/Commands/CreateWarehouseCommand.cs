using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Warehousing.Queries;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Warehousing.Commands
{
    /// <summary>
    /// A new warehouse. Allowed whatever the multi-warehouse switch says - warehouses are management data and may be set up
    /// before the feature is turned on; the flows only use them while it is on.
    /// </summary>
    [AuditAction(AuditActionEnum.CreateWarehouse)]
    public class CreateWarehouseCommand : WarehouseInput, IRequest<ResponseDto>
    {
    }

    public class CreateWarehouseCommandValidator : AbstractValidator<CreateWarehouseCommand>
    {
        public CreateWarehouseCommandValidator()
        {
            Include(new WarehouseInputValidator());
        }
    }

    public class CreateWarehouseCommandHandler : IRequestHandler<CreateWarehouseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CreateWarehouseCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateWarehouseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await WarehouseRules.EnsureUniqueCodeAsync(_context, request.Code, null, cancellationToken);
            var warehouse = new Domain.Entities.Warehouse { IsActive = true, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now };
            request.ApplyTo(warehouse);
            await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                await _context.Warehouses.AddAsync(warehouse, ct);
                await _unitOfWork.SaveChangesAsync(ct);
                if (request.IsDefault)
                    await WarehouseRules.MoveDefaultAsync(_context, _unitOfWork, warehouse, ct);
                return warehouse.Id;
            }, cancellationToken);

            res.Data = await WarehouseReader.ReadAsync(_context, warehouse.Id, cancellationToken);
            res.Message = "انبار ایجاد شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
