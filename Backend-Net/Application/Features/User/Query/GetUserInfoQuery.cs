using Application.Common.Contracts.Repository;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.User.Dtos;
using AutoMapper;
using CommonUtilities.Exceptions;
using CommonUtilities.Extensions;
using MediatR;

namespace Application.Features.User.Queries
{
    public class GetUserInfoQuery : IRequest<ResponseDto>
    {
    }

    public class GetUserInfoQueryHandler : IRequestHandler<GetUserInfoQuery, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserContextService _userContextService;
        private readonly IMapper _mapper;

		public GetUserInfoQueryHandler(IUserContextService userContextService, IUserRepository userRepository, IMapper mapper)
		{
			_userContextService = userContextService;
			_userRepository = userRepository;
			_mapper = mapper;
		}

		public async Task<ResponseDto> Handle(GetUserInfoQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var userId = _userContextService.GetUserId().ToInt();

            var user = await _userRepository.GetByIdAsync(userId) ?? throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد.");

            res.Data = _mapper.Map<UserInfoDto>(user);

            res.Message = "اطلاعات کاربر با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

}
