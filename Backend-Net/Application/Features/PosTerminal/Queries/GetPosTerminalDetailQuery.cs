using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PosTerminal.Dtos;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PosTerminal.Queries
{
    public class GetPosTerminalDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPosTerminalDetailQueryHandler : IRequestHandler<GetPosTerminalDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetPosTerminalDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetPosTerminalDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var dto = await _context.PosTerminals
                .Where(x => x.Id == request.Id)
                .Select(x => new PosTerminalDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Vendor = x.Vendor,
                    Host = x.Host,
                    Port = x.Port,
                    ComPort = x.ComPort,
                    TerminalId = x.TerminalId,
                    MerchantId = x.MerchantId
                })
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("دستگاه کارتخوان مورد نظر یافت نشد.");

            res.Data = dto;
            res.Message = "اطلاعات دستگاه کارتخوان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
