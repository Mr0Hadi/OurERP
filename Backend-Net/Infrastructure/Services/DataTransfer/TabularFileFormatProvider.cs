using Application.Common.Contracts.DataTransfer;
using Application.Common.DataTransfer;
using Common.Exceptions;

namespace Infrastructure.Services.DataTransfer
{
    public class TabularFileFormatProvider : ITabularFileFormatProvider
    {
        private readonly Dictionary<DataTransferFormatEnum, ITabularFileFormat> _formats;

        public TabularFileFormatProvider(IEnumerable<ITabularFileFormat> formats)
        {
            _formats = formats.ToDictionary(f => f.Format);
        }

        public ITabularFileFormat Get(DataTransferFormatEnum format)
            => _formats.TryGetValue(format, out var implementation)
                ? implementation
                : throw new ValidationCustomException("این قالب فایل پشتیبانی نمی‌شود.");
    }
}
