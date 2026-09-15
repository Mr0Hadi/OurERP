using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using MediatR;

namespace Application.Features.PurchaseReturn.Queries;

public sealed class GetPurchaseReturnDetailQuery : IRequest<ResponseDto>
{
    public int Id { get; set; }
}

public sealed class GetPurchaseReturnDetailQueryHandler(
    IWMSDbContext context,
    IPurchaseReturnCalculationService calc,
    IObjectStorageService storage)
    : IRequestHandler<GetPurchaseReturnDetailQuery, ResponseDto>
{
    // The document itself is built by PurchaseReturnDetailReader, which every write command on a
    // return also answers with - one shape, one definition.
    public async Task<ResponseDto> Handle(GetPurchaseReturnDetailQuery request, CancellationToken cancellationToken)
    {
        var dto = await PurchaseReturnDetailReader.ReadAsync(context, calc, storage, request.Id, cancellationToken);
        return ResponseDto.Success("اطلاعات مرجوعی با موفقیت ارسال شد.", dto);
    }
}
