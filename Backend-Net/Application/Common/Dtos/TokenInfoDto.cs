using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Common.Dtos
{
    public class TokenInfoDto
    {
        public string Id { get; set; }
        public bool IsExpired { get; set; }
        public string Mobile { get; set; }
    }
}
