using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    public class DeleteSaleReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteSaleReturnCommandValidator : AbstractValidator<DeleteSaleReturnCommand>
    {
        public DeleteSaleReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class DeleteSaleReturnCommandHandler : IRequestHandler<DeleteSaleReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnRepository _saleReturnRepository;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteSaleReturnCommandHandler(IWMSDbContext context, ISaleReturnRepository saleReturnRepository, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnRepository = saleReturnRepository;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteSaleReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns
                .WhereNotDeleted()
                .WithReturnGraph()
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // One rule for every lifecycle command, and a reason that names what actually blocks it
            // (the status, moved goods, or recorded money) - see ReturnLifecycleRules.
            if (_saleReturnCalculationService.GetLifecycleBlocker(saleReturn, ReturnLifecycleActionEnum.DELETE) is { } blocker)
                throw new ValidationCustomException(blocker);

            // Soft delete: the row and its whole claim graph stay, every read filters IsActive out.
            saleReturn.IsActive = false;
            saleReturn.UpdatedAt = DateTime.Now;
            _saleReturnRepository.Update(saleReturn);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // A deleted return has no document left to return; the client needs only these two to
            // evict it from its cache and refresh the sale it belonged to.
            res.Data = new { Id = saleReturn.Id, SaleId = saleReturn.SaleId };
            res.Message = "مرجوعی با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
