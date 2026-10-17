using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;

namespace Application.Features.Setting.Queries
{
    /// <summary>The settings page: every setting, grouped, with its value, default, limits and who last changed it.</summary>
    public class GetSystemSettingsQuery : IRequest<ResponseDto>
    {
    }

    public class GetSystemSettingsQueryHandler : IRequestHandler<GetSystemSettingsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSystemSettingsQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSystemSettingsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = await SystemSettingReader.ReadAsync(_context, cancellationToken);
            res.Message = "تنظیمات با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
