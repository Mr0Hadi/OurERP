using Application.Common.Payments;
using Application.Common.Dtos;
using Application.Features.Customer.Commands;
using Application.Features.Customer.Dtos;
using Application.Features.Department.Commands;
using Application.Features.PosTerminal.Commands;
using Application.Features.Team.Commands;
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
using Domain.Enums;

namespace Application.Common.Mapping
{
	public class MappingProfile : Profile
	{
		public MappingProfile()
		{
			// شناسه و کلیدهای خارجی هرگز از ورودی کلاینت نمی‌آیند - handler خودش آن‌ها را می‌نشاند.
			CreateMap<PaymentDetailDto, PaymentDetail>()
				.ForMember(dest => dest.Id, opt => opt.Ignore())
				.ForMember(dest => dest.PurchaseId, opt => opt.Ignore())
				.ForMember(dest => dest.Purchase, opt => opt.Ignore())
				.ForMember(dest => dest.SaleId, opt => opt.Ignore())
				.ForMember(dest => dest.Sale, opt => opt.Ignore())
				// Direction is the document's own (the handler sets it); a row is never born voided.
				.ForMember(dest => dest.Direction, opt => opt.Ignore())
				.ForMember(dest => dest.VoidedAt, opt => opt.Ignore())
				.ForMember(dest => dest.PosTerminal, opt => opt.Ignore())
				.ForMember(dest => dest.TransferRef, opt => opt.MapFrom(src => src.TransferRef == null ? null : src.TransferRef.Trim()))
				.ForMember(dest => dest.Source, opt => opt.MapFrom(src => PaymentWriter.SourceOf(src)))
				.ForMember(dest => dest.RecordedAt, opt => opt.Ignore())
				.ForMember(dest => dest.RecordedByUserId, opt => opt.Ignore())
				.ForMember(dest => dest.RecordedByUser, opt => opt.Ignore())
				// A document's payment row: the party is the document's, and on-account fields stay empty.
				.ForMember(dest => dest.CustomerId, opt => opt.Ignore())
				.ForMember(dest => dest.Customer, opt => opt.Ignore())
				.ForMember(dest => dest.SupplierId, opt => opt.Ignore())
				.ForMember(dest => dest.Supplier, opt => opt.Ignore())
				.ForMember(dest => dest.BankAccount, opt => opt.Ignore())
				.ForMember(dest => dest.Description, opt => opt.Ignore())
				.ForMember(dest => dest.Allocations, opt => opt.Ignore())
				// Cheque status is the server's (PENDING at birth, see WMSDbContext); dates and names come from the row.
				.ForMember(dest => dest.CheckStatus, opt => opt.Ignore())
				.ForMember(dest => dest.CheckStatusChangedAt, opt => opt.Ignore())
				.ForMember(dest => dest.CheckStatusNote, opt => opt.Ignore())
				.ForMember(dest => dest.EndorsedFromPaymentDetailId, opt => opt.Ignore())
				.ForMember(dest => dest.EndorsedFrom, opt => opt.Ignore());

			CreateMap<PaymentDetail, PaymentDetailDto>();

			CreateMap<CreateSaleItemDto, SaleItem>();
			CreateMap<UpdateSaleItemDto, SaleItem>();
			CreateMap<CreatePurchaseItemDto, PurchaseItem>();
			CreateMap<PurchaseItem, CreatePurchaseItemDto>();

			CreateMap<SaleItem, SaleItemDto>();
			CreateMap<SaleItemDto, SaleItem>();

			CreateMap<CreateSaleCommand, Sale>()
				.ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.ProductIds))
				// A sale is born a PROFORMA in DRAFT and takes no money until the customer and the warehouse have approved it
				// (docs/proforma-approval-pipeline.md); its first payment then issues the invoice.
				.ForMember(dest => dest.Status, opt => opt.MapFrom(src => SalesStatusEnum.PROFORMA))
				.ForMember(dest => dest.ProformaStage, opt => opt.MapFrom(src => SaleProformaStageEnum.DRAFT))
				.ForMember(dest => dest.PaidAmount, opt => opt.Ignore())
				.ForMember(dest => dest.PaymentDetails, opt => opt.Ignore())
				// TotalAmount is the sum of the line totals (InvoiceLineMath), set by the handler.
				.ForMember(dest => dest.TotalAmount, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

            CreateMap<Purchase, CreatePurchaseCommand>()
				.ForMember(dest => dest.ProductItemList, opt => opt.MapFrom(src => src.Items));

			CreateMap<CreatePurchaseCommand, Purchase>()
				.ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.ProductItemList))
				// TotalAmount is the sum of the line totals (InvoiceLineMath), set by the handler.
				.ForMember(dest => dest.TotalAmount, opt => opt.Ignore())
				// PaidAmount is the sum of the payment rows (DocumentPayments.NetPaid), set by the handler.
				.ForMember(dest => dest.PaidAmount, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<CreateProductCommand, Product>()
				// The command carries ImageKey (a bucket object key); the entity column is called
				// ImageUrl but holds that same key. The handler assigns it through
				// IObjectStorageService.NormalizeKey, so AutoMapper must not set it by convention -
				// that would let a full URL echoed back by the frontend land in the column verbatim.
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore())
				// Linked from VehicleIds by the handler, after checking every vehicle is live.
				.ForMember(dest => dest.Vehicles, opt => opt.Ignore())
				.ForMember(dest => dest.PreferredSupplier, opt => opt.Ignore())
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			// The entity's ImageUrl column holds the bucket object key (signed URLs expire, so
			// one can't be persisted). The DTO splits that into ImageKey (the stable value) and
			// ImageUrl, which each query handler then fills with a freshly signed URL -
			// AutoMapper can't sign it here because signing needs IObjectStorageService.
			CreateMap<Product, ProductDto>()
				.ForMember(dest => dest.ImageKey, opt => opt.MapFrom(src => src.ImageUrl))
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore())
				// Counted from ProductUnits by the query, not a column.
				.ForMember(dest => dest.QuarantinedCount, opt => opt.Ignore())
				.ForMember(dest => dest.ReservedCount, opt => opt.Ignore())
				// Read with the vehicle names by the detail query.
				.ForMember(dest => dest.Vehicles, opt => opt.Ignore())
				.ForMember(dest => dest.PreferredSupplierName, opt => opt.MapFrom(src => src.PreferredSupplier != null ? src.PreferredSupplier.CompanyName : null));

			CreateMap<CreateProductCategoryCommand, ProductCategory>()
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<ProductCategory, ProductCategoryDto>();

			CreateMap<CreateSupplierCommand, Supplier>()
				// The command carries ImageKey (a bucket object key); the entity column is called
				// ImageUrl but holds that same key. The handler assigns it through
				// IObjectStorageService.NormalizeKey, so AutoMapper must not set it by convention -
				// that would let a full URL echoed back by the frontend land in the column verbatim.
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<Supplier, SupplierDto>()
				.ForMember(dest => dest.ImageKey, opt => opt.MapFrom(src => src.ImageUrl))
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore())
				// Summed from the party ledger by the query, not a column.
				.ForMember(dest => dest.LedgerBalance, opt => opt.Ignore());

			CreateMap<CreateDepartmentCommand, Domain.Entities.Department>()
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<CreateTeamCommand, Domain.Entities.Team>()
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<CreatePosTerminalCommand, Domain.Entities.PosTerminal>()
				.ForMember(dest => dest.BankAccount, opt => opt.Ignore())
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<CreateCustomerCommand, Customer>()
				// The command carries ImageKey (a bucket object key); the entity column is called
				// ImageUrl but holds that same key. The handler assigns it through
				// IObjectStorageService.NormalizeKey, so AutoMapper must not set it by convention -
				// that would let a full URL echoed back by the frontend land in the column verbatim.
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true));

			CreateMap<Customer, CustomerDto>()
				.ForMember(dest => dest.ImageKey, opt => opt.MapFrom(src => src.ImageUrl))
				.ForMember(dest => dest.ImageUrl, opt => opt.Ignore())
				// Summed from the party ledger by the query, not a column.
				.ForMember(dest => dest.LedgerBalance, opt => opt.Ignore());

			CreateMap<User, TokenUserInfoDto>();

			CreateMap<User, UserInfoDto>()
				.ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department.Name))
                .ForMember(dest => dest.TeamName, opt => opt.MapFrom(src => src.Team.Name));

			CreateMap<User, UserUpdateDto>();

			CreateMap<CreateUserCommand, User>()
					 .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTime.Now))
					 .ForMember(dest => dest.PasswordHash, source => source.MapFrom(e => e.Password.ToHashSHA256()))
					 .ForMember(dest => dest.IsActive, source => source.MapFrom(e => true));
		}
	}
}
