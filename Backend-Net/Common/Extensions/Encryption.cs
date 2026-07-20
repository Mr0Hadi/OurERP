using System.Security.Cryptography;
using System.Text;

namespace Common.Extensions
{
    public static class Encryption
    {

        public static string ToHashSHA256(this string text)
        {

            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(text));
                StringBuilder builder = new StringBuilder();
                for (int i = 0; i < bytes.Length; i++)
                {
                    builder.Append(bytes[i].ToString("x2"));
                }
                return builder.ToString();
            }

        }

        private static byte[] Encrypt(string plainText, byte[] key, byte[] iv)
        {
            using (Aes aesAlg = Aes.Create()) // AES = Advanced Encryption Standard
            {
                aesAlg.Key = key;
                aesAlg.IV = iv; // Initialization Vector
                aesAlg.Mode = CipherMode.CBC;

                ICryptoTransform encryptor = aesAlg.CreateEncryptor(aesAlg.Key, aesAlg.IV);

                using (MemoryStream msEncrypt = new MemoryStream())
                {
                    using (CryptoStream csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
                    {
                        using (StreamWriter swEncrypt = new StreamWriter(csEncrypt))
                        {
                            swEncrypt.Write(plainText);
                        }
                        return msEncrypt.ToArray();
                    }
                }
            }
        }

        public static string Encrypt(string clearText, string key)
        {
            var pdb2 = new Rfc2898DeriveBytes(key, // PBKDF2 (Password-Based Key Derivation Function 2).
                new byte[] { 0x46, 0x76, 0x37, 0x6e, 0x19, 0x4d, 0x44, 0x87, 0x12, 0x65, 0x43, 0x56, 0x97 }, 5,
                HashAlgorithmName.SHA512);
            byte[] decryptedData2 = Encrypt(clearText, pdb2.GetBytes(32), pdb2.GetBytes(16));
            return Convert.ToBase64String(decryptedData2);
        }

        private static string Decrypt(byte[] cipherText, byte[] key, byte[] iv)
        {
            using (Aes aesAlg = Aes.Create())
            {
                aesAlg.Key = key;
                aesAlg.IV = iv;
                aesAlg.Mode = CipherMode.CBC;

                ICryptoTransform decryptor = aesAlg.CreateDecryptor(aesAlg.Key, aesAlg.IV);

                using (MemoryStream msDecrypt = new MemoryStream(cipherText))
                {
                    using (CryptoStream csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                    {
                        using (StreamReader srDecrypt = new StreamReader(csDecrypt))
                        {
                            return srDecrypt.ReadToEnd();
                        }
                    }
                }
            }

        }

        public static string Decrypt(string cipherText, string key)
        {
            byte[] cipherBytes = Convert.FromBase64String(cipherText);

            var pdb2 = new Rfc2898DeriveBytes(key,
                new byte[] { 0x46, 0x76, 0x37, 0x6e, 0x19, 0x4d, 0x44, 0x87, 0x12, 0x65, 0x43, 0x56, 0x97 }, 5,
                HashAlgorithmName.SHA512);

            return Decrypt(cipherBytes, pdb2.GetBytes(32), pdb2.GetBytes(16));
        }

    }
}
