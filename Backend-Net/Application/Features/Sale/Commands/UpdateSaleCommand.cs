using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
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
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<int> ProductIds { get; set; }
    }

    public class UpdateSaleCommandValidator : AbstractValidator<UpdateSaleCommand>
    {
        public UpdateSaleCommandValidator()
        {
            RuleFor(x => x.InvoiceNumber).NotEmpty().WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.ProductIds).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
        }
    }

    public class UpdateSaleCommandHandler : IRequestHandler<UpdateSaleCommand, ResponseDto>
    {
        private readonly ISaleRepository _saleRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSaleCommandHandler(ISaleRepository saleRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _saleRepository = saleRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _saleRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            var products = await _context.Products
                .Where(x => request.ProductIds.Contains(x.Id))
                .ToListAsync();

            sale.InvoiceNumber = request.InvoiceNumber;
            sale.InvoiceDate = request.InvoiceDate;
            sale.Status = request.Status;
            sale.PaymentType = request.PaymentType;
            sale.TotalAmount = request.TotalAmount;
            sale.PaidAmount = request.PaidAmount;
            sale.Description = request.Description;
            sale.CustomerId = request.CustomerId;
            sale.Item = products;
            sale.UpdatedAt = DateTime.Now;

            _saleRepository.Update(sale);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
