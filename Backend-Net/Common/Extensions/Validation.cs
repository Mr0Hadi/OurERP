using System.Text.RegularExpressions;

namespace Common.Extensions
{
    public static class Validation
    {
        public static bool IsNationalCode(string? str)
        {
            //در صورتی که کد ملی وارد شده تهی باشد
            var regex = new Regex(@"\d{10}");
            if (String.IsNullOrEmpty(str) || str.Length != 10 || !regex.IsMatch(str))
                return false;

            //در صورتی که رقم‌های کد ملی وارد شده یکسان باشد
            var allDigitEqual = new[] { "0000000000", "1111111111", "2222222222", "3333333333", "4444444444", "5555555555", "6666666666", "7777777777", "8888888888", "9999999999" };
            if (allDigitEqual.Contains(str)) return false;

            //عملیات شرح داده شده در بالا
            var chArray = str.ToCharArray();
            var num0 = Convert.ToInt32(chArray[0].ToString()) * 10;
            var num2 = Convert.ToInt32(chArray[1].ToString()) * 9;
            var num3 = Convert.ToInt32(chArray[2].ToString()) * 8;
            var num4 = Convert.ToInt32(chArray[3].ToString()) * 7;
            var num5 = Convert.ToInt32(chArray[4].ToString()) * 6;
            var num6 = Convert.ToInt32(chArray[5].ToString()) * 5;
            var num7 = Convert.ToInt32(chArray[6].ToString()) * 4;
            var num8 = Convert.ToInt32(chArray[7].ToString()) * 3;
            var num9 = Convert.ToInt32(chArray[8].ToString()) * 2;
            var a = Convert.ToInt32(chArray[9].ToString());

            var b = (((((((num0 + num2) + num3) + num4) + num5) + num6) + num7) + num8) + num9;
            var c = b % 11;

            return (((c < 2) && (a == c)) || ((c >= 2) && ((11 - c) == a)));
        }

        public static bool IsMobileNumber(string? str)
        {
            if (string.IsNullOrWhiteSpace(str))
                return false;

            // Regex pattern: شروع با 09، و بعدش 9 رقم عددی
            return Regex.IsMatch(str, @"^09\d{9}$");
        }

        public static bool IsValidPassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                return false;

            // فقط حروف، اعداد و کاراکتر خاص مجازند
            var allowedCharsPattern = @"^[a-zA-Z0-9!@#$%^&*()_\-+=\[\]{}|\\:;""'<>,.?/~`]+$";
            if (!Regex.IsMatch(password, allowedCharsPattern))
                return false;

            // حداقل یک حرف
            if (!Regex.IsMatch(password, @"[a-zA-Z]"))
                return false;

            // حداقل یک عدد
            if (!Regex.IsMatch(password, @"\d"))
                return false;

            // حداقل یک کاراکتر خاص
            if (!Regex.IsMatch(password, @"[!@#$%^&*()_\-+=\[\]{}|\\:;""'<>,.?/~`]"))
                return false;

            return true;
        }

        public static bool IsPersianText(this string input)
        {
            string pattern = @"^[\u0600-\u06FF]+(?: [\u0600-\u06FF]+)*$";

            return Regex.IsMatch(input, pattern);
        }

        public static bool IsEnglishText(this string input)
        {
            string pattern = @"^[A-Za-z\s\d_-]+$";

            return Regex.IsMatch(input, pattern);
        }

        public static bool IsNotNullOrEmpty(string value)
        {
            return !string.IsNullOrWhiteSpace(value); ;
        }

        public static string RequiredMessage(string fieldName)
        {
            return $"لطفا {fieldName} را وارد نمایید";
        }

        public static bool IsValidIPv4(this string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return false;

            string pattern = @"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[12][0-9]|3[0-2]))?$";

            return Regex.IsMatch(input, pattern);

        }
    }
}
