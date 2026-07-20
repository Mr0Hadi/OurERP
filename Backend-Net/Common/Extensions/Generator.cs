using System.Security.Cryptography;
using System.Text;

namespace Common.Extensions
{
    public static class Generator
    {
        public static string GetUniqueKey(int size)
        {
            char[] chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVXYZW23456789".ToCharArray();

            byte[] array = new byte[4 * size];
            using (RNGCryptoServiceProvider rNGCryptoServiceProvider = new RNGCryptoServiceProvider())
            {
                rNGCryptoServiceProvider.GetBytes(array);
            }

            StringBuilder stringBuilder = new StringBuilder(size);
            for (int i = 0; i < size; i++)
            {
                long num = BitConverter.ToUInt32(array, i * 4) % chars.Length;
                stringBuilder.Append(chars[num]);
            }

            return stringBuilder.ToString();
        }

        public static string GenerateRandomNumber(int digits)
        {
            Random random = new Random();

            // عدد اول نباید صفر باشه (اگر digits > 1)
            int firstDigit = random.Next(1, 10);

            // اگر فقط یک رقم خواسته شده، همون رو برگردون
            if (digits == 1)
                return firstDigit.ToString();

            char[] numberChars = new char[digits];
            numberChars[0] = (char)('0' + firstDigit);

            for (int i = 1; i < digits; i++)
            {
                numberChars[i] = (char)('0' + random.Next(0, 10));
            }

            return new string(numberChars);
        }
    }
}
