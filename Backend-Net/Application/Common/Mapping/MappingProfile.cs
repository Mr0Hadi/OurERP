using Application.Common.Dtos;
using Application.Features.Customer.Commands;
using Application.Features.Customer.Dtos;
using Application.Features.Product.Commands;
using Application.Features.Product.Dtos;
using Application.Features.ProductCategory.Commands;
using Application.Features.ProductCategory.Dtos;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
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
			CreateMap<PaymentDetailDto, PaymentDetail>()
				.ForMember(dest => dest.checkNumber, opt => opt.MapFrom(src => src.CheckNumber))
				.ForMember(dest => dest.transferRef, opt => opt.MapFrom(src => src.TransferRef));

			CreateMap<PaymentDetail, PaymentDetailDto>()
				.ForMember(dest => dest.CheckNumber, opt => opt.MapFrom(src => src.checkNumber))
				.ForMember(dest => dest.TransferRef, opt => opt.MapFrom(src => src.transferRef));

			CreateMap<CreateSaleItemDto, SaleItem>();
			CreateMap<UpdateSaleItemDto, SaleItem>();
			CreateMap<CreatePurchaseItemDto, PurchaseItem>();
			CreateMap<PurchaseItem, CreatePurchaseItemDto>();

			CreateMap<CreateSaleCommand, Sale>()
				.ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.ProductIds))
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

            CreateMap<Purchase, CreatePurchaseCommand>()
				.ForMember(dest => dest.ProductItemList, opt => opt.MapFrom(src => src.Items));

			CreateMap<CreatePurchaseCommand, Purchase>()
				.ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.ProductItemList))
				.ForMember(dest => dest.TotalAmount, opt => opt.MapFrom(src => src.TotalPrice))
				.ForMember(dest => dest.PaidAmount, opt => opt.MapFrom(src => src.PaidPrice))
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<CreateProductCommand, Product>()
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			// The entity's ImageUrl column holds the bucket object key (signed URLs expire, so
			// one can't be persisted). The DTO splits that into ImageKey (the stable value) and
			// ImageUrl, which each query handler then fills with a freshly signed URL -
			// AutoMapper can't sign it here because signing needs IObjectStorageService.
			CreateMap<Product, ProductDto>()
				.ForMember(dest => dest.ImageKey, opt => opt.MapFrom(src => src.ImageUrl))
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore());

			CreateMap<CreateProductCategoryCommand, ProductCategory>()
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<ProductCategory, ProductCategoryDto>();

			CreateMap<CreateSupplierCommand, Supplier>()
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<Supplier, SupplierDto>()
				.ForMember(dest => dest.ImageKey, opt => opt.MapFrom(src => src.ImageUrl))
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore());

			CreateMap<CreateCustomerCommand, Customer>()
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<Customer, CustomerDto>()
				.ForMember(dest => dest.ImageKey, opt => opt.MapFrom(src => src.ImageUrl))
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore());

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
					 .ForMember(dest => dest.FirstName, opt => opt.MapFrom(src => src.FisrtName))
					 .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
					 .ForMember(dest => dest.PasswordHash, source => source.MapFrom(e => e.Password.ToHashSHA256()))
					 .ForMember(dest => dest.IsActive, source => source.MapFrom(e => true));

			//CreateMap<UserPermissionDto, tblPermission>();
			//CreateMap<tblPermission, UserPermissionDto>();
		}
	}
}
