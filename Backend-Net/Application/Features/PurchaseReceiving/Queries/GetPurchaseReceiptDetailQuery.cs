using Application.Common.Contracts.Repositories;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReceiving.Dtos;
using Common.Exceptions;
using MediatR;

namespace Application.Features.PurchaseReceiving.Queries
{
    public class GetPurchaseReceiptDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPurchaseReceiptDetailQueryHandler : IRequestHandler<GetPurchaseReceiptDetailQuery, ResponseDto>
    {
        private readonly IPurchaseReceiptRepository _purchaseReceiptRepository;

        public GetPurchaseReceiptDetailQueryHandler(IPurchaseReceiptRepository purchaseReceiptRepository)
        {
            _purchaseReceiptRepository = purchaseReceiptRepository;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReceiptDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var receipt = await _purchaseReceiptRepository.GetWithDetailsAsync(request.Id) ?? throw new NotFoundCustomException("رسید خرید مورد نظر یافت نشد.");

            res.Data = new PurchaseReceiptDto
            {
                Id = receipt.Id,
                ReceiptNumber = receipt.ReceiptNumber,
                ReceiptDate = receipt.ReceiptDate,
                Status = receipt.Status,
                Description = receipt.Description,
                PurchaseId = receipt.PurchaseId,
                PurchaseInvoiceNumber = receipt.Purchase.InvoiceNumber,
                SupplierName = receipt.Purchase.Supplier.CompanyName,
                CreatedAt = receipt.CreatedAt,
                Items = receipt.Items.Select(item => new PurchaseReceiptItemDto
                {
                    Id = item.Id,
                    PurchaseReceiptId = item.PurchaseReceiptId,
                    PurchaseItemId = item.PurchaseItemId,
                    ProductName = item.PurchaseItem.Product.Name,
                    QuantityReceived = item.QuantityReceived,
                    UnitCost = item.UnitCost,
                    Discrepancies = item.Discrepancies.Select(d => new ReceiptDiscrepancyDto
                    {
                        Id = d.Id,
                        PurchaseReceiptId = d.PurchaseReceiptId,
                        PurchaseReceiptItemId = d.PurchaseReceiptItemId,
                        Quantity = d.Quantity,
                        DiscrepancyType = d.DiscrepancyType,
                        Reason = d.Reason,
                        Status = d.Status,
                        Decisions = d.Decisions.Select(dd => new DiscrepancyDecisionDto
                        {
                            Id = dd.Id,
                            DiscrepancyId = dd.DiscrepancyId,
                            DecisionType = dd.DecisionType,
                            Quantity = dd.Quantity,
                            UnitCost = dd.UnitCost,
                            Note = dd.Note,
                            CreatedAt = dd.CreatedAt,
                        }).ToList(),
                    }).ToList(),
                }).ToList(),
            };

            res.Message = "اطلاعات رسید خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
