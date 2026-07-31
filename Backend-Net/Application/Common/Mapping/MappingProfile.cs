using Application.Common.Dtos;
using Application.Features.Customer.Commands;
using Application.Features.Customer.Dtos;
using Application.Features.Product.Commands;
using Application.Features.Product.Dtos;
using Application.Features.ProductCategory.Commands;
using Application.Features.ProductCategory.Dtos;
using Application.Features.Purchase.Commands;
using Application.Features.Sale.Commands;
using Application.Features.Supplier.Commands;
using Application.Features.Supplier.Dtos;
using Application.Features.User.Command;
using Application.Features.User.Dto;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;

namespace Application.Common.Mapping
{
	public class MappingProfile : Profile
	{
		public MappingProfile()
		{
			CreateMap<CreateSaleCommand, Sale>();

            CreateMap<Purchase, CreatePurchaseCommand>();

			CreateMap<CreateProductCommand, Product>();

			CreateMap<Product, ProductDto>();

			CreateMap<CreateProductCategoryCommand, ProductCategory>();

			CreateMap<ProductCategory, ProductCategoryDto>();

			CreateMap<CreateSupplierCommand, Supplier>()
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now));

			CreateMap<Supplier, SupplierDto>();

			CreateMap<CreateCustomerCommand, Customer>()
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now));

			CreateMap<Customer, CustomerDto>();

			CreateMap<User, TokenUserInfoDto>()
				.ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name));

			CreateMap<User, UserInfoDto>()
				.ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name));
			//.ForMember(dest => dest.Permissions, opt => opt.MapFrom(src => src.Permissions.Select(x => new UserPermissionDto
			//{
			//	Id = x.Id,
			//	Title = x.Title,
			//	FaTitle = x.FaTitle,
			//	PermissionGroupId = x.PermissionGroupId
			//}).ToList()));

			CreateMap<User, UserUpdateDto>()
				.ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.Name));
			//.ForMember(dest => dest.Permissions, opt => opt.MapFrom(src => src.Permissions));

			CreateMap<CreateUserCommand, User>()
					 .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
					 .ForMember(dest => dest.PasswordHash, source => source.MapFrom(e => e.Password.ToHashSHA256()))
					 .ForMember(dest => dest.IsActive, source => source.MapFrom(e => true));

			//CreateMap<UserPermissionDto, tblPermission>();
			//CreateMap<tblPermission, UserPermissionDto>();
		}
	}
}
