using Application.Common.Contracts.Pos;
using Application.Common.Contracts.Repositories;
using Application.Common.Dtos.Pos;
using Common.Exceptions;
using PosIntegration.Clients;
using PosIntegration.Models;

namespace Infrastructure.Services
{
    // The one place that bridges the Application layer's PosTerminal-id-based request to
    // PosIntegration's vendor-specific clients: loads the terminal's connection info, picks the
    // matching IPosDeviceClient via the factory, and maps the result back to a plain DTO.
    public class PosPaymentGateway : IPosPaymentGateway
    {
        private readonly IPosTerminalRepository _posTerminalRepository;
        private readonly IPosDeviceClientFactory _clientFactory;

        public PosPaymentGateway(IPosTerminalRepository posTerminalRepository, IPosDeviceClientFactory clientFactory)
        {
            _posTerminalRepository = posTerminalRepository;
            _clientFactory = clientFactory;
        }

        public async Task<PosChargeResultDto> ChargeAsync(PosChargeRequestDto request, CancellationToken cancellationToken = default)
        {
            var terminal = await _posTerminalRepository.GetByIdAsync(request.PosTerminalId, cancellationToken)
                ?? throw new NotFoundCustomException("دستگاه کارتخوان مورد نظر یافت نشد.");

            if (!terminal.IsActive)
            {
                throw new ValidationCustomException("دستگاه کارتخوان انتخاب شده غیرفعال است.");
            }

            // Domain.Enums.PosVendorEnum and PosIntegration.Models.PosVendor are kept numerically
            // identical on purpose (Melli=1, Parsian=2, Samankish=3) so PosIntegration - a
            // standalone class library with no reference to Domain - doesn't need its own copy
            // reconciled by hand; PosDeviceClientFactoryTests (if added) should assert this parity.
            var vendor = (PosVendor)(int)terminal.Vendor;

            var client = _clientFactory.GetClient(vendor);

            var saleRequest = new PosSaleRequest
            {
                Amount = request.Amount,
                InvoiceNumber = request.InvoiceNumber,
                AdditionalData = request.AdditionalData ?? "",
                Host = terminal.Host,
                Port = terminal.Port,
                ComPort = terminal.ComPort,
                TerminalId = terminal.TerminalId,
                MerchantId = terminal.MerchantId
            };

            var result = await client.SaleAsync(saleRequest, cancellationToken);

            return new PosChargeResultDto
            {
                IsSuccess = result.IsSuccess,
                ResponseCode = result.ResponseCode,
                ResponseMessage = result.ResponseMessage,
                Rrn = result.Rrn,
                ApprovalCode = result.ApprovalCode,
                MaskedCardNumber = result.MaskedCardNumber,
                TerminalId = result.TerminalId,
                TransactionDate = result.TransactionDate
            };
        }
    }
}
