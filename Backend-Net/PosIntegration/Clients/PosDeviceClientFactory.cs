using PosIntegration.Models;

namespace PosIntegration.Clients
{
    public class PosDeviceClientFactory : IPosDeviceClientFactory
    {
        private readonly IEnumerable<IPosDeviceClient> _clients;

        public PosDeviceClientFactory(IEnumerable<IPosDeviceClient> clients)
        {
            _clients = clients;
        }

        public IPosDeviceClient GetClient(PosVendor vendor)
        {
            return _clients.FirstOrDefault(x => x.Vendor == vendor)
                ?? throw new InvalidOperationException($"هیچ کلاینت اتصال به کارتخوان برای {vendor} ثبت نشده است.");
        }
    }
}
