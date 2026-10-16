using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Audit.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;

namespace Application.Features.Audit.Queries
{
    public enum AuditEventListSortEnum
    {
        OCCURRED_AT = 0,
        ACTION = 1,
        USER = 2,
    }

    /// <summary>
    /// Every audit event, newest first: what each user did and when. The per-user activity log, and - with
    /// EntityType + EntityKey - the history of one row that belongs to no document (customer 5, product 12).
    /// For a document's history use GetDocumentHistory, which also narrows each event to that document's rows.
    /// </summary>
    public class GetAuditEventListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        public int? UserId { get; set; }
        public AuditActionEnum? Action { get; set; }

        /// <summary>On OccurredAt, inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Events that changed a row of this entity class ("Customer"), optionally this one row (EntityKey "5").</summary>
        public string? EntityType { get; set; }
        public string? EntityKey { get; set; }

        /// <summary>Events that changed a row of this document. Both must be sent to filter.</summary>
        public DocumentKindEnum? DocumentKind { get; set; }
        public int? DocumentId { get; set; }

        public AuditEventListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetAuditEventListQueryHandler : IRequestHandler<GetAuditEventListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetAuditEventListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetAuditEventListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.AuditEvents.AsQueryable();

            if (request.UserId.HasValue)
                query = query.Where(x => x.UserId == request.UserId);

            if (request.Action.HasValue)
                query = query.Where(x => x.Action == request.Action);

            if (request.FromDate.HasValue)
                query = query.Where(x => x.OccurredAt >= request.FromDate.Value.Date);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.OccurredAt < request.ToDate.Value.Date.AddDays(1));

            if (!string.IsNullOrWhiteSpace(request.EntityType))
            {
                var entityType = request.EntityType.Trim();
                var entityKey = request.EntityKey?.Trim();
                query = string.IsNullOrEmpty(entityKey)
                    ? query.Where(x => x.Changes.Any(c => c.EntityType == entityType))
                    : query.Where(x => x.Changes.Any(c => c.EntityType == entityType && c.EntityKey == entityKey));
            }

            if (request.DocumentKind.HasValue && request.DocumentId.HasValue)
                query = query.Where(x => x.Changes.Any(c => c.DocumentKind == request.DocumentKind && c.DocumentId == request.DocumentId));

            // Default: newest first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                AuditEventListSortEnum.OCCURRED_AT => query.SortBy(x => x.OccurredAt, direction),
                AuditEventListSortEnum.ACTION => query.SortBy(x => x.Action, direction),
                AuditEventListSortEnum.USER => query.SortBy(x => x.UserId, direction),
                _ => query.SortBy(x => x.OccurredAt, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(x => new AuditEventListDto
            {
                Id = x.Id,
                OccurredAt = x.OccurredAt,
                UserId = x.UserId,
                UserName = _context.Users.Where(u => u.Id == x.UserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                Action = x.Action,
                ChangeCount = x.Changes.Count,
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            foreach (var item in paged.Items)
                item.ActionTitle = item.Action?.GetDescription();

            res.Data = new
            {
                AuditEventList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "فهرست رویدادها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
