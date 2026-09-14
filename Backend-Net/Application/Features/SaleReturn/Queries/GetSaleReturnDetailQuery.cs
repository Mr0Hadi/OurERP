using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos;
using MediatR;

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
    // The document itself is built by SaleReturnDetailReader, which every write command on a
    // return also answers with - one shape, one definition.
    public async Task<ResponseDto> Handle(GetSaleReturnDetailQuery request, CancellationToken cancellationToken)
    {
        var dto = await SaleReturnDetailReader.ReadAsync(context, calc, request.Id, cancellationToken);
        return ResponseDto.Success("اطلاعات مرجوعی فروش با موفقیت ارسال شد.", dto);
    }
}
