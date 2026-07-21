using Application.Common.Dtos;
using MediatR;

namespace Application.Features.User.Command
{
    public class CreateUserCommand : IRequest<ResponseDto>
    {
        public string FirstName { get; set; }
    }
}
