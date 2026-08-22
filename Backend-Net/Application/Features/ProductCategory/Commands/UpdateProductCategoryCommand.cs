using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.ProductCategory.Commands
{
    public class UpdateProductCategoryCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public class UpdateProductCategoryCommandValidator : AbstractValidator<UpdateProductCategoryCommand>
    {
        public UpdateProductCategoryCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دسته‌بندی"));
        }
    }

    public class UpdateProductCategoryCommandHandler : IRequestHandler<UpdateProductCategoryCommand, ResponseDto>
    {
        private readonly IProductCategoryRepository _productCategoryRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateProductCategoryCommandHandler(IProductCategoryRepository productCategoryRepository, IUnitOfWork unitOfWork)
        {
            _productCategoryRepository = productCategoryRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateProductCategoryCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var productCategory = await _productCategoryRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دسته‌بندی محصول مورد نظر یافت نشد.");

            productCategory.Name = request.Name;

            _productCategoryRepository.Update(productCategory);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دسته‌بندی محصول با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
