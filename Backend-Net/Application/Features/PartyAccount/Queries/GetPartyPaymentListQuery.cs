using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting;
using Application.Features.PartyAccount.Dtos;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PartyAccount.Queries
{
    public enum PartyPaymentListSortEnum
    {
        PAID_AT = 0,
        AMOUNT = 1,
        PARTY_NAME = 2,
        UNALLOCATED_AMOUNT = 3,
    }

    /// <summary>On-account payments (علی‌الحساب), newest first. Payments made on an invoice are on that invoice, not here.</summary>
    public class GetPartyPaymentListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public PaymentDirectionEnum? Direction { get; set; }
        public int? BankAccountId { get; set; }

        /// <summary>true = only payments with something left to allocate (and allocatable at all).</summary>
        public bool? HasUnallocated { get; set; }

        /// <summary>On PaidAt, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Voided payments are left out unless asked for.</summary>
        public bool IncludeVoided { get; set; }

        /// <summary>Party name, cheque number, transfer reference or description, contains.</summary>
        public string? Search { get; set; }

        public PartyPaymentListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPartyPaymentListQueryValidator : AbstractValidator<GetPartyPaymentListQuery>
    {
        public GetPartyPaymentListQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetPartyPaymentListQueryHandler : IRequestHandler<GetPartyPaymentListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPartyPaymentListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPartyPaymentListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = PartyPaymentReader.OnAccount(_context).AsNoTracking();

            if (!request.IncludeVoided)
                query = query.Where(x => x.VoidedAt == null);
            if (request.CustomerId.HasValue)
                query = query.Where(x => x.CustomerId == request.CustomerId);
            if (request.SupplierId.HasValue)
                query = query.Where(x => x.SupplierId == request.SupplierId);
            if (request.Direction.HasValue)
                query = query.Where(x => x.Direction == request.Direction);
            if (request.BankAccountId.HasValue)
                query = query.Where(x => x.BankAccountId == request.BankAccountId);

            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.PaidAt >= from);
            if (to.HasValue)
                query = query.Where(x => x.PaidAt < to);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => (x.Customer != null && (x.Customer.FirstName + " " + x.Customer.LastName).Contains(search))
                    || (x.Supplier != null && x.Supplier.CompanyName.Contains(search))
                    || x.CheckNumber!.Contains(search)
                    || x.TransferRef!.Contains(search)
                    || x.Description!.Contains(search));
            }

            var rows = query.Select(PartyPaymentReader.Projection);

            // Allocatable = the party's natural direction (customer IN, supplier OUT), not voided, with money left.
            if (request.HasUnallocated == true)
                rows = rows.Where(x => x.VoidedAt == null && x.AllocatedAmount < x.Amount
                    && ((x.CustomerId != null && x.Direction == PaymentDirectionEnum.IN) || (x.SupplierId != null && x.Direction == PaymentDirectionEnum.OUT)));
            if (request.HasUnallocated == false)
                rows = rows.Where(x => !(x.VoidedAt == null && x.AllocatedAmount < x.Amount
                    && ((x.CustomerId != null && x.Direction == PaymentDirectionEnum.IN) || (x.SupplierId != null && x.Direction == PaymentDirectionEnum.OUT))));

            // Default: newest payment first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                PartyPaymentListSortEnum.AMOUNT => rows.SortBy(x => x.Amount, direction),
                PartyPaymentListSortEnum.PARTY_NAME => rows.SortBy(x => x.PartyName, direction),
                PartyPaymentListSortEnum.UNALLOCATED_AMOUNT => rows.SortBy(x => x.Amount - x.AllocatedAmount, direction),
                _ => rows.SortBy(x => x.PaidAt, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var item in paged.Items)
                PartyPaymentReader.Complete(item);

            res.Data = new
            {
                PartyPaymentList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                },
            };
            res.Message = "فهرست دریافت و پرداخت‌های علی‌الحساب ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
