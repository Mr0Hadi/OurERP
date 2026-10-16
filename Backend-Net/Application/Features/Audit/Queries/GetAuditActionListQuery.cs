using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Audit.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;

namespace Application.Features.Audit.Queries
{
    /// <summary>
    /// Every AuditActionEnum member with its Persian title, in enum order - the filter dropdown of the activity screens,
    /// so the frontend never hard-codes the catalogue. Read from the enum itself: there is no table to query.
    /// </summary>
    public class GetAuditActionListQuery : IRequest<ResponseDto>
    {
    }

    public class GetAuditActionListQueryHandler : IRequestHandler<GetAuditActionListQuery, ResponseDto>
    {
        public Task<ResponseDto> Handle(GetAuditActionListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = Enum.GetValues<AuditActionEnum>()
                .Select(x => new AuditActionDto
                {
                    Value = (int)x,
                    Name = x.ToString(),
                    Title = x.GetDescription(),
                })
                .ToList();
            res.Message = "فهرست عملیات‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return Task.FromResult(res);
        }
    }
}
