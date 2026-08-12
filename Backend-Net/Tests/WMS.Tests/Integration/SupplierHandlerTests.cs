using Application.Features.Supplier.Commands;
using Application.Features.Supplier.Dtos;
using Application.Features.Supplier.Queries;
using Common.Exceptions;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class SupplierHandlerTests
    {
        [Fact]
        public async Task CreateSupplier_PersistsActiveSupplier()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new CreateSupplierCommandHandler(scope.SupplierRepository, TestMapper.Instance, scope.UnitOfWork);
            await handler.Handle(new CreateSupplierCommand
            {
                FirstName = "رضا",
                LastName = "محمدی",
                CompanyName = "شرکت تست",
                Phone = "09121112233",
                Address = "تهران",
                PostalCode = "1234567890",
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var supplier = Assert.Single(verify.Suppliers);
            Assert.True(supplier.IsActive);
        }

        [Fact]
        public async Task UpdateSupplier_UnknownId_ThrowsNotFound()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            var handler = new UpdateSupplierCommandHandler(scope.UnitOfWork, scope.SupplierRepository);

            await Assert.ThrowsAsync<NotFoundCustomException>(() => handler.Handle(new UpdateSupplierCommand
            {
                Id = 999,
                FirstName = "رضا",
                LastName = "محمدی",
                CompanyName = "شرکت",
                Phone = "09121112233",
                Address = "تهران",
                PostalCode = "1234567890",
            }, CancellationToken.None));
        }

        [Fact]
        public async Task DeleteSupplier_SetsIsActiveFalse()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var supplier = Seed.Supplier();
            scope.Context.Suppliers.Add(supplier);
            scope.Context.SaveChanges();

            var handler = new DeleteSupplierCommandHandler(scope.SupplierRepository, scope.UnitOfWork);
            await handler.Handle(new DeleteSupplierCommand { Id = supplier.Id }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.False(verify.Suppliers.Single(x => x.Id == supplier.Id).IsActive);
        }

        [Fact]
        public async Task GetSupplierDetail_ReturnsMappedDto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var supplier = Seed.Supplier("شرکت ویژه");
            scope.Context.Suppliers.Add(supplier);
            scope.Context.SaveChanges();

            var handler = new GetSupplierDetailQueryHandler(scope.SupplierRepository, TestMapper.Instance);
            var res = await handler.Handle(new GetSupplierDetailQuery { Id = supplier.Id }, CancellationToken.None);

            var dto = Assert.IsType<SupplierDto>(res.Data);
            Assert.Equal("شرکت ویژه", dto.CompanyName);
        }

        [Fact]
        public async Task GetSupplierList_FiltersByCompanyName()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            scope.Context.Suppliers.Add(Seed.Supplier("الف"));
            scope.Context.Suppliers.Add(Seed.Supplier("ب"));
            scope.Context.SaveChanges();

            var handler = new GetSupplierListQueryHandler(scope.Db);
            var res = await handler.Handle(new GetSupplierListQuery { CompanyNameOrContactName = "الف" }, CancellationToken.None);

            var data = res.Data!;
            var list = (System.Collections.IEnumerable)data.GetType().GetProperty("SupplierList")!.GetValue(data)!;

            Assert.Single(list.Cast<object>());
        }
    }
}
