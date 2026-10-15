using Application.Common.Dtos;
using Application.Features.Audit.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AuditController : ControllerBase
    {
        private readonly IMediator _mediator;
        public AuditController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.AuditLogView)]
        [HttpGet("GetAuditEventList")]
        public async Task<ActionResult<ResponseDto>> GetAuditEventList([FromQuery] GetAuditEventListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AuditLogView)]
        [HttpGet("GetAuditEventDetail")]
        public async Task<ActionResult<ResponseDto>> GetAuditEventDetail([FromQuery] GetAuditEventDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.AuditLogView)]
        [HttpGet("GetDocumentHistory")]
        public async Task<ActionResult<ResponseDto>> GetDocumentHistory([FromQuery] GetDocumentHistoryQuery request)
        {
            return await _mediator.Send(request);
        }
    }
}
