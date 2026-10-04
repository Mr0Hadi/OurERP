using Application.Common.Payments;
using Application.Features.Pos.Dtos;
using Application.Features.Pos.Queries;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Domain.Enums;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// Card-reader payments (frontend-requests 11.3, 12.2, 12.3): the details are stored and returned; every
    /// card row is a manual one and needs PosManualRecord; one RRN is recorded once per device, voided rows
    /// included; a card row is voided, never edited; and none of it touches ordinary payments.
    /// </summary>
    public class PosPaymentTests
    {
        private sealed record Fixture(SaleScenario Scenario, Domain.Entities.PosTerminal Terminal, int CashierId);

        private static Fixture Setup(TestScope scope, bool terminalActive = true, bool cashierMayRecord = true)
        {
            var scenario = Seed.ShippedSale(scope.Context);
            var terminal = new Domain.Entities.PosTerminal
            {
                Name = $"pos-{Guid.NewGuid():N}",
                Vendor = PosVendorEnum.Other,
                Host = "127.0.0.1",
                Port = 8080,
                IsActive = terminalActive,
                BankCode = "keshavarzi",
            };
            scope.Context.PosTerminals.Add(terminal);
            var cashier = Seed.User(Seed.Department($"d-{Guid.NewGuid():N}"), null, $"cashier-{Guid.NewGuid():N}");
            scope.Context.Users.Add(cashier);
            scope.Context.SaveChanges();

            if (cashierMayRecord)
            {
                scope.Context.UserPermissions.Add(new Domain.Entities.UserPermission { UserId = cashier.Id, Permission = PermissionEnum.PosManualRecord, GrantedAt = DateTime.Now });
                scope.Context.SaveChanges();
            }

            return new Fixture(scenario, terminal, cashier.Id);
        }

        private static AddSalePaymentCommandHandler AddPayment(TestScope scope, int userId)
            => new(scope.Db, scope.PosPaymentGuardFor(userId), FakeObjectStorage.Instance, scope.UnitOfWork, scope.SaleReturnCalculation);

        private static AddSalePaymentCommand CardPayment(int saleId, int? terminalId, string rrn = "412345678901", string maskedCard = "603770******1234") => new()
        {
            SaleId = saleId,
            Type = PaymentTypeEnum.TRANSFER,
            Amount = 5_000,
            TransferRef = rrn,
            PosTerminalId = terminalId,
            MaskedCardNumber = maskedCard,
            ApprovalCode = "A1B2C3",
            TraceNumber = "004512",
        };

        [Fact]
        public async Task CardPayment_IsStored_AsAManualReceipt_AndReturnedOnTheSale()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope);

            var sale = Assert.IsType<SaleDto>((await AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None)).Data);

            var row = sale.PaymentDetails.Single(p => p.TransferRef == "412345678901");
            Assert.Equal(f.Terminal.Id, row.PosTerminalId);
            Assert.Equal("603770******1234", row.MaskedCardNumber);
            Assert.Equal("A1B2C3", row.ApprovalCode);
            Assert.Equal("004512", row.TraceNumber);
            Assert.Equal(PaymentSourceEnum.MANUAL_RECEIPT, row.Source);
            Assert.NotNull(row.RecordedAt);
        }

        [Fact]
        public async Task CardPayment_WithoutPosManualRecord_IsForbidden()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope, cashierMayRecord: false);

            await Assert.ThrowsAsync<ForbiddenCustomException>(() => AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None));
        }

        [Fact]
        public async Task OrdinaryPayments_NeedNoCardPermission_AndHaveNoSource()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope, cashierMayRecord: false);

            var sale = Assert.IsType<SaleDto>((await AddPayment(scope, f.CashierId).Handle(new AddSalePaymentCommand
            {
                SaleId = f.Scenario.Sale.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 1_000, TransferRef = "412345678901",
            }, CancellationToken.None)).Data);

            Assert.Null(sale.PaymentDetails.Single(p => p.Amount == 1_000).Source);
        }

        [Fact]
        public async Task CardPayment_OnAnInactiveDevice_IsRefused()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope, terminalActive: false);

            await Assert.ThrowsAsync<ValidationCustomException>(() => AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None));
        }

        [Fact]
        public async Task TheSameRrnOnTheSameDevice_IsRefused_EvenAfterVoiding_AndOnAnotherInvoice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope);
            var other = Seed.ShippedSale(scope.Context);

            var sale = Assert.IsType<SaleDto>((await AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None)).Data);

            var onAnotherInvoice = await Assert.ThrowsAsync<ValidationCustomException>(() =>
                AddPayment(scope, f.CashierId).Handle(CardPayment(other.Sale.Id, f.Terminal.Id), CancellationToken.None));
            Assert.Contains("412345678901", onAnotherInvoice.Error);

            await new VoidSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, scope.SaleReturnCalculation)
                .Handle(new VoidSalePaymentCommand { PaymentId = sale.PaymentDetails.Single(p => p.PosTerminalId != null).Id }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None));
        }

        [Fact]
        public async Task TheSameRrnOnAnotherDevice_IsAllowed()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope);
            var second = new Domain.Entities.PosTerminal { Name = $"pos-{Guid.NewGuid():N}", Vendor = PosVendorEnum.Other, Host = "127.0.0.1", Port = 8081, IsActive = true };
            scope.Context.PosTerminals.Add(second);
            scope.Context.SaveChanges();

            await AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None);
            await AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, second.Id), CancellationToken.None);
        }

        [Fact]
        public async Task ACardPayment_IsVoided_NotEdited()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope);
            var sale = Assert.IsType<SaleDto>((await AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None)).Data);

            var edit = new EditSalePaymentCommandHandler(scope.Db, scope.PosPaymentGuardFor(f.CashierId), FakeObjectStorage.Instance, scope.UnitOfWork, scope.SaleReturnCalculation);

            await Assert.ThrowsAsync<ValidationCustomException>(() => edit.Handle(new EditSalePaymentCommand
            {
                PaymentId = sale.PaymentDetails.Single(p => p.PosTerminalId != null).Id, Type = PaymentTypeEnum.TRANSFER, Amount = 4_000, TransferRef = "x",
            }, CancellationToken.None));
        }

        [Fact]
        public async Task TheManagerReport_ListsCardPaymentsOnly_WithTheirInvoice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var f = Setup(scope);
            await AddPayment(scope, f.CashierId).Handle(CardPayment(f.Scenario.Sale.Id, f.Terminal.Id), CancellationToken.None);
            await AddPayment(scope, f.CashierId).Handle(new AddSalePaymentCommand { SaleId = f.Scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 500 }, CancellationToken.None);

            var res = await new GetPosPaymentListQueryHandler(scope.Db).Handle(new GetPosPaymentListQuery { Source = PaymentSourceEnum.MANUAL_RECEIPT }, CancellationToken.None);
            var list = (List<PosPaymentListDto>)res.Data!.GetType().GetProperty("PosPaymentList")!.GetValue(res.Data)!;

            var row = Assert.Single(list);
            Assert.Equal(f.Terminal.Name, row.PosTerminalName);
            Assert.Equal(f.Scenario.Sale.Id, row.SaleId);
            Assert.Equal("412345678901", row.TransferRef);
        }

        [Fact]
        public void FullCardNumber_IsRefused()
        {
            Assert.False(new AddSalePaymentCommandValidator().Validate(CardPayment(1, 1, maskedCard: "6037701234561234")).IsValid);
        }

        [Fact]
        public void CardPayment_WithoutRrn_IsRefused()
        {
            Assert.False(new AddSalePaymentCommandValidator().Validate(CardPayment(1, 1, rrn: " ")).IsValid);
        }

        [Fact]
        public void CardDetails_OnACashPayment_AreRefused()
        {
            var command = CardPayment(1, 1);
            command.Type = PaymentTypeEnum.CASH;

            Assert.False(new AddSalePaymentCommandValidator().Validate(command).IsValid);
        }

        [Fact]
        public void TransferRef_Over64Characters_IsRefused_AndUpTo64IsFine()
        {
            var ok = new AddSalePaymentCommand { SaleId = 1, Type = PaymentTypeEnum.TRANSFER, Amount = 5_000, TransferRef = new string('9', 64) };
            var tooLong = new AddSalePaymentCommand { SaleId = 1, Type = PaymentTypeEnum.TRANSFER, Amount = 5_000, TransferRef = new string('9', 65) };

            Assert.True(new AddSalePaymentCommandValidator().Validate(ok).IsValid);
            Assert.False(new AddSalePaymentCommandValidator().Validate(tooLong).IsValid);
        }

        [Fact]
        public void PaymentRowsOfCreateSale_FollowTheSameRules()
        {
            var row = new Application.Common.Dtos.PaymentDetailDto { Type = PaymentTypeEnum.TRANSFER, Amount = 5_000, TransferRef = "1", PosTerminalId = 1, MaskedCardNumber = "6037701234561234" };

            Assert.False(new PaymentRowValidator().Validate(row).IsValid);
        }
    }
}
