using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Common.Audit;
using Domain.Enums;

namespace Application.Features.Product.Commands
{
    /// <summary>
    /// Soft delete. Refused while the product is still physically ours (free, reserved, quarantined or in-transit units, or
    /// Stock) or still on open work (an undelivered purchase line, an unshipped sale line, an open return claim): deleting it
    /// would take it out of every picker while its units and documents stay in the warehouse queues, with no way back
    /// (frontend-requests 15.5).
    /// </summary>
    [AuditAction(AuditActionEnum.DeleteProduct)]
    public class DeleteProductCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, ResponseDto>
    {
        private readonly IProductRepository _productRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IWMSDbContext _context;

        public DeleteProductCommandHandler(IProductRepository productRepository, IUnitOfWork unitOfWork, IWMSDbContext context)
        {
            _productRepository = productRepository;
            _unitOfWork = unitOfWork;
            _context = context;
        }

        public async Task<ResponseDto> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var product = await _productRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("محصول مورد نظر یافت نشد.");

            var heldUnits = await _context.ProductUnits.AnyAsync(x => x.ProductId == product.Id && (x.Status == ProductUnitStatusEnum.IN_STOCK
                || x.Status == ProductUnitStatusEnum.RESERVED || x.Status == ProductUnitStatusEnum.QUARANTINED
                || x.Status == ProductUnitStatusEnum.IN_TRANSIT), cancellationToken);
            if (product.Stock > 0 || heldUnits)
                throw new ValidationCustomException("این کالا در انبار موجودی، رزرو یا قرنطینه دارد و حذف نمی‌شود؛ ابتدا موجودی آن را تعیین تکلیف کنید.");

            var onOpenPurchase = await _context.Purchases.AnyAsync(p => p.IsActive && p.Status != PurchaseStatusEnum.CANCELLED
                && p.Items.Any(i => i.ProductId == product.Id && i.Quantity - i.ReceivedQuantity - i.ShortClosedQuantity > 0), cancellationToken);
            var onOpenSale = await _context.Sales.AnyAsync(s => s.IsActive && s.Status != SalesStatusEnum.CANCELLED
                && s.Items.Any(i => i.ProductId == product.Id && i.ShippedQuantity < i.Quantity), cancellationToken);
            var onOpenReturn =
                await _context.PurchaseReturns.AnyAsync(r => r.IsActive && (r.Status == ReturnStatusEnum.OPEN || r.Status == ReturnStatusEnum.IN_PROGRESS)
                    && r.Claims.Any(c => c.ProductId == product.Id), cancellationToken)
                || await _context.SaleReturns.AnyAsync(r => r.IsActive && (r.Status == ReturnStatusEnum.OPEN || r.Status == ReturnStatusEnum.IN_PROGRESS)
                    && r.Claims.Any(c => c.ProductId == product.Id), cancellationToken);
            if (onOpenPurchase || onOpenSale || onOpenReturn)
                throw new ValidationCustomException("این کالا روی خرید، فروش یا مرجوعیِ باز است و حذف نمی‌شود.");

            product.IsActive = false;

            _productRepository.Update(product);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "محصول با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
