using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries
{
    public class GetPurchaseReturnDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPurchaseReturnDetailQueryHandler : IRequestHandler<GetPurchaseReturnDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseReturnDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Purchase)
                .ThenInclude(x => x.Supplier)
                .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseItem)
                .ThenInclude(x => x.Product)
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            res.Data = new PurchaseReturnDto
            {
                Id = purchaseReturn.Id,
                ReturnNumber = purchaseReturn.ReturnNumber,
                PurchaseId = purchaseReturn.PurchaseId,
                PurchaseInvoiceNumber = purchaseReturn.Purchase.InvoiceNumber,
                SupplierId = purchaseReturn.Purchase.SupplierId,
                SupplierName = purchaseReturn.Purchase.Supplier.CompanyName,
                ReturnDate = purchaseReturn.ReturnDate,
                Status = purchaseReturn.Status,
                Description = purchaseReturn.Description,
                TotalQuantity = purchaseReturn.Items.Sum(x => x.Quantity),
                TotalAmount = (UInt64)purchaseReturn.Items.Sum(x => (long)x.Quantity * (long)x.UnitPrice),
                Items = purchaseReturn.Items.Select(item => new PurchaseReturnItemDto
                {
                    Id = item.Id,
                    PurchaseReturnId = item.PurchaseReturnId,
                    PurchaseItemId = item.PurchaseItemId,
                    ProductId = item.ProductId,
                    ProductCode = item.PurchaseItem.Product.Code,
                    ProductName = item.PurchaseItem.Product.Name,
                    Unit = item.PurchaseItem.Product.Unit.GetDescription(),
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    IssueType = item.IssueType,
                    Note = item.Note,
                    Decisions = (item.Decisions ?? new List<Domain.Entities.PurchaseReturnDecision>()).Select(d => new PurchaseReturnDecisionDto
                    {
                        Id = d.Id,
                        PurchaseReturnItemId = d.PurchaseReturnItemId,
                        DecisionType = d.DecisionType,
                        Quantity = d.Quantity,
                        RefundAmount = d.RefundAmount,
                        Status = d.Status,
                        Note = d.Note,
                        CreatedAt = d.CreatedAt,
                    }).ToList(),
                }).ToList(),
            };

            res.Message = "اطلاعات مرجوعی با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
