using Application.Common.Contracts.Environment;

namespace WMS.Services
{
    public class EnvironmentService : IEnvironmentService
    {

        private readonly IHostEnvironment _env;

        public EnvironmentService(IHostEnvironment env)
        {
            _env = env;
        }

        public bool IsDevelopment()
        {
            return _env.IsDevelopment();
        }
    }
}
