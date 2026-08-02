using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReceiving.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReceiving.Commands
{
    public class CreatePurchaseReceiptCommand : IRequest<ResponseDto>
    {
        public int PurchaseId { get; set; }
        public string? Description { get; set; }
        public List<CreatePurchaseReceiptItemDto> Items { get; set; }
        public DateTime ReceiptDate { get; set; }
        public string DeliveryName { get; set; }
        public string DeliveryNationalCode { get; set; }
        public string? DeliveryVehiclePlack { get; set; }
    }

    public class CreatePurchaseReceiptCommandValidator : AbstractValidator<CreatePurchaseReceiptCommand>
    {
        public CreatePurchaseReceiptCommandValidator()
        {
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اقلام دریافتی"));
            RuleFor(x => x.ReceiptDate).NotEmpty().WithMessage(Validation.RequiredMessage("تاریخ دریافت"));
            RuleFor(x => x.DeliveryName).NotEmpty().WithMessage(Validation.RequiredMessage("نام تحویل دهنده"));
            RuleFor(x => x.DeliveryNationalCode).NotEmpty().WithMessage(Validation.RequiredMessage("کد ملی تحویل دهنده"));
            RuleForEach(x => x.Items).ChildRules(items =>
            {
                items.RuleFor(i => i.PurchaseItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("قلم خرید"));
                items.RuleFor(i => i.QuantityReceived).GreaterThan(0).WithMessage("تعداد دریافتی باید بیشتر از صفر باشد.");
            });
        }
    }

    public class CreatePurchaseReceiptCommandHandler : IRequestHandler<CreatePurchaseReceiptCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReceiptRepository _purchaseReceiptRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CreatePurchaseReceiptCommandHandler(IWMSDbContext context, IPurchaseReceiptRepository purchaseReceiptRepository, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReceiptRepository = purchaseReceiptRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreatePurchaseReceiptCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status != PurchaseStatusEnum.SHIPPED)
                throw new ValidationCustomException("فقط خریدهای با وضعیت ارسال‌شده قابل دریافت هستند.");

            var items = new List<PurchaseReceiptItem>();
            foreach (var item in request.Items)
            {
                var purchaseItem = purchase.Items.FirstOrDefault(x => x.Id == item.PurchaseItemId)
                    ?? throw new ValidationCustomException("یکی از اقلام خرید یافت نشد.");

                if (item.QuantityReceived > purchaseItem.Quantity)
                    throw new ValidationCustomException($"تعداد دریافتی «{purchaseItem.Product?.Name}» بیشتر از تعداد سفارش‌ داده ‌شده است.");

                items.Add(new PurchaseReceiptItem
                {
                    PurchaseItemId = purchaseItem.Id,
                    QuantityReceived = item.QuantityReceived,
                }); 
            }

            var seq = await _context.PurchaseReceipts.CountAsync(x => x.ReceiptNumber.StartsWith($"RCV-{DateTime.Now.Year}-")) + 1;

            var receipt = new PurchaseReceipt
            {
                ReceiptNumber = Generator.GenerateReceiptNumber(seq),
                ReceiptDate = DateTime.Now,
                Status = PurchaseReceiptStatusEnum.RECEIVING,
                Description = request.Description,
                PurchaseId = purchase.Id,
                Items = items,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            };

            await _purchaseReceiptRepository.AddAsync(receipt);
            purchase.Status = PurchaseStatusEnum.RECEIVING;

            await _unitOfWork.SaveChangesAsync();

            res.Data = new { Id = receipt.Id, ReceiptNumber = receipt.ReceiptNumber };
            res.Message = "دریافت خرید با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
