using Application.Common.Contracts.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WMS.Controllers
{
    /// <summary>
    /// For an uptime ping that keeps the IIS application pool (and the database connection pool) awake, so the first login
    /// after a quiet hour does not pay for the cold start (frontend-requests 20.1). Anonymous on purpose: a ping has no
    /// token. It reveals nothing but "up" or "database unreachable", and runs one trivial query.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class HealthController : ControllerBase
    {
        private readonly IWMSDbContext _context;

        public HealthController(IWMSDbContext context)
        {
            _context = context;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken cancellationToken)
        {
            try
            {
                await _context.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
                return Ok(new { status = "ok" });
            }
            catch (Exception) when (!cancellationToken.IsCancellationRequested)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "database unreachable" });
            }
        }
    }
}
