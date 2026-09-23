using Application.Features.Department.Commands;
using Application.Features.Department.Queries;
using Application.Common.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Domain.Enums;
using WMS.Authorization;

namespace WMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DepartmentController : ControllerBase
    {
        private readonly IMediator _mediator;
        public DepartmentController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HasPermission(PermissionEnum.DepartmentView)]
        [HttpGet("GetDepartmentList")]
        public async Task<ActionResult<ResponseDto>> GetDepartmentList([FromQuery] GetDepartmentListQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.DepartmentView)]
        [HttpGet("GetDepartmentDetail")]
        public async Task<ActionResult<ResponseDto>> GetDepartmentDetail([FromQuery] GetDepartmentDetailQuery request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.DepartmentManage)]
        [HttpPost("CreateDepartment")]
        public async Task<ActionResult<ResponseDto>> CreateDepartment([FromBody] CreateDepartmentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.DepartmentManage)]
        [HttpPut("UpdateDepartment")]
        public async Task<ActionResult<ResponseDto>> UpdateDepartment([FromBody] UpdateDepartmentCommand request)
        {
            return await _mediator.Send(request);
        }

        [HasPermission(PermissionEnum.DepartmentManage)]
        [HttpDelete("DeleteDepartment")]
        public async Task<ActionResult<ResponseDto>> DeleteDepartment([FromQuery] DeleteDepartmentCommand request)
        {
            return await _mediator.Send(request);
        }
    }
}
