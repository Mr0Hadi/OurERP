using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Audit.Dtos;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Audit.Queries
{
    /// <summary>
    /// The history of one document (sale 42): every event that changed a row of it, newest first, each narrowed to the
    /// rows of this document - the sale, its lines, payments, installments, drivers, notes and attachments. Rows the same
    /// event changed elsewhere (stock, units, a return's own rows) are in GetAuditEventDetail.
    /// Not paged, like GetPartyStatement: a timeline is read whole, and one document's history is small.
    /// </summary>
    public class GetDocumentHistoryQuery : IRequest<ResponseDto>
    {
        public DocumentKindEnum DocumentKind { get; set; }
        public int DocumentId { get; set; }
    }

    public class GetDocumentHistoryQueryValidator : AbstractValidator<GetDocumentHistoryQuery>
    {
        public GetDocumentHistoryQueryValidator()
        {
            RuleFor(x => x.DocumentKind).IsInEnum().WithMessage("نوع سند معتبر نیست.");
            RuleFor(x => x.DocumentId).GreaterThan(0).WithMessage("شناسه سند معتبر نیست.");
        }
    }

    public class GetDocumentHistoryQueryHandler : IRequestHandler<GetDocumentHistoryQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetDocumentHistoryQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetDocumentHistoryQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var events = await _context.AuditEvents.AsNoTracking()
                .Where(x => x.Changes.Any(c => c.DocumentKind == request.DocumentKind && c.DocumentId == request.DocumentId))
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
                        .Where(c => c.DocumentKind == request.DocumentKind && c.DocumentId == request.DocumentId)
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
            res.Message = "تاریخچه سند با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
