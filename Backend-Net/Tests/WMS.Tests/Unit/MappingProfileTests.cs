using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.User.Command;
using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// AutoMapper-only checks (no DbContext, no handler) for the mapping fixes made while adding
    /// the wider test suite - isolates a mapping regression from unrelated concerns a full
    /// handler+DB test would also exercise.
    /// </summary>
    public class MappingProfileTests
    {
        [Fact]
        public void CreateUserCommand_ToUser_MapsFisrtNameToFirstName()
        {
            var command = new CreateUserCommand
            {
                FisrtName = "کاربر",
                LastName = "تست",
                Username = "u",
                Password = "Test@1234",
            };

            var user = TestMapper.Instance.Map<User>(command);

            Assert.Equal("کاربر", user.FirstName);
            Assert.True(user.IsActive);
            Assert.NotEqual("Test@1234", user.PasswordHash);
        }

        [Fact]
        public void CreatePurchaseCommand_ToPurchase_MapsTotalAndPaidAmountAndItems()
        {
            var command = new CreatePurchaseCommand
            {
                SupplierId = 1,
                TotalPrice = 5000,
                PaidPrice = 1000,
                PaymentType = PaymentTypeEnum.CASH,
                Status = PurchaseStatusEnum.SHIPPED,
                PaymentDetails = new(),
                InvoiceNumber = "INV-1",
                InvoiceDate = DateTime.Now,
                ProductItemList = new() { new CreatePurchaseItemDto { ProductId = 7, Quantity = 3, UnitPrice = 1000, Discount = 0 } },
            };

            var purchase = TestMapper.Instance.Map<Purchase>(command);

            Assert.Equal(5000UL, purchase.TotalAmount);
            Assert.Equal(1000UL, purchase.PaidAmount);
            var item = Assert.Single(purchase.Items);
            Assert.Equal(7, item.ProductId);
            Assert.Equal(3, item.Quantity);
        }

        [Fact]
        public void CreateSaleCommand_ToSale_MapsTotalAndPaidAmountAndItems()
        {
            var command = new CreateSaleCommand
            {
                InvoiceNumber = "S-1",
                InvoiceDate = DateTime.Now,
                CustomerId = 1,
                TotalAmount = 4000,
                PaidAmount = 500,
                PaymentType = PaymentTypeEnum.CASH,
                PaymentDetails = new(),
                ProductIds = new() { new CreateSaleItemDto { ProductId = 9, Quantity = 2, UnitPrice = 2000, Discount = 0 } },
            };

            var sale = TestMapper.Instance.Map<Sale>(command);

            Assert.Equal(4000UL, sale.TotalAmount);
            Assert.Equal(500UL, sale.PaidAmount);
            var item = Assert.Single(sale.Items);
            Assert.Equal(9, item.ProductId);
        }
    }
}
