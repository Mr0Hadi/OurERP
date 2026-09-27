using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;

namespace Application.Features.Sale.Queries
{
    public class GetSaleDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSaleDetailQueryHandler : IRequestHandler<GetSaleDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        public GetSaleDetailQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
        }
        public async Task<ResponseDto> Handle(GetSaleDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, request.Id, cancellationToken);

            res.Message = "اطلاعات فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
