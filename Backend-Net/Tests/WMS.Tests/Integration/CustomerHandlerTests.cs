using Application.Features.Customer.Commands;
using Application.Features.Customer.Dtos;
using Application.Features.Customer.Queries;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class CustomerHandlerTests
    {
        [Fact]
        public async Task CreateCustomer_PersistsActiveCustomer()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new CreateCustomerCommandHandler(scope.CustomerRepository, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateCustomerCommand
            {
                FirstName = "علی",
                LastName = "رضایی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = BalanceTypeEnum.Debtor,
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var customer = Assert.Single(verify.Customers);
            Assert.True(customer.IsActive);
            Assert.Equal("علی", customer.FirstName);
        }

        [Fact]
        public async Task UpdateCustomer_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new UpdateCustomerCommandHandler(scope.UnitOfWork, scope.CustomerRepository);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdateCustomerCommand
            {
                Id = 999,
                FirstName = "علی",
                LastName = "رضایی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
            }, CancellationToken.None));
        }

        [Fact]
        public async Task UpdateCustomer_ExistingId_UpdatesFields()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var customer = Seed.Customer();
            scope.Context.Customers.Add(customer);
            scope.Context.SaveChanges();

            var handler = new UpdateCustomerCommandHandler(scope.UnitOfWork, scope.CustomerRepository);
            await handler.Handle(new UpdateCustomerCommand
            {
                Id = customer.Id,
                FirstName = "محمد",
                LastName = "احمدی",
                PhoneNumber = "09129998877",
                Address = "اصفهان",
                PostalCode = "9999999999",
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var updated = verify.Customers.Single(x => x.Id == customer.Id);
            Assert.Equal("محمد", updated.FirstName);
            Assert.Equal("اصفهان", updated.Address);
        }

        [Fact]
        public async Task DeleteCustomer_SetsIsActiveFalse_DoesNotHardDelete()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var customer = Seed.Customer();
            scope.Context.Customers.Add(customer);
            scope.Context.SaveChanges();

            var handler = new DeleteCustomerCommandHandler(scope.CustomerRepository, scope.UnitOfWork);
            await handler.Handle(new DeleteCustomerCommand { Id = customer.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            var deleted = verify.Customers.Single(x => x.Id == customer.Id);
            Assert.False(deleted.IsActive);
        }

        [Fact]
        public async Task DeleteCustomer_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new DeleteCustomerCommandHandler(scope.CustomerRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new DeleteCustomerCommand { Id = 999 }, CancellationToken.None));
        }

        [Fact]
        public async Task GetCustomerDetail_ReturnsMappedDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var customer = Seed.Customer("سارا", "کریمی");
            scope.Context.Customers.Add(customer);
            scope.Context.SaveChanges();

            var handler = new GetCustomerDetailQueryHandler(scope.CustomerRepository, TestMapper.Instance);
            var res = await handler.Handle(new GetCustomerDetailQuery { Id = customer.Id }, CancellationToken.None);

            var dto = Assert.IsType<CustomerDto>(res.Data);
            Assert.Equal("سارا", dto.FirstName);
        }

        [Fact]
        public async Task GetCustomerList_FiltersByFullName()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            scope.Context.Customers.Add(Seed.Customer("علی", "رضایی"));
            scope.Context.Customers.Add(Seed.Customer("سارا", "کریمی"));
            scope.Context.SaveChanges();

            var handler = new GetCustomerListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetCustomerListQuery { FullName = "سارا" }, CancellationToken.None);

            var data = res.Data!;
            var list = (System.Collections.IEnumerable)data.GetType().GetProperty("CustomerList")!.GetValue(data)!;

            Assert.Single(list.Cast<object>());
        }
    }
}
