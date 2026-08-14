using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Product.Commands
{
    public class DeleteProductCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, ResponseDto>
    {
        private readonly IProductRepository _productRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteProductCommandHandler(IProductRepository productRepository, IUnitOfWork unitOfWork)
        {
            _productRepository = productRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var product = await _productRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("محصول مورد نظر یافت نشد.");

            product.IsActive = false;

            _productRepository.Update(product);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "محصول با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
