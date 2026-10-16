using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Audit.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Audit.Queries
{
    /// <summary>One audit event with every row it changed, whichever document (or none) each belongs to.</summary>
    public class GetAuditEventDetailQuery : IRequest<ResponseDto>
    {
        public long Id { get; set; }
    }

    public class GetAuditEventDetailQueryHandler : IRequestHandler<GetAuditEventDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetAuditEventDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetAuditEventDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var auditEvent = await _context.AuditEvents.AsNoTracking()
                .Where(x => x.Id == request.Id)
                .Select(x => new
                {
                    x.Id,
                    x.OccurredAt,
                    x.UserId,
                    UserName = _context.Users.Where(u => u.Id == x.UserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                    x.Action,
                    Changes = x.Changes.OrderBy(c => c.Id).ToList(),
                })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("رویداد مورد نظر یافت نشد.");

            res.Data = new AuditEventDto
            {
                Id = auditEvent.Id,
                OccurredAt = auditEvent.OccurredAt,
                UserId = auditEvent.UserId,
                UserName = auditEvent.UserName,
                Action = auditEvent.Action,
                ActionTitle = auditEvent.Action?.GetDescription(),
                Changes = auditEvent.Changes.Select(c => new AuditChangeDto
                {
                    Id = c.Id,
                    EntityType = c.EntityType,
                    EntityKey = c.EntityKey,
                    Operation = c.Operation,
                    DocumentKind = c.DocumentKind,
                    DocumentId = c.DocumentId,
                    Fields = AuditFields.From(c.OldValues, c.NewValues),
                }).ToList(),
            };
            res.Message = "جزئیات رویداد با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
