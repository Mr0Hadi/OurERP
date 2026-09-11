using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos;
using Application.Common.Queries;
using Application.Features.SaleReturn.Dtos;
using Application.Features.SaleReturn.Mappings;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries;

public sealed class GetSaleReturnDetailQuery : IRequest<ResponseDto>
{
    public int Id { get; set; }
}

public sealed class GetSaleReturnDetailQueryHandler(
    IWMSDbContext context,
    ISaleReturnCalculationService calc)
    : IRequestHandler<GetSaleReturnDetailQuery, ResponseDto>
{
    public async Task<ResponseDto> Handle(GetSaleReturnDetailQuery request, CancellationToken cancellationToken)
    {
        // PreviousReturn is Included rather than looked up separately: the FK and its navigation
        // already exist on the entity, so the extra round-trip bought nothing. It is deliberately
        // not filtered by IsActive - a soft-deleted earlier return still gets to name itself in the
        // chain, which is the behaviour the separate lookup had.
        var saleReturn = await context.SaleReturns
            .Where(x => x.Id == request.Id)
            .WhereNotDeleted()
            .WithReturnGraph()
            .Include(x => x.Sale!).ThenInclude(s => s.Customer)
            .Include(x => x.PreviousReturn)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

        // One expression, three flags: cancel, reject and delete are all "nothing has happened yet".
        var untouched = !calc.IsTerminal(saleReturn.Status) && calc.IsUntouched(saleReturn);

        // checked, so a bad row fails loudly instead of wrapping into a plausible-looking huge number.
        var totalAmount = checked((ulong)saleReturn.Claims.Sum(c => checked((long)c.Quantity * (long)c.UnitPrice)));

        var dto = new SaleReturnDetailDto
        {
            Id = saleReturn.Id,
            ReturnNumber = saleReturn.ReturnNumber,
            ReturnDate = saleReturn.ReturnDate,
            SaleId = saleReturn.SaleId,
            SaleInvoiceNumber = saleReturn.Sale!.InvoiceNumber,
            CustomerId = saleReturn.Sale.CustomerId,
            CustomerName = saleReturn.Sale.Customer.FirstName + " " + saleReturn.Sale.Customer.LastName,
            Description = saleReturn.Description,
            PreviousReturnId = saleReturn.PreviousReturnId,
            PreviousReturnNumber = saleReturn.PreviousReturn?.ReturnNumber,
            Status = saleReturn.Status,
            TotalAmount = totalAmount,
            Quantity = saleReturn.Quantity,
            DecidedQuantity = saleReturn.DecidedQuantity,
            RemainingQuantity = saleReturn.RemainingQuantity,
            CanDelete = untouched,
            CanCancel = untouched,
            CanReject = untouched,
            CanReopen = calc.CanReopen(saleReturn.Status),
            Claims = [.. saleReturn.Claims.Select(c => c.ToDto())],
        };

        return ResponseDto.Success("اطلاعات مرجوعی فروش با موفقیت ارسال شد.", dto);
    }
}
