using Application.Common.Dtos;
using Application.Features.Account.Command;
using Application.Features.Customer.Commands;
using Application.Features.Product.Commands;
using Application.Features.ProductCategory.Commands;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Supplier.Commands;
using Application.Features.User.Command;
using Domain.Enums;

namespace WMS.Tests.Unit
{
    public class CreateCustomerCommandValidatorTests
    {
        private readonly CreateCustomerCommandValidation _sut = new();

        private static CreateCustomerCommand Valid() => new()
        {
            FirstName = "علی",
            LastName = "رضایی",
            PhoneNumber = "09121234567",
            Address = "تهران",
            PostalCode = "1234567890",
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void LatinFirstName_IsInvalid()
        {
            var command = Valid();
            command.FirstName = "Ali";

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void InvalidMobileNumber_IsInvalid()
        {
            var command = Valid();
            command.PhoneNumber = "12345";

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void EmptyAddress_IsInvalid()
        {
            var command = Valid();
            command.Address = "";

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class UpdateCustomerCommandValidatorTests
    {
        private readonly UpdateCustomerCommandValidator _sut = new();

        [Fact]
        public void EmptyPostalCode_IsInvalid()
        {
            var command = new UpdateCustomerCommand
            {
                FirstName = "علی",
                LastName = "رضایی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "",
            };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class CreateProductCommandValidatorTests
    {
        private readonly CreateProductCommandValidator _sut = new();

        private static CreateProductCommand Valid() => new()
        {
            Name = "کالا",
            Brand = "برند",
            PurchasePrice = 100,
            RetailPrice = 150,
            WholeSalePrice = 140,
            Tax = 0,
            Stock = 5,
            LowStockThreshold = 1,
            ProductCategoryId = 1,
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void ZeroRetailPrice_IsInvalid()
        {
            var command = Valid();
            command.RetailPrice = 0;

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NegativeStock_IsInvalid()
        {
            var command = Valid();
            command.Stock = -1;

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void MissingProductCategoryId_IsInvalid()
        {
            var command = Valid();
            command.ProductCategoryId = 0;

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class UpdateProductCommandValidatorTests
    {
        private readonly UpdateProductCommandValidator _sut = new();

        [Fact]
        public void EmptyName_IsInvalid()
        {
            var command = new UpdateProductCommand
            {
                Name = "",
                Brand = "برند",
                PurchasePrice = 10,
                RetailPrice = 20,
                WholeSalePrice = 15,
                ProductCategoryId = 1,
            };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class CreateProductCategoryCommandValidatorTests
    {
        private readonly CreateProductCategoryCommandValidator _sut = new();

        [Fact]
        public void EmptyName_IsInvalid()
        {
            Assert.False(_sut.Validate(new CreateProductCategoryCommand { Name = "" }).IsValid);
        }

        [Fact]
        public void NonEmptyName_IsValid()
        {
            Assert.True(_sut.Validate(new CreateProductCategoryCommand { Name = "لوازم" }).IsValid);
        }
    }

    public class CreateSupplierCommandValidatorTests
    {
        private readonly CreateSupplierCommandValidation _sut = new();

        private static CreateSupplierCommand Valid() => new()
        {
            FirstName = "رضا",
            LastName = "محمدی",
            CompanyName = "شرکت",
            Phone = "09121112233",
            Address = "تهران",
            PostalCode = "1234567890",
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void EmptyCompanyName_IsInvalid()
        {
            var command = Valid();
            command.CompanyName = "";

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void InvalidPhone_IsInvalid()
        {
            var command = Valid();
            command.Phone = "abc";

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class CreateUserCommandValidatorTests
    {
        private readonly CreateUserCommandValidator _sut = new();

        private static CreateUserCommand Valid() => new()
        {
            FisrtName = "کاربر",
            LastName = "تست",
            Username = "tester1",
            Password = "Test@1234",
            PersonelCode = "1001",
            RoleId = 1,
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void EmptyPersonelCode_IsInvalid()
        {
            var command = Valid();
            command.PersonelCode = "";

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void PersianUsername_IsInvalid()
        {
            var command = Valid();
            command.Username = "کاربر۱";

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void WeakPassword_IsInvalid()
        {
            var command = Valid();
            command.Password = "weak";

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void LatinFirstName_IsInvalid()
        {
            var command = Valid();
            command.FisrtName = "User";

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class UpdateUserCommandValidatorTests
    {
        private readonly UpdateUserCommandValidator _sut = new();

        [Fact]
        public void EmptyUsername_IsInvalid()
        {
            var command = new UpdateUserCommand { FirstName = "کاربر", LastName = "تست", Username = "", RoleId = 1 };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class ChangePasswordCommandValidatorTests
    {
        private readonly ChangePasswordCommandValidator _sut = new();

        [Fact]
        public void MismatchedRePassword_IsInvalid()
        {
            var command = new ChangePasswordCommand { OldPassword = "Old@1234", Password = "New@1234", RePassword = "Different@1234" };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void MatchingStrongPasswords_IsValid()
        {
            var command = new ChangePasswordCommand { OldPassword = "Old@1234", Password = "New@1234", RePassword = "New@1234" };

            Assert.True(_sut.Validate(command).IsValid);
        }
    }

    public class UpdateUserInfoCommandValidatorTests
    {
        private readonly UpdateUserInfoCommandValidator _sut = new();

        [Fact]
        public void PersianNames_IsValid()
        {
            Assert.True(_sut.Validate(new UpdateUserInfoCommand { FirstName = "کاربر", LastName = "تست" }).IsValid);
        }

        [Fact]
        public void EmptyLastName_IsInvalid()
        {
            Assert.False(_sut.Validate(new UpdateUserInfoCommand { FirstName = "کاربر", LastName = "" }).IsValid);
        }
    }

    public class ForgetPasswordCommandValidatorTests
    {
        private readonly ForgetPasswordCommandValidator _sut = new();

        [Fact]
        public void MismatchedRePassword_IsInvalid()
        {
            var command = new ForgetPasswordCommand { Username = "tester", Password = "New@1234", RePassword = "Nope@1234" };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            var command = new ForgetPasswordCommand { Username = "tester", Password = "New@1234", RePassword = "New@1234" };

            Assert.True(_sut.Validate(command).IsValid);
        }
    }

    public class UserRefreshTokenCommandValidatorTests
    {
        private readonly UserRefreshTokenCommandValidator _sut = new();

        [Fact]
        public void EmptyTokens_IsInvalid()
        {
            Assert.False(_sut.Validate(new UserRefreshTokenCommand { AccessToken = "", RefreshToken = "" }).IsValid);
        }

        [Fact]
        public void NonEmptyTokens_IsValid()
        {
            Assert.True(_sut.Validate(new UserRefreshTokenCommand { AccessToken = "a", RefreshToken = "b" }).IsValid);
        }
    }

    public class LogoutUserByIdCommandValidatorTests
    {
        private readonly LogoutUserByIdCommandValidator _sut = new();

        [Fact]
        public void ZeroUserId_IsInvalid()
        {
            Assert.False(_sut.Validate(new LogoutUserByIdCommand { UserId = 0 }).IsValid);
        }
    }

    public class CreatePurchaseValidatorTests
    {
        private readonly CreatePurchaseValidator _sut = new();

        private static CreatePurchaseCommand Valid() => new()
        {
            ProductItemList = new() { new CreatePurchaseItemDto { ProductId = 1, Quantity = 2, UnitPrice = 100, Discount = 0 } },
            SupplierId = 1,
            TotalPrice = 200,
            PaidPrice = 0,
            PaymentType = PaymentTypeEnum.CASH,
            Status = PurchaseStatusEnum.PENDING,
            PaymentDetails = new(),
            InvoiceNumber = "INV-1",
            InvoiceDate = DateTime.Now,
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void PendingStatus_IsValid()
        {
            // Regression check: Status used to be validated with NotEmpty(), which treats an enum's
            // CLR default (0) as "empty" - and PurchaseStatusEnum.PENDING is 0, so a brand-new
            // purchase could never legitimately be created as PENDING. Now IsInEnum(), which only
            // rejects values outside the enum's defined range.
            var command = Valid();
            command.Status = PurchaseStatusEnum.PENDING;

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void UndefinedStatusValue_IsInvalid()
        {
            var command = Valid();
            command.Status = (PurchaseStatusEnum)999;

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void EmptyProductItemList_IsInvalid()
        {
            var command = Valid();
            command.ProductItemList = new();

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NonCashPaymentWithoutPaymentDetails_IsInvalid()
        {
            var command = Valid();
            command.PaymentType = PaymentTypeEnum.TRANSFER;
            command.PaymentDetails = new();

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroTotalPrice_IsInvalid()
        {
            var command = Valid();
            command.TotalPrice = 0;

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class UpdatePurchaseCommandValidatorTests
    {
        private readonly UpdatePurchaseCommandValidator _sut = new();

        [Fact]
        public void ZeroSupplierId_IsInvalid()
        {
            var command = new UpdatePurchaseCommand
            {
                InvoiceNumber = "INV-1",
                InvoiceDate = DateTime.Now,
                SupplierId = 0,
                TotalAmount = 100,
                PaidAmount = 0,
            };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class CreateSaleCommandValidatorTests
    {
        private readonly CreateSaleCommandValidator _sut = new();

        private static CreateSaleCommand Valid() => new()
        {
            InvoiceNumber = "S-1",
            InvoiceDate = DateTime.Now,
            CustomerId = 1,
            TotalAmount = 100,
            PaidAmount = 0,
            PaymentType = PaymentTypeEnum.CASH,
            PaymentDetails = new(),
            ProductIds = new() { new CreateSaleItemDto { ProductId = 1, Quantity = 1, UnitPrice = 100, Discount = 0 } },
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void EmptyProductIds_IsInvalid()
        {
            var command = Valid();
            command.ProductIds = new();

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroCustomerId_IsInvalid()
        {
            var command = Valid();
            command.CustomerId = 0;

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class UpdateSaleCommandValidatorTests
    {
        private readonly UpdateSaleCommandValidator _sut = new();

        private static UpdateSaleCommand Valid() => new()
        {
            InvoiceNumber = "S-1",
            InvoiceDate = DateTime.Now,
            CustomerId = 1,
            TotalAmount = 100,
            PaidAmount = 0,
            PaymentType = PaymentTypeEnum.CASH,
            PaymentDetails = new(),
            Items = new() { new UpdateSaleItemDto { Id = 0, ProductId = 1, Quantity = 1, UnitPrice = 100, Discount = 0 } },
        };

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            Assert.True(_sut.Validate(Valid()).IsValid);
        }

        [Fact]
        public void EmptyItems_IsInvalid()
        {
            var command = Valid();
            command.Items = new();

            Assert.False(_sut.Validate(command).IsValid);
        }
    }
}
