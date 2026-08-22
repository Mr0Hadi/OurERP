using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.FileStorage.Commands
{
    /// <summary>
    /// Deletes an object from the bucket. Deliberately NOT called automatically when an entity's
    /// image is replaced: the same key can legitimately be referenced by more than one row (a
    /// frontend that copies a product image onto a variant, for instance), so orphan cleanup is an
    /// explicit call rather than a side effect of an update.
    /// </summary>
    public class DeleteImageCommand : IRequest<ResponseDto>
    {
        public string ObjectKey { get; set; } = string.Empty;
    }

    public class DeleteImageCommandValidator : AbstractValidator<DeleteImageCommand>
    {
        public DeleteImageCommandValidator()
        {
            RuleFor(x => x.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("شناسه تصویر"));
        }
    }

    public class DeleteImageCommandHandler : IRequestHandler<DeleteImageCommand, ResponseDto>
    {
        private readonly IObjectStorageService _objectStorageService;

        public DeleteImageCommandHandler(IObjectStorageService objectStorageService)
        {
            _objectStorageService = objectStorageService;
        }

        public async Task<ResponseDto> Handle(DeleteImageCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await _objectStorageService.DeleteAsync(request.ObjectKey, cancellationToken);

            res.Message = "تصویر با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
