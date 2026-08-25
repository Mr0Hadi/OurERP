using Application.Common.Dtos.Pos;

namespace Application.Common.Contracts.Pos
{
    // Application-facing facade over PosIntegration: callers never see the vendor-specific
    // request/result shapes in PosIntegration.Models, only this DTO and a PosTerminal id. The
    // implementation (Infrastructure/Services/PosPaymentGateway.cs) resolves the terminal's vendor
    // from the database and picks the matching IPosDeviceClient.
    public interface IPosPaymentGateway
    {
        Task<PosChargeResultDto> ChargeAsync(PosChargeRequestDto request, CancellationToken cancellationToken = default);
    }
}
