using Application.Common.Contracts.Settings;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Settings;
using Domain.Enums;
using MediatR;

namespace Application.Features.Setting.Queries
{
    /// <summary>
    /// The public settings (IsPublic in the catalogue) as key -> value, for every signed-in user: the frontend reads it once
    /// after login to show or hide whole features (warehouses menu, warehouse pickers, ...). No permission needed - it only
    /// says what is switched on, never anything sensitive.
    /// </summary>
    public class GetFeatureFlagsQuery : IRequest<ResponseDto>
    {
    }

    public class GetFeatureFlagsQueryHandler : IRequestHandler<GetFeatureFlagsQuery, ResponseDto>
    {
        private readonly ISystemSettingService _systemSettingService;

        public GetFeatureFlagsQueryHandler(ISystemSettingService systemSettingService)
        {
            _systemSettingService = systemSettingService;
        }

        public async Task<ResponseDto> Handle(GetFeatureFlagsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var flags = new Dictionary<string, object>();
            foreach (var setting in SystemSettingCatalog.All.Where(x => x.IsPublic))
            {
                flags[setting.Key] = setting.Type switch
                {
                    SystemSettingTypeEnum.BOOLEAN => await _systemSettingService.GetBooleanAsync(setting, cancellationToken),
                    SystemSettingTypeEnum.INTEGER => await _systemSettingService.GetIntegerAsync(setting, cancellationToken),
                    _ => await _systemSettingService.GetTextAsync(setting, cancellationToken),
                };
            }

            res.Data = flags;
            res.Message = "وضعیت قابلیت‌ها ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
