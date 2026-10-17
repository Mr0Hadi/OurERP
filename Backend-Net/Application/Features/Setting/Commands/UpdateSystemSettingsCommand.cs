using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Settings;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Settings;
using Application.Features.Setting.Queries;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Setting.Commands
{
    /// <summary>
    /// Changes the listed settings and leaves every other one alone. A null or blank value resets that setting to its default
    /// (its row is deleted). All or nothing: one invalid value refuses the whole request. Answers with the full settings list.
    /// </summary>
    [AuditAction(AuditActionEnum.UpdateSystemSettings)]
    public class UpdateSystemSettingsCommand : IRequest<ResponseDto>
    {
        public List<SystemSettingValueDto> Settings { get; set; } = new();
    }

    public class SystemSettingValueDto
    {
        public string Key { get; set; } = string.Empty;

        /// <summary>Invariant-culture text ("10", "true"); null or blank = back to the default.</summary>
        public string? Value { get; set; }
    }

    public class UpdateSystemSettingsCommandValidator : AbstractValidator<UpdateSystemSettingsCommand>
    {
        public UpdateSystemSettingsCommandValidator()
        {
            RuleFor(x => x.Settings).NotEmpty().WithMessage("هیچ تنظیمی برای ذخیره فرستاده نشده است.");
            RuleFor(x => x.Settings)
                .Must(s => s.Select(i => (i.Key ?? string.Empty).Trim().ToUpperInvariant()).Distinct().Count() == s.Count)
                .WithMessage("هر تنظیم فقط یک‌بار می‌آید.");
            RuleForEach(x => x.Settings).Custom((item, context) =>
            {
                var definition = SystemSettingCatalog.Find(item.Key);
                if (definition == null)
                {
                    context.AddFailure(nameof(SystemSettingValueDto.Key), $"تنظیم «{item.Key}» وجود ندارد.");
                    return;
                }

                if (!string.IsNullOrWhiteSpace(item.Value) && definition.Normalize(item.Value, out var error) == null)
                    context.AddFailure(nameof(SystemSettingValueDto.Value), error!);
            });
        }
    }

    public class UpdateSystemSettingsCommandHandler : IRequestHandler<UpdateSystemSettingsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISystemSettingService _systemSettingService;
        private readonly IUserContextService _userContextService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSystemSettingsCommandHandler(IWMSDbContext context, ISystemSettingService systemSettingService, IUserContextService userContextService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _systemSettingService = systemSettingService;
            _userContextService = userContextService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSystemSettingsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var userId = int.TryParse(_userContextService.GetUserId(), out var id) ? id : (int?)null;
            var now = DateTime.Now;
            var keys = request.Settings.Select(x => SystemSettingCatalog.Find(x.Key)!.Key).ToList();
            var rows = await _context.SystemSettings
                .Where(x => keys.Contains(x.Key))
                .ToDictionaryAsync(x => x.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);

            foreach (var item in request.Settings)
            {
                var definition = SystemSettingCatalog.Find(item.Key)!;
                rows.TryGetValue(definition.Key, out var row);

                if (string.IsNullOrWhiteSpace(item.Value))
                {
                    if (row != null)
                        _context.SystemSettings.Remove(row);
                    continue;
                }

                var value = definition.Normalize(item.Value, out _)!;
                if (row == null)
                {
                    await _context.SystemSettings.AddAsync(new Domain.Entities.SystemSetting
                    {
                        Key = definition.Key,
                        Value = value,
                        UpdatedAt = now,
                        UpdatedByUserId = userId,
                    }, cancellationToken);
                }
                else if (row.Value != value)
                {
                    row.Value = value;
                    row.UpdatedAt = now;
                    row.UpdatedByUserId = userId;
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            _systemSettingService.Invalidate();

            res.Data = await SystemSettingReader.ReadAsync(_context, cancellationToken);
            res.Message = "تنظیمات با موفقیت ذخیره شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
