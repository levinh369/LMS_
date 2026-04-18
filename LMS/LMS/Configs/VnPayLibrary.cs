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
                if (!string.IsNullOrEmpty(kv.Value) && kv.Key != "vnp_SecureHash")
                {
                    data.Append(WebUtility.UrlEncode(kv.Key) + "=" + WebUtility.UrlEncode(kv.Value) + "&");
                }
            }
            string checkSum = HmacSHA512(secretKey, data.ToString().Remove(data.Length - 1));
            return checkSum.Equals(inputHash, StringComparison.InvariantCultureIgnoreCase);
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