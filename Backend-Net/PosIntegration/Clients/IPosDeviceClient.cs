using PosIntegration.Models;

namespace PosIntegration.Clients
{
    public interface IPosDeviceClient
    {
        PosVendor Vendor { get; }

        Task<PosSaleResult> SaleAsync(PosSaleRequest request, CancellationToken cancellationToken = default);
    }
}
