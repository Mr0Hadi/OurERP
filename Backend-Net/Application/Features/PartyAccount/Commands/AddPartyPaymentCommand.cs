using Application.Common.Audit;
using Application.Common.Contracts.BankAccounts;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Pos;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Ledger;
using Application.Common.Payments;
using Application.Features.PartyAccount.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PartyAccount.Commands
{
    /// <summary>
    /// Money received from a customer or paid to a supplier with no invoice (علی‌الحساب) - GAP-03 / frontend-requests 22.1.
    /// It is an ordinary payment row with the party on it instead of a document: it moves the party's balance at once (party
    /// ledger PAYMENT) and the chosen cash box / bank account. It can be applied to invoices now (Allocations), later
    /// (AllocatePartyPayment), or never - unallocated money simply stays on the party's account.
    ///
    /// Direction defaults to the party's natural one: IN from a customer, OUT to a supplier. The other way round is a refund
    /// of a credit balance (money back to a customer, a supplier refunding us); such a payment is never allocated.
    /// </summary>
    [AuditAction(AuditActionEnum.AddPartyPayment)]
    public class AddPartyPaymentCommand : PaymentInput, IRequest<ResponseDto>
    {
        /// <summary>Exactly one of CustomerId / SupplierId.</summary>
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }

        /// <summary>IN = money we received, OUT = money we paid. Default: IN for a customer, OUT for a supplier.</summary>
        public PaymentDirectionEnum? Direction { get; set; }

        public string? Description { get; set; }

        /// <summary>Optional: apply (part of) it to invoices right away. The rest stays unallocated.</summary>
        public List<PaymentAllocationInput> Allocations { get; set; } = new();
    }

    public class AddPartyPaymentCommandValidator : AbstractValidator<AddPartyPaymentCommand>
    {
        public AddPartyPaymentCommandValidator()
        {
            Include(new PaymentInputValidator());
            RuleFor(x => x).Must(x => x.CustomerId.HasValue != x.SupplierId.HasValue)
                .WithMessage("دقیقاً یکی از مشتری یا تامین‌کننده را انتخاب کنید.");
            RuleFor(x => x.Direction).IsInEnum().When(x => x.Direction.HasValue).WithMessage("جهت پرداخت نامعتبر است.");
            RuleFor(x => x.Description).MaximumLength(500).WithMessage("شرح حداکثر ۵۰۰ نویسه است.");
            RuleFor(x => x.Allocations).SetValidator(new PaymentAllocationInputValidator());
        }
    }

    public class AddPartyPaymentCommandHandler : IRequestHandler<AddPartyPaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPosPaymentGuard _posPaymentGuard;
        private readonly IPaymentAccountResolver _paymentAccountResolver;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public AddPartyPaymentCommandHandler(IWMSDbContext context, IPosPaymentGuard posPaymentGuard, IPaymentAccountResolver paymentAccountResolver, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _posPaymentGuard = posPaymentGuard;
            _paymentAccountResolver = paymentAccountResolver;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddPartyPaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await _posPaymentGuard.CheckAsync(new[] { request }, cancellationToken);

            if (request.CustomerId.HasValue && !await _context.Customers.AnyAsync(x => x.Id == request.CustomerId && x.IsActive, cancellationToken))
                throw new NotFoundCustomException("مشتری مورد نظر یافت نشد.");
            if (request.SupplierId.HasValue && !await _context.Suppliers.AnyAsync(x => x.Id == request.SupplierId && x.IsActive, cancellationToken))
                throw new NotFoundCustomException("تامین‌کننده‌ی مورد نظر یافت نشد.");

            var direction = request.Direction ?? (request.CustomerId.HasValue ? DocumentPayments.SaleDirection : DocumentPayments.PurchaseDirection);
            var payment = PaymentWriter.NewRow(request, direction);
            payment.CustomerId = request.CustomerId;
            payment.SupplierId = request.SupplierId;
            payment.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            await _paymentAccountResolver.ApplyAsync(new[] { payment }, cancellationToken);

            await _context.PaymentDetails.AddAsync(payment, cancellationToken);
            await PartyLedger.OnAccountPaymentAsync(_context, payment, cancellationToken);

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            await PaymentAllocator.AllocateAsync(_context, payment, request.Allocations, userId, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PartyPaymentReader.ReadAsync(_context, payment.Id, cancellationToken);
            res.Message = direction == PaymentDirectionEnum.IN ? "دریافت علی‌الحساب ثبت شد." : "پرداخت علی‌الحساب ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
