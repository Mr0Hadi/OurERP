using Application.Common.Contracts.Repositories;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.User.Dto;
using AutoMapper;
using Common.Exceptions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Query
{
	public class GetUserUpdateQuery : IRequest<ResponseDto>
	{
		public int Id { get; set; }
	}

	public class GetUserUpdateQueryHandler : IRequestHandler<GetUserUpdateQuery, ResponseDto>
	{
		private readonly IUserRepository _userRepository;
		private readonly IMapper _mapper;
		public GetUserUpdateQueryHandler(IUserRepository userRepository, IMapper mapper)
		{
			_userRepository = userRepository;
			_mapper = mapper;
		}

		public async Task<ResponseDto> Handle(GetUserUpdateQuery request, CancellationToken cancellationToken)
		{
			var res = new ResponseDto();

			var user = await _userRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد.");

			res.Data = _mapper.Map<UserUpdateDto>(user);

			res.Message = "اطلاعات کاربر با موفقیت ارسال شد";
			res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
			return res;
		}
	}
}