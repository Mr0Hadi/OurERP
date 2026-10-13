using Application.Features.Product.Queries;
using Application.Features.Vehicle.Commands;
using Application.Features.Vehicle.Queries;
using Common.Exceptions;
using Domain.Entities;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class VehicleHandlerTests
    {
        private static object? DataOf(object data, string property) => data.GetType().GetProperty(property)!.GetValue(data);

        [Fact]
        public async Task CreateVehicle_NormalizesName_AndRejectsDuplicates()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var handler = new CreateVehicleCommandHandler(scope.VehicleRepository, scope.Db, scope.UnitOfWork);

            await handler.Handle(new CreateVehicleCommand { Name = "  پرايد   ۱۱۱ " }, CancellationToken.None);
            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(new CreateVehicleCommand { Name = "پراید ۱۱۱" }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal("پراید ۱۱۱", Assert.Single(verify.Vehicles).Name);
        }

        [Fact]
        public async Task DeleteVehicle_FreesTheName_AndUnlinksProducts()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var vehicle = Seed.Vehicle();
            var product = Seed.Product(Seed.Category());
            product.Vehicles.Add(new ProductVehicle { Vehicle = vehicle });
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var res = await new DeleteVehicleCommandHandler(scope.VehicleRepository, scope.Db, scope.UnitOfWork)
                .Handle(new DeleteVehicleCommand { Id = vehicle.Id }, CancellationToken.None);
            Assert.Equal(1, DataOf(res.Data!, "BecameUniversalCount"));

            await new CreateVehicleCommandHandler(scope.VehicleRepository, scope.Db, scope.UnitOfWork)
                .Handle(new CreateVehicleCommand { Name = vehicle.Name }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Empty(verify.ProductVehicles);
        }

        [Fact]
        public async Task RemoveProductFromVehicle_LastVehicle_ReportsAllVehicles()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var pride = Seed.Vehicle("پراید");
            var peugeot = Seed.Vehicle("پژو ۴۰۵");
            var product = Seed.Product(Seed.Category());
            product.Vehicles.Add(new ProductVehicle { Vehicle = pride });
            product.Vehicles.Add(new ProductVehicle { Vehicle = peugeot });
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();

            var handler = new RemoveProductFromVehicleCommandHandler(scope.Db, scope.UnitOfWork);
            var first = await handler.Handle(new RemoveProductFromVehicleCommand { VehicleId = pride.Id, ProductId = product.Id }, CancellationToken.None);
            Assert.Equal(false, DataOf(first.Data!, "BecameUniversal"));
            var second = await handler.Handle(new RemoveProductFromVehicleCommand { VehicleId = peugeot.Id, ProductId = product.Id }, CancellationToken.None);
            Assert.Equal(true, DataOf(second.Data!, "BecameUniversal"));
        }

        [Fact]
        public async Task ProductListVehicleFilter_IncludesAllVehiclesProducts()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var pride = Seed.Vehicle("پراید");
            var peugeot = Seed.Vehicle("پژو ۴۰۵");
            var forPride = Seed.Product(category, "لنت پراید");
            forPride.Vehicles.Add(new ProductVehicle { Vehicle = pride });
            var forPeugeot = Seed.Product(category, "لنت پژو");
            forPeugeot.Vehicles.Add(new ProductVehicle { Vehicle = peugeot });
            var universal = Seed.Product(category, "روغن موتور");
            scope.Context.Products.AddRange(forPride, forPeugeot, universal);
            scope.Context.SaveChanges();

            var res = await new GetProductListQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new GetProductListQuery { VehicleId = pride.Id, Take = 50 }, CancellationToken.None);
            var names = ((System.Collections.IEnumerable)DataOf(res.Data!, "ProductList")!).Cast<object>()
                .Select(x => (string)DataOf(x, "Name")!).OrderBy(x => x).ToList();
            Assert.Equal(new[] { "روغن موتور", "لنت پراید" }, names);

            var universalOnly = await new GetVehicleProductListQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new GetVehicleProductListQuery(), CancellationToken.None);
            var universalNames = ((System.Collections.IEnumerable)DataOf(universalOnly.Data!, "ProductList")!).Cast<object>()
                .Select(x => (string)DataOf(x, "Name")!);
            Assert.Equal(new[] { "روغن موتور" }, universalNames);
        }
    }
}
