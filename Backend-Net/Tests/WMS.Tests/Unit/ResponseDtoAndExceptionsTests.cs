using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;

namespace WMS.Tests.Unit
{
    public class ResponseDtoTests
    {
        [Fact]
        public void Success_SetsMessageDataAndType()
        {
            var res = ResponseDto.Success("ok", new { X = 1 });

            Assert.Equal("ok", res.Message);
            Assert.Equal(ResponseMessageTypeEnum.Success.ToString(), res.ResponseMessageType);
            Assert.NotNull(res.Data);
        }

        [Fact]
        public void Warning_WithoutData_DataIsNull()
        {
            var res = ResponseDto.Warning("careful");

            Assert.Equal(ResponseMessageTypeEnum.Warning.ToString(), res.ResponseMessageType);
            Assert.Null(res.Data);
        }

        [Fact]
        public void Danger_WithData_KeepsData()
        {
            var res = ResponseDto.Danger("bad", new { Code = 400 });

            Assert.Equal(ResponseMessageTypeEnum.Danger.ToString(), res.ResponseMessageType);
            Assert.NotNull(res.Data);
        }
    }

    public class CustomExceptionsTests
    {
        [Fact]
        public void NotFoundCustomException_DefaultsToPersianMessageAnd404()
        {
            var ex = new NotFoundCustomException();

            Assert.Equal(404, ex.StatusCode);
            Assert.Equal("داده مورد نظر یافت نشد.", ex.Error);
        }

        [Fact]
        public void ValidationCustomException_Is400()
        {
            var ex = new ValidationCustomException("bad input");

            Assert.Equal(400, ex.StatusCode);
            Assert.Equal("bad input", ex.Error);
            Assert.Null(ex.Data);
        }

        [Fact]
        public void ValidationCustomException_WithData_CarriesData()
        {
            var payload = new { Field = "Name" };

            var ex = new ValidationCustomException("bad input", payload);

            Assert.Same(payload, ex.Data);
        }
    }
}
