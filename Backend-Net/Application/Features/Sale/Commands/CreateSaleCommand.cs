using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    public class CreateSaleCommand : IRequest<ResponseDto>
    {
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<CreateSaleItemDto> ProductIds { get; set; }
    }

    public class CreateSaleCommandValidator : AbstractValidator<CreateSaleCommand>
    {
        public CreateSaleCommandValidator()
        {
            RuleFor(x => x.InvoiceNumber).NotEmpty().WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.ProductIds).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.ProductIds).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر محصول باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).GreaterThanOrEqualTo(0).WithMessage("تخفیف باید بیشتر یا مساوی صفر باشد.");
            });
            RuleFor(x => x.PaymentDetails).NotEmpty().When(x => x.PaymentType != PaymentTypeEnum.CASH)
                .WithMessage("اطلاعات پرداخت باید به طول کامل پر شود.");
        }
    }

    public class CreateSaleCommandHandler : IRequestHandler<CreateSaleCommand, ResponseDto>
    {
        private readonly IMapper _mapper;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CreateSaleCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _context = context;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<ResponseDto> Handle(CreateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = _mapper.Map<Domain.Entities.Sale>(request);

            await _context.Sales.AddAsync(sale, cancellationToken);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "فروش با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
