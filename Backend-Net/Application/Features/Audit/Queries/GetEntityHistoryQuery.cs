using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Audit.Dtos;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Audit.Queries
{
    /// <summary>
    /// The history of one row that belongs to no document - customer 5, product 12, user 7 - newest first, each event
    /// narrowed to that row's changes. The counterpart of GetDocumentHistory; not paged for the same reason.
    /// </summary>
    public class GetEntityHistoryQuery : IRequest<ResponseDto>
    {
        /// <summary>Entity class name as stored, e.g. "Customer".</summary>
        public string EntityType { get; set; } = null!;

        /// <summary>The row's key as stored: "5", or "5,3" for a composite key.</summary>
        public string EntityKey { get; set; } = null!;
    }

    public class GetEntityHistoryQueryValidator : AbstractValidator<GetEntityHistoryQuery>
    {
        public GetEntityHistoryQueryValidator()
        {
            RuleFor(x => x.EntityType).NotEmpty().WithMessage("نوع رکورد الزامی است.").MaximumLength(100).WithMessage("نوع رکورد معتبر نیست.");
            RuleFor(x => x.EntityKey).NotEmpty().WithMessage("شناسه رکورد الزامی است.").MaximumLength(100).WithMessage("شناسه رکورد معتبر نیست.");
        }
    }

    public class GetEntityHistoryQueryHandler : IRequestHandler<GetEntityHistoryQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetEntityHistoryQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetEntityHistoryQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var entityType = request.EntityType.Trim();
            var entityKey = request.EntityKey.Trim();

            var events = await _context.AuditEvents.AsNoTracking()
                .Where(x => x.Changes.Any(c => c.EntityType == entityType && c.EntityKey == entityKey))
                .OrderByDescending(x => x.OccurredAt)
                .ThenByDescending(x => x.Id)
                .Select(x => new
                {
                    x.Id,
                    x.OccurredAt,
                    x.UserId,
                    UserName = _context.Users.Where(u => u.Id == x.UserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                    x.Action,
                    Changes = x.Changes
                        .Where(c => c.EntityType == entityType && c.EntityKey == entityKey)
                        .OrderBy(c => c.Id)
                        .ToList(),
                })
                .AsSplitQuery()
                .ToListAsync(cancellationToken);

            res.Data = events.Select(e => new AuditEventDto
            {
                Id = e.Id,
                OccurredAt = e.OccurredAt,
                UserId = e.UserId,
                UserName = e.UserName,
                Action = e.Action,
                ActionTitle = e.Action?.GetDescription(),
                Changes = e.Changes.Select(c => new AuditChangeDto
                {
                    Id = c.Id,
                    EntityType = c.EntityType,
                    EntityKey = c.EntityKey,
                    Operation = c.Operation,
                    DocumentKind = c.DocumentKind,
                    DocumentId = c.DocumentId,
                    Fields = AuditFields.From(c.OldValues, c.NewValues),
                }).ToList(),
            }).ToList();
            res.Message = "تاریخچه رکورد با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
