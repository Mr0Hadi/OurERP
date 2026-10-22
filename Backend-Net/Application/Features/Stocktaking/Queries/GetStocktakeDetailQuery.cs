using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;

namespace Application.Features.Stocktaking.Queries
{
    /// <summary>
    /// One stocktake with every line, its count and - unless counting blind - the system quantity and the differences approval
    /// would apply (StocktakeVariance), with their value at the current average cost.
    /// </summary>
    public class GetStocktakeDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetStocktakeDetailQueryHandler : IRequestHandler<GetStocktakeDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetStocktakeDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetStocktakeDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            res.Data = await StocktakeReader.ReadAsync(_context, request.Id, cancellationToken);
            res.Message = "جزئیات انبارگردانی ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
