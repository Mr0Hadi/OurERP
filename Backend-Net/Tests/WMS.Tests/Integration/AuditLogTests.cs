using System.Text.Json;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Features.Audit.Dtos;
using Application.Features.Audit.Queries;
using Application.Features.Customer.Commands;
using Application.Features.Product.Commands;
using Application.Features.Sale.Commands;
using Application.Ioc;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The audit log: WMSDbContext records every saved row, AuditBehavior names the command, and the three read queries.
    /// Commands go through a real MediatR pipeline so the behaviour and the scope are exercised the way production wires them.
    /// Note: Seed helpers save synchronously, which is not audited - so every test starts with an empty log.
    /// </summary>
    public class AuditLogTests
    {
        private static IMediator Mediator(TestScope scope, int userId)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddApplicationServices();
            services.AddSingleton<IWMSDbContext>(scope.Context);
            services.AddSingleton(scope.AuditScope);
            services.AddSingleton(scope.UnitOfWork);
            services.AddSingleton(scope.CustomerRepository);
            services.AddSingleton(scope.ProductRepository);
            services.AddSingleton(scope.ProductCodeService);
            services.AddSingleton(scope.ProductUnitService);
            services.AddSingleton(scope.InventoryCostingService);
            services.AddSingleton(scope.SaleReturnCalculation);
            services.AddSingleton(scope.PurchaseReturnCalculation);
            services.AddSingleton(scope.PosPaymentGuard);
            services.AddSingleton(scope.SystemSettings);
            services.AddSingleton(scope.PaymentAccounts);
            services.AddSingleton<IObjectStorageService>(FakeObjectStorage.Instance);
            services.AddSingleton(FakeUserContext.WithUserId(userId));
            return services.BuildServiceProvider().GetRequiredService<IMediator>();
        }

        private static int SeedUser(TestDatabase db)
        {
            using var context = db.NewContext();
            return Seed.PersistedUser(context, "auditor").Id;
        }

        private static CreateCustomerCommand NewCustomer() => new()
        {
            FirstName = "علی",
            LastName = "رضایی",
            PhoneNumber = "09121234567",
            Address = "تهران",
            PostalCode = "1234567890",
            BalanceType = BalanceTypeEnum.Debtor,
        };

        private static Dictionary<string, JsonElement> Values(string? json) =>
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json!)!;

        [Fact]
        public async Task CreateCustomer_IsOneInsertEvent_WithActionUserAndTheWholeRow()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);
            using var scope = db.NewScope(FakeUserContext.WithUserId(userId));

            await Mediator(scope, userId).Send(NewCustomer(), TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var auditEvent = await verify.AuditEvents.Include(x => x.Changes).SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(AuditActionEnum.CreateCustomer, auditEvent.Action);
            Assert.Equal(userId, auditEvent.UserId);

            var change = Assert.Single(auditEvent.Changes);
            var customer = await verify.Customers.SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(nameof(Customer), change.EntityType);
            Assert.Equal(customer.Id.ToString(), change.EntityKey);
            Assert.Equal(AuditOperationEnum.INSERT, change.Operation);
            Assert.Null(change.OldValues);
            Assert.Null(change.DocumentKind);

            var values = Values(change.NewValues);
            Assert.Equal(customer.Id, values["Id"].GetInt32());
            Assert.Equal("علی", values["FirstName"].GetString());
            // Persian is stored as text, not \u escapes.
            Assert.Contains("علی", change.NewValues);
        }

        [Fact]
        public async Task UpdateCustomer_RecordsOnlyTheColumnsThatChanged()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);
            int customerId;
            using (var context = db.NewContext())
            {
                var customer = Seed.Customer();
                context.Customers.Add(customer);
                context.SaveChanges();
                customerId = customer.Id;
            }

            using var scope = db.NewScope(FakeUserContext.WithUserId(userId));
            var update = new UpdateCustomerCommand
            {
                Id = customerId,
                FirstName = "علی",
                LastName = "محمدی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = BalanceTypeEnum.Debtor,
            };
            await Mediator(scope, userId).Send(update, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var change = await verify.AuditEntityChanges.SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(AuditOperationEnum.UPDATE, change.Operation);

            var old = Values(change.OldValues);
            var @new = Values(change.NewValues);
            Assert.Equal("رضایی", old["LastName"].GetString());
            Assert.Equal("محمدی", @new["LastName"].GetString());
            Assert.False(@new.ContainsKey("FirstName"));
            Assert.Equal(old.Keys.OrderBy(k => k), @new.Keys.OrderBy(k => k));
        }

        [Fact]
        public async Task EntityHistory_IsTheRowsTimeline_NewestFirst_WithOnlyItsChanges()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);
            using var scope = db.NewScope(FakeUserContext.WithUserId(userId));
            var mediator = Mediator(scope, userId);
            await mediator.Send(NewCustomer(), TestContext.Current.CancellationToken);
            await mediator.Send(NewCustomer(), TestContext.Current.CancellationToken);

            int customerId;
            using (var context = db.NewContext())
                customerId = (await context.Customers.OrderBy(x => x.Id).FirstAsync(cancellationToken: TestContext.Current.CancellationToken)).Id;

            await mediator.Send(new UpdateCustomerCommand
            {
                Id = customerId,
                FirstName = "علی",
                LastName = "محمدی",
                PhoneNumber = "09121234567",
                Address = "تهران",
                PostalCode = "1234567890",
                BalanceType = BalanceTypeEnum.Debtor,
            }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var res = await new GetEntityHistoryQueryHandler(verify)
                .Handle(new GetEntityHistoryQuery { EntityType = " Customer ", EntityKey = customerId.ToString() }, CancellationToken.None);
            var history = Assert.IsType<List<AuditEventDto>>(res.Data);

            // The second customer's creation is not this row's history.
            Assert.Equal(new[] { AuditActionEnum.UpdateCustomer, AuditActionEnum.CreateCustomer }, history.Select(e => e.Action!.Value));
            var lastName = Assert.Single(history[0].Changes).Fields.Single(f => f.Name == "LastName");
            Assert.Equal("رضایی", lastName.OldValue!.Value.GetString());
            Assert.Equal("محمدی", lastName.NewValue!.Value.GetString());
            Assert.All(history, e => Assert.All(e.Changes, c => Assert.Equal(customerId.ToString(), c.EntityKey)));
        }

        [Fact]
        public async Task ActionList_IsTheWholeEnum_WithTitles()
        {
            var res = await new GetAuditActionListQueryHandler().Handle(new GetAuditActionListQuery(), CancellationToken.None);
            var actions = Assert.IsType<List<AuditActionDto>>(res.Data);

            Assert.Equal(Enum.GetValues<AuditActionEnum>().Length, actions.Count);
            var create = Assert.Single(actions, a => a.Value == (int)AuditActionEnum.CreateCustomer);
            Assert.Equal(nameof(AuditActionEnum.CreateCustomer), create.Name);
            Assert.Equal("ایجاد مشتری", create.Title);
        }

        [Fact]
        public async Task CreateProduct_SavingTwice_IsStillOneEvent()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);
            int categoryId;
            using (var context = db.NewContext())
            {
                var category = Seed.Category();
                context.ProductCategories.Add(category);
                context.SaveChanges();
                categoryId = category.Id;
            }

            using var scope = db.NewScope(FakeUserContext.WithUserId(userId));
            var mediator = Mediator(scope, userId);
            await mediator.Send(new CreateProductCommand
            {
                Name = "کالای تست",
                Unit = ProductUnitEnum.Number,
                ProductCategoryId = categoryId,
                IsIncomplete = true,
            }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var auditEvent = await verify.AuditEvents.Include(x => x.Changes).SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(AuditActionEnum.CreateProduct, auditEvent.Action);

            // The placeholder insert and the real code written by the second save, under one event.
            var productChanges = auditEvent.Changes.Where(c => c.EntityType == nameof(Product)).ToList();
            Assert.Contains(productChanges, c => c.Operation == AuditOperationEnum.INSERT);
            var codeUpdate = Assert.Single(productChanges, c => c.Operation == AuditOperationEnum.UPDATE);
            Assert.Equal((await verify.Products.SingleAsync(cancellationToken: TestContext.Current.CancellationToken)).Code, Values(codeUpdate.NewValues)["Code"].GetString());

            // The next command gets its own event.
            await mediator.Send(NewCustomer(), TestContext.Current.CancellationToken);
            Assert.Equal(2, await verify.AuditEvents.CountAsync(cancellationToken: TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task SalePayment_IsLinkedToTheSale_AndTheHistoryShowsOnlyThatSalesRows()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);
            int saleId;
            using (var context = db.NewContext())
            {
                var product = Seed.Product(Seed.Category());
                var sale = Seed.Sale(Seed.Customer(), SalesStatusEnum.PROFORMA, Seed.SaleItem(product, 2, 1000));
                sale.InvoiceNumber = "";
                sale.ProformaStage = SaleProformaStageEnum.WAREHOUSE_CHECKED;
                context.Sales.Add(sale);
                context.SaveChanges();
                saleId = sale.Id;
            }

            using var scope = db.NewScope(FakeUserContext.WithUserId(userId));
            var mediator = Mediator(scope, userId);
            await mediator.Send(new AddSalePaymentCommand { SaleId = saleId, Type = PaymentTypeEnum.CASH, Amount = 500 }, TestContext.Current.CancellationToken);
            await mediator.Send(NewCustomer(), TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var paymentEvent = await verify.AuditEvents.Include(x => x.Changes).SingleAsync(x => x.Action == AuditActionEnum.AddSalePayment, cancellationToken: TestContext.Current.CancellationToken);
            Assert.Contains(paymentEvent.Changes, c => c.EntityType == nameof(PaymentDetail) && c.Operation == AuditOperationEnum.INSERT
                                                       && c.DocumentKind == DocumentKindEnum.SALE && c.DocumentId == saleId);
            var saleChange = Assert.Single(paymentEvent.Changes, c => c.EntityType == nameof(Sale));
            Assert.Equal(DocumentKindEnum.SALE, saleChange.DocumentKind);
            Assert.Equal((int)SalesStatusEnum.PROFORMA, Values(saleChange.OldValues)["Status"].GetInt32());
            Assert.Equal((int)SalesStatusEnum.PROCESSING, Values(saleChange.NewValues)["Status"].GetInt32());
            // Ledgers are history already and are not recorded twice.
            Assert.DoesNotContain(paymentEvent.Changes, c => c.EntityType == nameof(PartyLedgerEntry));

            var history = await new GetDocumentHistoryQueryHandler(verify)
                .Handle(new GetDocumentHistoryQuery { DocumentKind = DocumentKindEnum.SALE, DocumentId = saleId }, CancellationToken.None);
            var historyEvent = Assert.Single(Assert.IsType<List<AuditEventDto>>(history.Data));
            Assert.Equal(AuditActionEnum.AddSalePayment, historyEvent.Action);
            Assert.Equal("ثبت دریافت فروش", historyEvent.ActionTitle);
            Assert.Equal("کاربر تست", historyEvent.UserName);
            Assert.All(historyEvent.Changes, c => Assert.Equal(saleId, c.DocumentId));
            var status = historyEvent.Changes.Single(c => c.EntityType == nameof(Sale)).Fields.Single(f => f.Name == "Status");
            Assert.Equal((int)SalesStatusEnum.PROFORMA, status.OldValue!.Value.GetInt32());
            Assert.Equal((int)SalesStatusEnum.PROCESSING, status.NewValue!.Value.GetInt32());
        }

        [Fact]
        public async Task Installment_ChangedWithoutItsPlanLoaded_IsStillLinkedToTheSale()
        {
            using var db = new TestDatabase();
            int saleId, installmentId;
            using (var context = db.NewContext())
            {
                var sale = Seed.Sale(Seed.Customer(), SalesStatusEnum.PROCESSING, Seed.SaleItem(Seed.Product(Seed.Category()), 1, 1000));
                var plan = new SaleInstallmentPlan
                {
                    Sale = sale,
                    CashAmount = 1000,
                    TotalAmount = 1000,
                    FinancedAmount = 1000,
                    InstallmentCount = 1,
                    InstallmentAmount = 1000,
                    FirstDueDate = DateTime.Today,
                    Status = SaleInstallmentPlanStatusEnum.ACTIVE,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Installments = { new SaleInstallment { Number = 1, DueDate = DateTime.Today, Amount = 1000, CreatedAt = DateTime.Now, UpdatedAt = DateTime.Now } },
                };
                context.SaleInstallmentPlans.Add(plan);
                context.SaveChanges();
                saleId = sale.Id;
                installmentId = plan.Installments[0].Id;
            }

            // Only the installment is tracked: the sale is found through one query for the plan.
            using (var context = db.NewContext())
            {
                var installment = await context.SaleInstallments.SingleAsync(x => x.Id == installmentId, cancellationToken: TestContext.Current.CancellationToken);
                installment.Status = SaleInstallmentStatusEnum.CANCELLED;
                await context.SaveChangesAsync(TestContext.Current.CancellationToken);
            }

            using var verify = db.NewContext();
            var change = await verify.AuditEntityChanges.SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(nameof(SaleInstallment), change.EntityType);
            Assert.Equal(DocumentKindEnum.SALE, change.DocumentKind);
            Assert.Equal(saleId, change.DocumentId);
            // Outside any command: no action, no user, and the event is still written.
            var auditEvent = await verify.AuditEvents.SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Null(auditEvent.Action);
            Assert.Null(auditEvent.UserId);
        }

        [Fact]
        public async Task DeletedRow_KeepsItsWholeOldRowAndDocument()
        {
            using var db = new TestDatabase();
            int saleId, itemId;
            using (var context = db.NewContext())
            {
                var product = Seed.Product(Seed.Category());
                var sale = Seed.Sale(Seed.Customer(), SalesStatusEnum.PROFORMA, Seed.SaleItem(product, 1), Seed.SaleItem(product, 2));
                context.Sales.Add(sale);
                context.SaveChanges();
                saleId = sale.Id;
                itemId = sale.Items[1].Id;
            }

            using (var context = db.NewContext())
            {
                context.SaleItems.Remove(await context.SaleItems.SingleAsync(x => x.Id == itemId, cancellationToken: TestContext.Current.CancellationToken));
                await context.SaveChangesAsync(TestContext.Current.CancellationToken);
            }

            using var verify = db.NewContext();
            var change = await verify.AuditEntityChanges.SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(AuditOperationEnum.DELETE, change.Operation);
            Assert.Equal(itemId.ToString(), change.EntityKey);
            Assert.Equal(saleId, change.DocumentId);
            Assert.Null(change.NewValues);
            Assert.Equal(2, Values(change.OldValues)["Quantity"].GetInt32());
        }

        [Fact]
        public async Task Secrets_AreRedactedOrLeftOut()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);

            using (var context = db.NewContext())
            {
                var user = await context.Users.SingleAsync(x => x.Id == userId, cancellationToken: TestContext.Current.CancellationToken);
                user.RefreshToken = "secret-refresh-token";
                user.ExpireRefreshToken = DateTime.Now.AddDays(1);
                await context.SaveChangesAsync(TestContext.Current.CancellationToken);
            }

            using (var verify = db.NewContext())
                Assert.False(await verify.AuditEvents.AnyAsync(cancellationToken: TestContext.Current.CancellationToken)); // session bookkeeping only: nothing to record

            using (var context = db.NewContext())
            {
                var user = await context.Users.SingleAsync(x => x.Id == userId, cancellationToken: TestContext.Current.CancellationToken);
                user.PasswordHash = "new-hash";
                await context.SaveChangesAsync(TestContext.Current.CancellationToken);
            }

            using var check = db.NewContext();
            var change = await check.AuditEntityChanges.SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal("***", Values(change.OldValues)["PasswordHash"].GetString());
            Assert.Equal("***", Values(change.NewValues)["PasswordHash"].GetString());
            Assert.DoesNotContain("new-hash", change.NewValues);
        }

        [Fact]
        public async Task RolledBackTransaction_LeavesNoAuditRows()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            await Assert.ThrowsAsync<InvalidOperationException>(() => scope.UnitOfWork.ExecuteInTransactionAsync<int>(async ct =>
            {
                scope.Context.Customers.Add(Seed.Customer());
                await scope.Context.SaveChangesAsync(ct);
                throw new InvalidOperationException("boom");
            }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.False(await verify.Customers.AnyAsync(cancellationToken: TestContext.Current.CancellationToken));
            Assert.False(await verify.AuditEvents.AnyAsync(cancellationToken: TestContext.Current.CancellationToken));
            Assert.False(await verify.AuditEntityChanges.AnyAsync(cancellationToken: TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task NestedCommand_RecordsUnderTheOuterAction()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();

            using (scope.AuditScope.Begin(AuditActionEnum.CompleteInPersonSale))
            {
                using (scope.AuditScope.Begin(AuditActionEnum.CreateSale))
                {
                    scope.Context.Customers.Add(Seed.Customer());
                    await scope.Context.SaveChangesAsync(TestContext.Current.CancellationToken);
                }

                Assert.Equal(AuditActionEnum.CompleteInPersonSale, scope.AuditScope.Action);
                scope.Context.Customers.Add(Seed.Customer("رضا"));
                await scope.Context.SaveChangesAsync(TestContext.Current.CancellationToken);
            }

            Assert.Null(scope.AuditScope.Action);

            using var verify = db.NewContext();
            var auditEvent = await verify.AuditEvents.Include(x => x.Changes).SingleAsync(cancellationToken: TestContext.Current.CancellationToken);
            Assert.Equal(AuditActionEnum.CompleteInPersonSale, auditEvent.Action);
            Assert.Equal(2, auditEvent.Changes.Count);
        }

        [Fact]
        public async Task ListAndDetail_FilterAndShowEveryChange()
        {
            using var db = new TestDatabase();
            var userId = SeedUser(db);
            using var scope = db.NewScope(FakeUserContext.WithUserId(userId));
            var mediator = Mediator(scope, userId);
            await mediator.Send(NewCustomer(), TestContext.Current.CancellationToken);
            await mediator.Send(NewCustomer(), TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var customerId = (await verify.Customers.OrderBy(x => x.Id).FirstAsync(cancellationToken: TestContext.Current.CancellationToken)).Id;
            var handler = new GetAuditEventListQueryHandler(verify);

            var all = await handler.Handle(new GetAuditEventListQuery { UserId = userId, Action = AuditActionEnum.CreateCustomer, FromDate = DateTime.Today, ToDate = DateTime.Today }, CancellationToken.None);
            Assert.Equal(2, ListOf(all).Count);

            var one = ListOf(await handler.Handle(new GetAuditEventListQuery { EntityType = nameof(Customer), EntityKey = customerId.ToString() }, CancellationToken.None));
            var row = Assert.Single(one);
            Assert.Equal(1, row.ChangeCount);
            Assert.Equal("ایجاد مشتری", row.ActionTitle);

            Assert.Empty(ListOf(await handler.Handle(new GetAuditEventListQuery { DocumentKind = DocumentKindEnum.SALE, DocumentId = 1 }, CancellationToken.None)));

            var detail = Assert.IsType<AuditEventDto>((await new GetAuditEventDetailQueryHandler(verify)
                .Handle(new GetAuditEventDetailQuery { Id = row.Id }, CancellationToken.None)).Data);
            var change = Assert.Single(detail.Changes);
            Assert.Contains(change.Fields, f => f.Name == "FirstName" && f.OldValue == null && f.NewValue!.Value.GetString() == "علی");

            await Assert.ThrowsAsync<NotFoundCustomException>(() => new GetAuditEventDetailQueryHandler(verify)
                .Handle(new GetAuditEventDetailQuery { Id = 999999 }, CancellationToken.None));
        }

        private static List<AuditEventListDto> ListOf(ResponseDto res)
        {
            var property = res.Data!.GetType().GetProperty("AuditEventList")!;
            return Assert.IsType<List<AuditEventListDto>>(property.GetValue(res.Data));
        }
    }
}
