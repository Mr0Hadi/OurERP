using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    public class DeleteSaleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteSaleCommandHandler : IRequestHandler<DeleteSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteSaleCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.FirstOrDefaultAsync(x => x.Id == request.Id) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            sale.IsActive = false;

            _context.Sales.Update(sale);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "فروش با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
