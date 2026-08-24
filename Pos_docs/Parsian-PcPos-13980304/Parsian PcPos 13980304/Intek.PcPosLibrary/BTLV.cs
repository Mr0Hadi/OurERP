using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Intek.PcPosLibrary
{
    public class BTLV
    {
        public List<BTLV> children = new List<BTLV>();
        public String Tag = "";
        public String Value = "";
        String Data = "";
        public void AddEntry(String Tag, String Value)
        {
            if (Value == null)
                return;
            Data += Tag.PadLeft(2, ' ') + Value.Length.ToString().PadLeft(3, '0') + Value;
            children.Add(new BTLV() {Tag = Tag, Value = Value });
        }
        public BTLV Open(String d)
        {
            while (d.Length != 0)
            {
                BTLV tlv = new BTLV();
                tlv.Tag = d.Substring(0, 2);
                int l = int.Parse(d.Substring(2, 3));
                if (l > 0)
                    tlv.Value = d.Substring(5, l);
                d = d.Substring(5 + l, d.Length - 5 - l);
                children.Add(tlv);
            }
            return this;
        }
        public String Print(String indent)
        {
            String ss = "";
            if (children.Count == 0)
                return indent + "TAG: [" + Tag + "] Value: [" + Value + "]";
            foreach (BTLV t in children)
            {
                ss += t.Print(indent + "--")+"\r\n";
            }
            return ss;
        }
        public override string ToString()
        {
            return Data;
        }
    }
}
