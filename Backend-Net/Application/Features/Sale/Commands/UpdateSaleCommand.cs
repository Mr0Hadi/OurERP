using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    public class UpdateSaleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetail> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<SaleItem> Items { get; set; }
    }

    public class UpdateSaleCommandValidator : AbstractValidator<UpdateSaleCommand>
    {
        public UpdateSaleCommandValidator()
        {
            RuleFor(x => x.InvoiceNumber).NotEmpty().WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleFor(x => x.PaymentDetails).NotEmpty().When(x => x.PaymentType != PaymentTypeEnum.CASH)
                .WithMessage("اطلاعات پرداخت باید به طول کامل پر شود.");
        }
    }

    public class UpdateSaleCommandHandler : IRequestHandler<UpdateSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSaleCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Where(x => x.Id == request.Id).FirstOrDefaultAsync() ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            sale.InvoiceNumber = request.InvoiceNumber;
            sale.InvoiceDate = request.InvoiceDate;
            sale.Status = request.Status;
            sale.PaymentType = request.PaymentType;
            sale.TotalAmount = request.TotalAmount;
            sale.PaidAmount = request.PaidAmount;
            sale.Description = request.Description;
            sale.CustomerId = request.CustomerId;
            sale.Items = request.Items,
            sale.UpdatedAt = DateTime.Now;

            _context.Sales.Update(sale);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
