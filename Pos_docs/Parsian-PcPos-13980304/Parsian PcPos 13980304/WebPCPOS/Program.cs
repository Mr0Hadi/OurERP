using Nancy;
using System;
using System.Collections.Generic;
using System.Text;
using Nancy.ModelBinding;
using Microsoft.Owin.Hosting;
using Intek.PcPosLibrary;
using Owin;
using Nancy.TinyIoc;
using Nancy.Bootstrapper;
using System.Net.Sockets;

namespace WebPCPOS
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.UseNancy();
        }
    }
    class PCPOS_Req
    {
        public string PR { get; set; }

        public string AM { get; set; }
        public string CU { get; set; }
        public string R1 { get; set; }
        public string R2 { get; set; }
        public string T1 { get; set; }
        public string T2 { get; set; }
        public string SV { get; set; }
        public string SG { get; set; }
        public string AD { get; set; }
        public string PD { get; set; }
        public List<string> ST { get; set; }
        public List<string> AV { get; set; }
    }
    class PCPOS_Res
    {
        public BTLV resp_tlv { get; set; }
        public int resp_code { get; set; }
        public string resp_msg { get; set; }

    }

    public class PCPOSBootstrapper : DefaultNancyBootstrapper
    {
        protected override void ApplicationStartup(TinyIoCContainer container, IPipelines pipelines)
        {
            pipelines.AfterRequest += ctx =>
            {
                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                ctx.Response.Headers.Add("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
                ctx.Response.Headers.Add("Access-Control-Allow-Methods", "DELETE");
            };
        }
    }

    public class PCPOSModule : NancyModule
    {

        string ip1 = "";
        string port1 = "";
        public void seperateipport(string c)
        {
            char[] t = new char[25];
            t = c.ToCharArray();
            string ip = "";
            string port = "";
            for (int i = 0; i < t.Length; i++)
            {
                if (t[i] != ':')
                {
                    ip = ip + t[i];
                }
                else
                    break;
            }
            for (int j = 0; j < t.Length; j++)
            {
                if (t[j] != ':')
                    continue;
                j++;
                while (j < t.Length)
                {
                    port += t[j++];
                }
                break;

            }
            Console.WriteLine("ip=" + ip);
            Console.WriteLine("port=" + port);
            ip1 = ip;
            port1 = port;
        }

        public PCPOSModule()
        {

            Post["/pcpos"] = parameters =>
            {

                PCPOS_Res res = new PCPOS_Res();
                res.resp_tlv = null;
                res.resp_code = -1;
                res.resp_msg = "Unknown Error";


                try
                {
                    var req = this.Bind<PCPOS_Req>();
                    res.resp_tlv = doPCPOS(req);
                    res.resp_code = 0;
                    res.resp_msg = "Successful";
                }
                catch (Exception ex)
                {
                    Console.Out.WriteLine(ex);
                    res.resp_msg = ex.Message;

                }
                return res;
            };
        }

        BTLV doPCPOS(PCPOS_Req req)
        {
            BTLV req_tlv = new BTLV();
            BTLV res_tlv = null;
            req_tlv.AddEntry("PR", req.PR);
            req_tlv.AddEntry("AM", req.AM);
            req_tlv.AddEntry("CU", req.CU);
            req_tlv.AddEntry("R1", req.R1);
            req_tlv.AddEntry("R2", req.R2);
            req_tlv.AddEntry("T1", req.T1);
            req_tlv.AddEntry("T2", req.T2);
            req_tlv.AddEntry("BI", req.SV);
            req_tlv.AddEntry("PI", req.SG);
            req_tlv.AddEntry("AD", req.AD);
            req_tlv.AddEntry("PD", req.PD);
            if (req.ST.Count > 0)
            {
                foreach (String s in req.ST)
                {
                    BTLV sett = new BTLV();
                    String[] kv = s.Split('=');
                    if (kv.Length != 2)
                        continue;
                    sett.AddEntry("AC", kv[0]);
                    sett.AddEntry("AM", kv[1]);
                    req_tlv.AddEntry("ST", sett.ToString());
                }
            }
            if (req.AV.Count > 0)
            {
                foreach (String s in req.AV)
                {
                    BTLV kt = new BTLV();
                    String[] kv = s.Split('=');
                    if (kv.Length != 2)
                        continue;
                    kt.AddEntry("KY", kv[0]);
                    kt.AddEntry("VL", kv[1]);
                    req_tlv.AddEntry("AV", kt.ToString());
                    req_tlv.AddEntry("PV", kt.ToString());
                }
            }
            String gg = req_tlv.ToString();
            req_tlv = new BTLV();
            req_tlv.AddEntry("RQ", gg);
            var txt_req = req_tlv.ToString();
            Console.WriteLine(txt_req);
            byte[] req_byte = ASCIIEncoding.GetEncoding(1256).GetBytes(txt_req.Length.ToString().PadLeft(4, '0') + txt_req);      
            byte[] lenBytes = new byte[4];
            byte[] packetBytes = new byte[500];

            seperateipport(Properties.Settings.Default.IPPort);
            TcpClient client = new TcpClient(ip1, Convert.ToInt32(port1));
            byte[] bytesToRead = new byte[500];

            try
            {
                // **************TCP********************//
                NetworkStream nwStream = client.GetStream();
                //---send the Data---
                Console.WriteLine("\n Sending : " + Encoding.ASCII.GetString(req_byte) + "\r\n");
                nwStream.Write(req_byte, 0, req_byte.Length);
                int lenRead = 500;
                //bytesToRead = new byte[lenRead];
                int bytesRead = nwStream.Read(bytesToRead, 0, lenRead);
                string tempTotalData = Encoding.ASCII.GetString(bytesToRead);
                Console.WriteLine("Total Recieved Data:" + tempTotalData);
                lenRead = Convert.ToInt32(tempTotalData.Substring(0, 4));
                Console.WriteLine("len of data that should read it:" + lenRead.ToString());
                string temp_RS_Data = tempTotalData.Substring(4, lenRead);
                Console.WriteLine("Data Without 4 Bytes Len:" + temp_RS_Data);
                res_tlv = new BTLV();
                res_tlv.Open(temp_RS_Data.Substring(5)/*ASCIIEncoding.GetEncoding(1256).GetString(packetBytes).Substring(res_start_idx)*/);
                //Console.Out.WriteLine("resrpp:"+ resp/*ASCIIEncoding.GetEncoding(1256).GetString(packetBytes)*/);
                Console.Out.WriteLine(res_tlv.Print(""));
            }
            catch (Exception ex)
            {
                client.Close();
                Console.Out.WriteLine("Err : " + ex.Message);
                throw ex;
            }
            finally
            {
                client.Close();
            }
            return res_tlv;
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            var url = "http://127.0.0.1:8080";
            using (WebApp.Start<Startup>(url))
            {
                Console.WriteLine("Running on {0}", url);
                Console.WriteLine("Press enter to exit");
                Console.ReadLine();
            }

        }

    }
}
