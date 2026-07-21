using AutoMapper;

namespace Application.Common.Mapping
{
	public class MappingProfile : Profile
	{
		public MappingProfile()
		{

			//CreateMap<tblUser, TokenUserInfoDto>()
			//	.ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name));

			//CreateMap<tblUser, UserInfoDto>()
			//	.ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name))
			//	.ForMember(dest => dest.Permissions, opt => opt.MapFrom(src => src.Permissions.Select(x => new UserPermissionDto
			//	{
			//		Id = x.Id,
			//		Title = x.Title,
			//		FaTitle = x.FaTitle,
			//		PermissionGroupId = x.PermissionGroupId
			//	}).ToList()));

			//CreateMap<tblUser, UserUpdateDto>()
			//	.ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name))
			//	.ForMember(dest => dest.Permissions, opt => opt.MapFrom(src => src.Permissions));

			//CreateMap<CreateSenderApplicationCommand, tblSenderApplication>()
			//	.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true))
			//	.ForMember(dest => dest.UseOldApi, opt => opt.MapFrom(src => false))
			//	.ForMember(dest => dest.EnName, opt => opt.MapFrom(src => src.EnName.Trim().Replace(" ", "-")));
			
			//CreateMap<CreateUserCommand, tblUser>()
   //         .ForMember(dest => dest.InsertDate, opt => opt.MapFrom(src => DateTime.Now))
   //         .ForMember(dest => dest.Password, source => source.MapFrom(e => e.Password.ToHashSHA256()))
   //         .ForMember(dest => dest.IsActive, source => source.MapFrom(e => true))
   //         .ForMember(dest => dest.ForceChangePassword, source => source.MapFrom(e => true))
   //         .ForMember(dest => dest.SendOtpCount, source => source.MapFrom(e => 0));

			//CreateMap<UserPermissionDto, tblPermission>();
			//CreateMap<tblPermission, UserPermissionDto>();

			//CreateMap<tblBulkSms, BulkSmsDto>()
			//	.ForMember(dest => dest.SenderApplicationTitle, opt => opt.MapFrom(src => src.SenderApplication.Name));

			//CreateMap<SendBulkSmsCommand, tblBulkSms>()
			//	.ForMember(dest => dest.InsertDate, opt => opt.MapFrom(src => DateTime.Now))
			//	.ForMember(dest => dest.SmsList, opt => opt.MapFrom(src => src.Mobiles.Distinct().ToList()
			//		.Select(x => new tblSms()
			//		{
			//			Mobile = x,
			//			Message = src.Message,
			//			InsertDate = DateTime.Now,
			//			SenderApplicationId = src.ApplicationId,
			//			IsComplete = false,
			//			ProviderId = null,
			//			ProviderSmsId = null,
			//			StateId = null,
			//			IsOtp = false,
			//			SmsQueue = new tblSmsQueue()
			//			{
			//				Message = src.Message,
			//				Mobile = x
			//			}
			//		}).ToList()))
			//	.ForMember(dest => dest.Receivers, opt => opt.MapFrom(src => src.Mobiles.Distinct().ToList()))
			//	.ForMember(dest => dest.SenderApplicationId, opt => opt.MapFrom(src => src.ApplicationId));
		}
	}
}
