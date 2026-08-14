using Application.Common.Behaviors;
using Application.Common.Dtos;
using Common.Exceptions;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using NSubstitute;

namespace WMS.Tests.Unit
{
    public class ValidationBehaviorTests
    {
        public class Ping : IRequest<ResponseDto>
        {
            public string? Name { get; set; }
        }

        [Fact]
        public async Task Handle_NoValidatorsRegistered_CallsNext()
        {
            var behavior = new ValidationBehavior<Ping, ResponseDto>(Array.Empty<IValidator<Ping>>());
            var expected = new ResponseDto();

            var result = await behavior.Handle(new Ping(), ct => Task.FromResult(expected), CancellationToken.None);

            Assert.Same(expected, result);
        }

        [Fact]
        public async Task Handle_ValidRequest_CallsNext()
        {
            var validator = Substitute.For<IValidator<Ping>>();
            validator.ValidateAsync(Arg.Any<ValidationContext<Ping>>(), Arg.Any<CancellationToken>())
                .Returns(new ValidationResult());

            var behavior = new ValidationBehavior<Ping, ResponseDto>(new[] { validator });
            var expected = new ResponseDto();
            var nextCalled = false;

            var result = await behavior.Handle(new Ping(), ct => { nextCalled = true; return Task.FromResult(expected); }, CancellationToken.None);

            Assert.True(nextCalled);
            Assert.Same(expected, result);
        }

        [Fact]
        public async Task Handle_InvalidRequest_ThrowsValidationCustomExceptionWithFirstFailure()
        {
            var validator = Substitute.For<IValidator<Ping>>();
            validator.ValidateAsync(Arg.Any<ValidationContext<Ping>>(), Arg.Any<CancellationToken>())
                .Returns(new ValidationResult(new[]
                {
                    new ValidationFailure("Name", "first failure"),
                    new ValidationFailure("Name", "second failure"),
                }));

            var behavior = new ValidationBehavior<Ping, ResponseDto>(new[] { validator });

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(
                () => behavior.Handle(new Ping(), ct => Task.FromResult(new ResponseDto()), CancellationToken.None));

            Assert.Equal("first failure", ex.Error);
            Assert.Equal(400, ex.StatusCode);
        }

        [Fact]
        public async Task Handle_MultipleValidators_AggregatesFailuresFromAll()
        {
            var validator1 = Substitute.For<IValidator<Ping>>();
            validator1.ValidateAsync(Arg.Any<ValidationContext<Ping>>(), Arg.Any<CancellationToken>())
                .Returns(new ValidationResult());

            var validator2 = Substitute.For<IValidator<Ping>>();
            validator2.ValidateAsync(Arg.Any<ValidationContext<Ping>>(), Arg.Any<CancellationToken>())
                .Returns(new ValidationResult(new[] { new ValidationFailure("Name", "from validator 2") }));

            var behavior = new ValidationBehavior<Ping, ResponseDto>(new[] { validator1, validator2 });

            var ex = await Assert.ThrowsAsync<ValidationCustomException>(
                () => behavior.Handle(new Ping(), ct => Task.FromResult(new ResponseDto()), CancellationToken.None));

            Assert.Equal("from validator 2", ex.Error);
        }
    }
}
