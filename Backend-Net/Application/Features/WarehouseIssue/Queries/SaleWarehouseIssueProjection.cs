using System.Linq.Expressions;
using Application.Common.Contracts.Context;
using Application.Features.WarehouseIssue.Dtos;
using Common.Extensions;

namespace Application.Features.WarehouseIssue.Queries
{
    /// <summary>The one projection of a SaleWarehouseIssue row, shared by the list and by the resolve command's answer.</summary>
    internal static class SaleWarehouseIssueProjection
    {
        public static Expression<Func<Domain.Entities.SaleWarehouseIssue, SaleWarehouseIssueDto>> ToDto(IWMSDbContext context) => x => new SaleWarehouseIssueDto
        {
            Id = x.Id,
            SaleId = x.SaleId,
            CustomerId = x.Sale.CustomerId,
            CustomerName = x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName,
            ProductId = x.ProductId,
            ProductName = x.Product.Name,
            ProductCode = x.Product.Code,
            ProductUnitId = x.ProductUnitId,
            Barcode = x.ProductUnit.Barcode,
            UnitStatus = x.ProductUnit.Status,
            QuarantineCost = x.ProductUnit.QuarantineCost,
            Reason = x.Reason,
            Description = x.Description,
            ReportedByUserId = x.ReportedByUserId,
            ReportedByName = context.Users.Where(u => u.Id == x.ReportedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
            ReportedAt = x.ReportedAt,
            Resolution = x.Resolution,
            ResolutionNote = x.ResolutionNote,
            ResolvedByUserId = x.ResolvedByUserId,
            ResolvedByName = context.Users.Where(u => u.Id == x.ResolvedByUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
            ResolvedAt = x.ResolvedAt,
        };

        /// <summary>Persian titles; enum descriptions are not SQL-translatable, so they are filled after materialising.</summary>
        public static void FillTitles(SaleWarehouseIssueDto dto)
        {
            dto.ReasonTitle = dto.Reason.GetDescription();
            dto.ResolutionTitle = dto.Resolution?.GetDescription();
        }
    }
}
