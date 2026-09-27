using Application.Common.Contracts.Context;
using Application.Common.Contracts.OrgStructure;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Report.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Report.Queries
{
    /// <summary>
    /// Sales and purchases of the signed-in user (ME), of their team (TEAM) or of their department (DEPARTMENT), for the
    /// personal dashboard. It deliberately needs no ReportView: that permission shows the whole company's revenue and cost,
    /// which a salesperson must not see, so this report carries document counts and invoice totals only - never revenue,
    /// cost or profit.
    ///
    /// Who may ask comes from the org chart, not from a permission: TEAM needs the user to be the head or deputy of a team,
    /// DEPARTMENT the head or deputy of a department - read through <see cref="IOrgRoleService.GetRoleAsync"/>, the same place
    /// GetUserInfo reads the role from, so the dashboard and the server never disagree about who is a head.
    ///
    /// Membership is TODAY's (User.TeamId/DepartmentId), not the one at the time a document was recorded - membership history
    /// is not stored. Someone who moved to another team takes their record with them, and a deactivated user's documents drop
    /// out of every scope.
    ///
    /// Counting is the rule GetSaleReport/GetPurchaseReport use (bucketed on InvoiceDate, only documents with one, amount =
    /// TotalAmount), plus soft-deleted documents are left out. Only documents with a SalesUserId/PurchasingUserId can belong to
    /// anyone.
    /// </summary>
    public class GetScopePerformanceQuery : IRequest<ResponseDto>
    {
        public ReportScopeEnum Scope { get; set; }
        public ReportPeriodTypeEnum PeriodType { get; set; } = ReportPeriodTypeEnum.Monthly;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetScopePerformanceQueryHandler : IRequestHandler<GetScopePerformanceQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IOrgRoleService _orgRoleService;
        private readonly IUserContextService _userContextService;

        public GetScopePerformanceQueryHandler(IWMSDbContext context, IOrgRoleService orgRoleService, IUserContextService userContextService)
        {
            _context = context;
            _orgRoleService = orgRoleService;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(GetScopePerformanceQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var userId = Convert.ToInt32(_userContextService.GetUserId());
            var user = await _context.Users.AsNoTracking()
                .Where(x => x.Id == userId && x.IsActive)
                .Select(x => new { x.Id, x.TeamId, x.DepartmentId })
                .FirstOrDefaultAsync(cancellationToken)
                    ?? throw new UnauthorizedCustomException();

            var toDate = request.ToDate ?? DateTime.Now;
            var fromDate = request.FromDate ?? toDate.AddMonths(-12);

            var dto = new ScopePerformanceDto { Scope = request.Scope };
            List<int> memberIds;

            if (request.Scope == ReportScopeEnum.ME)
            {
                memberIds = [user.Id];
            }
            else
            {
                var role = await _orgRoleService.GetRoleAsync(user.Id, cancellationToken);
                var members = _context.Users.AsNoTracking().Where(x => x.IsActive);

                if (request.Scope == ReportScopeEnum.TEAM)
                {
                    if (role is not (OrgRoleEnum.TEAM_HEAD or OrgRoleEnum.TEAM_DEPUTY) || !user.TeamId.HasValue)
                        throw new ForbiddenCustomException("گزارش تیم فقط برای مسئول یا جانشین تیم در دسترس است.");

                    dto.ScopeName = await _context.Teams.Where(x => x.Id == user.TeamId.Value).Select(x => x.Name).FirstAsync(cancellationToken);
                    members = members.Where(x => x.TeamId == user.TeamId.Value);
                }
                else
                {
                    if (role is not (OrgRoleEnum.DEPARTMENT_HEAD or OrgRoleEnum.DEPARTMENT_DEPUTY))
                        throw new ForbiddenCustomException("گزارش واحد فقط برای مسئول یا جانشین واحد در دسترس است.");

                    dto.ScopeName = await _context.Departments.Where(x => x.Id == user.DepartmentId).Select(x => x.Name).FirstAsync(cancellationToken);
                    members = members.Where(x => x.DepartmentId == user.DepartmentId);
                }

                // Heads/deputies read straight off the slots, like GetUserListQuery, rather than one GetRoleAsync per member.
                dto.Members = await members
                    .Select(x => new ScopePerformanceMemberDto
                    {
                        UserId = x.Id,
                        FullName = x.FirstName + " " + x.LastName,
                        Role = x.Team != null && x.Team.HeadId == x.Id ? OrgRoleEnum.TEAM_HEAD
                            : x.Team != null && x.Team.DeputyId == x.Id ? OrgRoleEnum.TEAM_DEPUTY
                            : x.Department.HeadId == x.Id ? OrgRoleEnum.DEPARTMENT_HEAD
                            : x.Department.DeputyId == x.Id ? OrgRoleEnum.DEPARTMENT_DEPUTY
                            : OrgRoleEnum.MEMBER,
                        TeamId = x.TeamId,
                        TeamName = x.Team != null ? x.Team.Name : null,
                    })
                    .ToListAsync(cancellationToken);

                memberIds = dto.Members.Select(x => x.UserId).ToList();
            }

            var sales = await _context.Sales.AsNoTracking()
                .Where(x => x.IsActive && x.SalesUserId.HasValue && memberIds.Contains(x.SalesUserId.Value))
                .Where(x => x.InvoiceDate != null && x.InvoiceDate >= fromDate && x.InvoiceDate <= toDate)
                .Select(x => new { UserId = x.SalesUserId!.Value, x.InvoiceDate, x.TotalAmount })
                .ToListAsync(cancellationToken);

            var purchases = await _context.Purchases.AsNoTracking()
                .Where(x => x.IsActive && x.PurchasingUserId.HasValue && memberIds.Contains(x.PurchasingUserId.Value))
                .Where(x => x.InvoiceDate != null && x.InvoiceDate >= fromDate && x.InvoiceDate <= toDate)
                .Select(x => new { UserId = x.PurchasingUserId!.Value, x.InvoiceDate, x.TotalAmount })
                .ToListAsync(cancellationToken);

            var buckets = new SortedDictionary<DateTime, ScopePerformancePeriodDto>();
            ScopePerformancePeriodDto BucketFor(DateTime date)
            {
                var key = PeriodBucketing.GetBucketStart(date, request.PeriodType);
                if (!buckets.TryGetValue(key, out var bucket))
                {
                    bucket = new ScopePerformancePeriodDto
                    {
                        PeriodStart = key,
                        PeriodEnd = PeriodBucketing.GetNextBucketStart(key, request.PeriodType),
                    };
                    buckets[key] = bucket;
                }
                return bucket;
            }

            var byMember = dto.Members.ToDictionary(x => x.UserId);

            foreach (var sale in sales)
            {
                var bucket = BucketFor(sale.InvoiceDate!.Value);
                bucket.SalesCount++;
                bucket.SaleInvoiceAmount += sale.TotalAmount;
                if (byMember.TryGetValue(sale.UserId, out var member))
                {
                    member.SalesCount++;
                    member.SaleInvoiceAmount += sale.TotalAmount;
                }
            }

            foreach (var purchase in purchases)
            {
                var bucket = BucketFor(purchase.InvoiceDate!.Value);
                bucket.PurchasesCount++;
                bucket.PurchaseInvoiceAmount += purchase.TotalAmount;
                if (byMember.TryGetValue(purchase.UserId, out var member))
                {
                    member.PurchasesCount++;
                    member.PurchaseInvoiceAmount += purchase.TotalAmount;
                }
            }

            foreach (var member in dto.Members)
                member.RoleTitle = member.Role.GetDescription();

            dto.Periods = buckets.Values.ToList();

            res.Data = dto;
            res.Message = "گزارش عملکرد با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
