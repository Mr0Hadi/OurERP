using PosIntegration.Models;

namespace PosIntegration.Clients
{
    public interface IPosDeviceClientFactory
    {
        IPosDeviceClient GetClient(PosVendor vendor);
    }
}
