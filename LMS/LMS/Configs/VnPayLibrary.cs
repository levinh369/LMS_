using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace LMS.Configs // <-- Nhìn kỹ chỗ này
{
    public class VnPayLibrary
    {
        private SortedList<string, string> _requestData = new SortedList<string, string>(new VnPayComparer());
        private SortedList<string, string> _responseData = new SortedList<string, string>(new VnPayComparer());

        public void AddRequestData(string key, string value) => _requestData.Add(key, value);
        public void AddResponseData(string key, string value) => _responseData.Add(key, value);

        public string CreateRequestUrl(string baseUrl, string vnp_HashSecret)
        {
            StringBuilder data = new StringBuilder();
            foreach (KeyValuePair<string, string> kv in _requestData)
            {
                if (!string.IsNullOrEmpty(kv.Value))
                {
                    data.Append(WebUtility.UrlEncode(kv.Key) + "=" + WebUtility.UrlEncode(kv.Value) + "&");
                }
            }
            string queryString = data.ToString();
            baseUrl += "?" + queryString;
            string signData = queryString.Remove(data.Length - 1);
            string vnp_SecureHash = HmacSHA512(vnp_HashSecret, signData);
            baseUrl += "vnp_SecureHash=" + vnp_SecureHash;
            return baseUrl;
        }

        public bool ValidateSignature(string inputHash, string secretKey)
        {
            StringBuilder data = new StringBuilder();
            foreach (KeyValuePair<string, string> kv in _responseData)
            {
                if (!string.IsNullOrEmpty(kv.Value))
                {
                    if (kv.Key == "vnp_SecureHash" || kv.Key == "vnp_SecureHashType") continue;

                    // Sử dụng một hàm ép Encode tùy biến, đảm bảo đồng bộ 100% định dạng với VNPay
                    string encodedKey = UrlEncodeCustom(kv.Key);
                    string encodedValue = UrlEncodeCustom(kv.Value);

                    data.Append(encodedKey + "=" + encodedValue + "&");
                }
            }

            string rawData = data.ToString();
            if (rawData.EndsWith("&"))
            {
                rawData = rawData.Remove(rawData.Length - 1);
            }

            string myChecksum = HmacSHA512(secretKey, rawData);
            return myChecksum.Equals(inputHash, StringComparison.InvariantCultureIgnoreCase);
        }

        // THÊM HÀM NÀY VÀO TRONG FILE VNPAYLIBRARY.CS ĐỂ BAO TRỌN CÁC KÝ TỰ ĐẶC BIỆT
        private string UrlEncodeCustom(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;

            // Sử dụng Uri.EscapeDataString để mã hóa chuẩn RFC 3986
            string encoded = Uri.EscapeDataString(input);

            // VNPay yêu cầu các ký tự này phải giữ nguyên hoặc mã hóa đặc biệt:
            // Khoảng trắng biến thành dấu +
            encoded = encoded.Replace("%20", "+");

            // Nếu VNPay yêu cầu chữ IN HOA cho các ký tự mã hóa (ví dụ %c3%b3 -> %C3%B3)
            // Bạn chạy thử bản ToUpper() này trước. Nếu vẫn lỗi, hãy đổi thử thành .ToLower() nhé!
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < encoded.Length; i++)
            {
                if (encoded[i] == '%')
                {
                    sb.Append('%');
                    sb.Append(encoded[i + 1].ToString().ToUpper());
                    sb.Append(encoded[i + 2].ToString().ToUpper());
                    i += 2;
                }
                else
                {
                    sb.Append(encoded[i]);
                }
            }

            return sb.ToString();
        }
        private string HmacSHA512(string key, string inputData)
        {
            var hash = new StringBuilder();
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            byte[] inputBytes = Encoding.UTF8.GetBytes(inputData);
            using (var hmac = new HMACSHA512(keyBytes))
            {
                byte[] hashValue = hmac.ComputeHash(inputBytes);
                foreach (var theByte in hashValue) hash.Append(theByte.ToString("x2"));
            }
            return hash.ToString();
        }
        public string GetResponseData(string key)
        {
            if (_responseData.TryGetValue(key, out var val))
            {
                return val;
            }
            return string.Empty;
        }
    }


    public class VnPayComparer : IComparer<string>
    {
        public int Compare(string x, string y) => string.CompareOrdinal(x, y);
    }
}