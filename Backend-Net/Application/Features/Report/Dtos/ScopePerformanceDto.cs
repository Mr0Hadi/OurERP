using Domain.Enums;

namespace Application.Features.Report.Dtos
{
    public class ScopePerformanceDto
    {
        public ReportScopeEnum Scope { get; set; }

        /// <summary>Empty for ME, the team's name for TEAM, the department's name for DEPARTMENT.</summary>
        public string ScopeName { get; set; } = string.Empty;
        public List<ScopePerformancePeriodDto> Periods { get; set; } = new();

        /// <summary>Empty for ME. Every active current member otherwise, including those with nothing in the range.</summary>
        public List<ScopePerformanceMemberDto> Members { get; set; } = new();
    }

    public class ScopePerformancePeriodDto
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public int SalesCount { get; set; }
        public UInt64 SaleInvoiceAmount { get; set; }
        public int PurchasesCount { get; set; }
        public UInt64 PurchaseInvoiceAmount { get; set; }
    }

    public class ScopePerformanceMemberDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public OrgRoleEnum Role { get; set; }
        public string RoleTitle { get; set; } = string.Empty;
        public int? TeamId { get; set; }
        public string? TeamName { get; set; }
        public int SalesCount { get; set; }
        public UInt64 SaleInvoiceAmount { get; set; }
        public int PurchasesCount { get; set; }
        public UInt64 PurchaseInvoiceAmount { get; set; }
    }
}
