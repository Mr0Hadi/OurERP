using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;

namespace Application.Features.Warehousing.Queries
{
    /// <summary>One transfer with the units that travelled, per product.</summary>
    public class GetStockTransferDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetStockTransferDetailQueryHandler : IRequestHandler<GetStockTransferDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetStockTransferDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetStockTransferDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            res.Data = await StockTransferReader.ReadAsync(_context, request.Id, cancellationToken);
            res.Message = "جزئیات حواله ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
