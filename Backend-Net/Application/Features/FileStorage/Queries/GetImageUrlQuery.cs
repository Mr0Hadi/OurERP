using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.FileStorage.Queries
{
    /// <summary>
    /// Re-signs a stored object key. The bucket is private and every URL this API hands out
    /// expires, so a long-lived page (or a cached list response) needs a way to refresh a URL
    /// without re-fetching the whole entity.
    /// </summary>
    public class GetImageUrlQuery : IRequest<ResponseDto>
    {
        public string ObjectKey { get; set; } = string.Empty;
    }

    public class GetImageUrlQueryValidator : AbstractValidator<GetImageUrlQuery>
    {
        public GetImageUrlQueryValidator()
        {
            RuleFor(x => x.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("شناسه تصویر"));
        }
    }

    public class GetImageUrlQueryHandler : IRequestHandler<GetImageUrlQuery, ResponseDto>
    {
        private readonly IObjectStorageService _objectStorageService;

        public GetImageUrlQueryHandler(IObjectStorageService objectStorageService)
        {
            _objectStorageService = objectStorageService;
        }

        public Task<ResponseDto> Handle(GetImageUrlQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Signing is local crypto, so there is nothing to await - the Task is only here
            // because IRequestHandler demands it (see CLAUDE.md section 3, "Async design").
            var key = _objectStorageService.NormalizeKey(request.ObjectKey);

            res.Data = new
            {
                ObjectKey = key,
                Url = _objectStorageService.GetPresignedUrl(key),
            };
            res.Message = "آدرس تصویر با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return Task.FromResult(res);
        }
    }
}
