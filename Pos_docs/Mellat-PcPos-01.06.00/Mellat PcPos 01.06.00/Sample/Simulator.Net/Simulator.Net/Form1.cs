using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using System.IO.Ports;
using System.Runtime.InteropServices;
using System.Net.Sockets;
using Newtonsoft.Json;
namespace Simulator.Net
{

    public partial class Form1 : Form
    {
        UInt64 totalAmount = 0;
        public Form1()
        {
            InitializeComponent();
        }

        void clearPage()
        {
            txtPaymentFeild59.Text = "";
            txtBillFeild59.Text = "";
            textResult.Text = "";
            txtAccountId.Text = "";
            txtAccountNo.Text = "";
            txtBillId.Text = "";
            txtBillMsg.Text = "";
            txtBillPaymentPcID.Text = "";
            txtCardNo.Text = "";
            txtDate.Text = "";
            txtDebitAmount.Text = "";
            txtDebitFeild59.Text = "";
            txtDebitMsg.Text = "";
            txtDebitPayerId.Text = "";
            txtDebitPcID.Text = "";
            txtPayId.Text = "";
            txtPaymentAmount.Text = "";
            txtPaymentPayerId.Text = "";
            txtPaymentPcID.Text = "";
            txtResponseCode.Text = "";
            txtRRN.Text = "";
            txtTeminalNo.Text = "";
            txtTime.Text = "";
            txtTransSerialNo.Text = "";
            txtEsfehanPcID.Text = "";
            txtEsfehanFeild59.Text = "";
            txtEsfehanAmount.Text = "";
            txtEsfehanAccountId.Text = "";
            txtEsfehanPayerId.Text = "";
            pictureBox1.Image = null;
        }
        private void sendData(byte[] dataToSend, Socket clientSocket)
        {
            try
            {
                clientSocket.Send(dataToSend);

            }
            catch
            {
                MessageBox.Show("خطا در ارسال اطلاعات");
            }
        }
        private void btDebitConfirm_Click(object sender, EventArgs e)
        {
            btDebitConfirm.Enabled = false;
            //----------------- Transaction config --------------------------------
            int AmountInt;
            bool isNumeric6 = int.TryParse(txtDebitAmount.Text, out AmountInt);
            if (txtDebitAmount.Text.Length < 4 || isNumeric6 == false)
            {
                MessageBox.Show(" مبلغ خرید کالا نامعتبر است");
            }
            else
            {
                System.Net.Sockets.TcpClient client = null;
                try
                {
                    System.Net.ServicePointManager.Expect100Continue = false;
                    byte[] resvCommand = new byte[10025];
                    client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection  
                    if(!client.Connected)
                    {
                        btDebitConfirm.Enabled = true;
                        MessageBox.Show("pleas check Service Port");
                        return;
                    }
                    NetworkStream stream = client.GetStream();
                    string str_comm = "" + "{\"ServiceCode\" :\"" + "1";
                    if(txtDebitAmount.Text.Length > 0)
                        str_comm += "\",\"Amount\":\"" + txtDebitAmount.Text;
                    if (txtDebitPayerId.Text.Length > 0)
                        str_comm += "\",\"PayerId\":\"" + txtDebitPayerId.Text;
                    if (txtDebitMsg.Text.Length > 0)
                        str_comm += "\",\"MerchantMsg\":\"" + txtDebitMsg.Text;
                    if (txtDebitPcID.Text.Length > 0)
                        str_comm += "\",\"PcID\":\"" + txtDebitPcID.Text;
                    str_comm += "\"}";

                    //string str_comm = "" + "{\"ServiceCode\" :\"" + "1" + "\",\"Amount\":\"" + txtDebitAmount.Text + "\",\"PayerId\":\"" + txtDebitPayerId.Text + "\",\"MerchantMsg\":\"" + txtDebitMsg.Text + "\",\"PcID\":\"" + txtDebitPcID.Text + "\"}";
                    byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);
                    stream.Write(sendCommand, 0, sendCommand.Length);
                    stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                    int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                    string jsonStr = Encoding.UTF8.GetString(resvCommand);
                    Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                    ParseJson(values);
                    btDebitConfirm.Enabled = true;
                    client.Close();
                    

                }
                catch (Exception ex)
                {
                    btDebitConfirm.Enabled = true;
                    try
                    {
                        MessageBox.Show(ex.Message.ToString());
                        
                        client.Close();
                        
                    }
                    catch
                    { }
                }

            }
            btDebitConfirm.Enabled = true;
        }

        private void groupBox1_Enter(object sender, EventArgs e)
        {

        }

        private void button1_Click(object sender, EventArgs e)
        {
            btPaymentConfirm.Enabled = false;
            //----------------- Transaction config --------------------------------
            int AmountInt;
            bool isNumeric6 = int.TryParse(txtPaymentAmount.Text, out AmountInt);
            if (txtPaymentAmount.Text.Length < 4 || isNumeric6 == false)
            {
                MessageBox.Show(" مبلغ خرید کالا نامعتبر است");
            }
            else
            {
                System.Net.Sockets.TcpClient client = null;
                try
                {
                System.Net.ServicePointManager.Expect100Continue = false;
                byte[] resvCommand = new byte[10025];
                client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection  
                    if (!client.Connected)
                    {
                        btPaymentConfirm.Enabled = true;
                        MessageBox.Show("pleas check Service Port");
                        return;
                    }
                    NetworkStream stream = client.GetStream();
                    string str_comm = "" + "{\"ServiceCode\" :\"" + "2";
                    if(txtPaymentAmount.Text.Length > 0)
                        str_comm += "\",\"Amount\":\"" + txtPaymentAmount.Text;
                    if (txtPaymentPayerId.Text.Length > 0)
                        str_comm += "\",\"PayerId\":\"" + txtPaymentPayerId.Text;
                    if (txtAccountId.Text.Length > 0)
                        str_comm += "\",\"AccountID\":\"" + txtAccountId.Text;
                    if (txtPaymentMsg.Text.Length > 0)
                        str_comm += "\",\"MerchantMsg\":\"" + txtPaymentMsg.Text;
                    if (txtPaymentPcID.Text.Length > 0)
                        str_comm += "\",\"PcID\":\"" + txtPaymentPcID.Text;
                    str_comm += "\"}";
                    
                    byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);
                    //byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes("{\"ServiceCode\" :\"" + "2" + "\",\"Amount\":\"" + txtPaymentAmount.Text + "\",\"PayerId\":\"" + txtPaymentPayerId.Text + "\",\"AccountID\":\"" + txtAccountId.Text + "\",\"PcID\":\"" + txtPaymentPcID.Text + "\"}");

                    stream.Write(sendCommand, 0, sendCommand.Length);
                    stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                    int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                    string jsonStr = Encoding.UTF8.GetString(resvCommand);
                    Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                    ParseJson(values);

                    client.Close();
                    btPaymentConfirm.Enabled = true;

                }
                catch (Exception ex)
                {
                    btPaymentConfirm.Enabled = true;
                    try
                    {
                        MessageBox.Show(ex.Message.ToString());

                        client.Close();

                    }
                    catch
                    { }
                }

            }
            btPaymentConfirm.Enabled = true;
        }

        private void button2_Click(object sender, EventArgs e)

        {
            btBillConfirm.Enabled = false;
            //----------------- Transaction config --------------------------------
            System.Net.Sockets.TcpClient client = null;
            try
                {
                System.Net.ServicePointManager.Expect100Continue = false;
                byte[] resvCommand = new byte[10025];
                client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection 
                if (!client.Connected)
                {
                    btBillConfirm.Enabled = true;
                    MessageBox.Show("pleas check Service Port");
                    return;
                }
                NetworkStream stream = client.GetStream();
                //byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes("{\"ServiceCode\" :\"" + "5" + "\",\"BillID\":\"" + txtBillId.Text + "\",\"PayID\":\"" + txtPayId.Text + "\",\"MerchantMsg\":\"" + txtBillMsg.Text + "\",\"PcID\":\"" + txtBillPaymentPcID.Text + "\"}");
                string str_comm = "" + "{\"ServiceCode\" :\"" + "5";
                if (txtBillId.Text.Length > 0)
                    str_comm += "\",\"BillID\":\"" + txtBillId.Text;
                if (txtPayId.Text.Length > 0)
                    str_comm += "\",\"PayID\":\"" + txtPayId.Text;
                if (txtBillMsg.Text.Length > 0)
                    str_comm += "\",\"MerchantMsg\":\"" + txtBillMsg.Text;
                if (txtBillPaymentPcID.Text.Length > 0)
                    str_comm += "\",\"PcID\":\"" + txtBillPaymentPcID.Text;
                str_comm += "\"}";
                byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);

                

                stream.Write(sendCommand, 0, sendCommand.Length);
                stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                    string jsonStr = Encoding.UTF8.GetString(resvCommand);
                    Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                    ParseJson(values);

                client.Close();
                btBillConfirm.Enabled = true;

            }
            catch (Exception ex)
            {
                btBillConfirm.Enabled = true;
                try
                {
                    MessageBox.Show(ex.Message.ToString());

                    client.Close();

                }
                catch
                { }
            }
            btBillConfirm.Enabled = true;
        }

        private void button3_Click(object sender, EventArgs e)
        {
            clearPage();
        }

        private void button4_Click(object sender, EventArgs e)
        {
            btEsfehanChargeConfirm.Enabled = false;
            //----------------- Transaction config --------------------------------
                int AmountInt;
                bool isNumeric6 = int.TryParse(txtEsfehanAmount.Text, out AmountInt);
                if (txtEsfehanAmount.Text.Length < 4 || isNumeric6 == false)
                {
                    MessageBox.Show(" مبلغ خرید کالا نامعتبر است");
                }
                else
                {
                    System.Net.Sockets.TcpClient client = null;
                    try
                    {
                        System.Net.ServicePointManager.Expect100Continue = false;
                        byte[] resvCommand = new byte[10025];
                        client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection  
                    if (!client.Connected)
                    {
                        btEsfehanChargeConfirm.Enabled = true;
                        MessageBox.Show("pleas check Service Port");
                        return;
                    }
                    NetworkStream stream = client.GetStream();
                    string str_comm = "" + "{\"ServiceCode\" :\"" + "11";
                    if(txtEsfehanAmount.Text.Length > 0)
                        str_comm += "\",\"Amount\":\"" + txtEsfehanAmount.Text;
                    if (txtEsfehanPayerId.Text.Length > 0)
                        str_comm += "\",\"PayerId\":\"" + txtEsfehanPayerId.Text;
                    if (txtEsfehanFeild59.Text.Length > 0)
                        str_comm += "\",\"MerchantMsg\":\"" + txtEsfehanFeild59.Text;
                    if (txtEsfehanPcID.Text.Length > 0)
                        str_comm += "\",\"PcID\":\"" + txtEsfehanPcID.Text;
                    str_comm += "\"}";

                    //string str_comm = "" + "{\"ServiceCode\" :\"" + "11" + "\",\"Amount\":\"" + txtEsfehanAmount.Text + "\",\"PayerId\":\"" + txtEsfehanPayerId.Text + "\",\"MerchantMsg\":\"" + txtEsfehanFeild59.Text + "\",\"PcID\":\"" + txtEsfehanPcID.Text + "\"}";
                        byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);
                        stream.Write(sendCommand, 0, sendCommand.Length);
                    stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                    int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                        string jsonStr = Encoding.UTF8.GetString(resvCommand);
                        Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                    ParseJson(values);

                    client.Close();
                    btEsfehanChargeConfirm.Enabled = true;
                }
                    catch (Exception ex)
                    {
                    btEsfehanChargeConfirm.Enabled = true;
                    try
                    {
                        MessageBox.Show(ex.Message.ToString());

                        client.Close();

                    }
                    catch
                    { }
                }
            }
            btEsfehanChargeConfirm.Enabled = true;
        }

        private void button5_Click(object sender, EventArgs e)
        {
            btEsfehanGisheConfirm.Enabled = false;
            //----------------- Transaction config --------------------------------
            int AmountInt;
            bool isNumeric6 = int.TryParse(txtEsfehanAmount.Text, out AmountInt);
            if (txtEsfehanAmount.Text.Length < 4 || isNumeric6 == false)
            {
                MessageBox.Show(" مبلغ خرید کالا نامعتبر است");
            }
            else
            {
                System.Net.Sockets.TcpClient client = null;
                try
                {
                    System.Net.ServicePointManager.Expect100Continue = false;
                    byte[] resvCommand = new byte[10025];
                    client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection  
                    if (!client.Connected)
                    {
                        btEsfehanGisheConfirm.Enabled = true;
                        MessageBox.Show("pleas check Service Port");
                        return;
                    }
                    NetworkStream stream = client.GetStream();
                    string str_comm = "" + "{\"ServiceCode\" :\"" + "12";
                    str_comm += "\",\"CardType\":\"" + "0";
                    if(txtEsfehanAmount.Text.Length > 0)
                        str_comm += "\",\"Amount\":\"" + txtEsfehanAmount.Text;
                    if (txtEsfehanPayerId.Text.Length > 0)
                        str_comm += "\",\"PayerId\":\"" + txtEsfehanPayerId.Text;
                    if (txtEsfehanAccountId.Text.Length > 0)
                        str_comm += "\",\"AccountID\":\"" + txtEsfehanAccountId.Text;
                    if (txtEsfehanFeild59.Text.Length > 0)
                        str_comm += "\",\"MerchantMsg\":\"" + txtEsfehanFeild59.Text;
                    if (txtEsfehanPcID.Text.Length > 0)
                        str_comm += "\",\"PcID\":\"" + txtEsfehanPcID.Text;
                    str_comm += "\"}";
                    byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);
                    stream.Write(sendCommand, 0, sendCommand.Length);
                    stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                    int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                    string jsonStr = Encoding.UTF8.GetString(resvCommand);
                    Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                    ParseJson(values);

                    client.Close();
                    btEsfehanGisheConfirm.Enabled = true;

                }
                catch (Exception ex)
                {
                    btEsfehanGisheConfirm.Enabled = true;
                    try
                    {
                        MessageBox.Show(ex.Message.ToString());

                        client.Close();

                    }
                    catch
                    { }
                }
            }
            btEsfehanGisheConfirm.Enabled = true;
        }

        private void button6_Click(object sender, EventArgs e)
        {
            btEsfehanCreditConfirm.Enabled = false;
            //----------------- Transaction config --------------------------------
            int AmountInt;
            bool isNumeric6 = int.TryParse(txtEsfehanAmount.Text, out AmountInt);
            if (txtEsfehanAmount.Text.Length < 4 || isNumeric6 == false)
            {
                MessageBox.Show(" مبلغ خرید کالا نامعتبر است");
            }
            else
            {
                System.Net.Sockets.TcpClient client = null;
                try
                {
                    System.Net.ServicePointManager.Expect100Continue = false;
                    byte[] resvCommand = new byte[10025];
                    client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection
                    if (!client.Connected)
                    {
                        btEsfehanCreditConfirm.Enabled = true;
                        MessageBox.Show("pleas check Service Port");
                        return;
                    }
                    NetworkStream stream = client.GetStream();
                    string str_comm = "" + "{\"ServiceCode\" :\"" + "13";
                    str_comm += "\",\"CardType\":\"" + "1";
                    if(txtEsfehanAmount.Text.Length > 0)
                        str_comm += "\",\"Amount\":\"" + txtEsfehanAmount.Text;
                    if (txtEsfehanPayerId.Text.Length > 0)
                        str_comm += "\",\"PayerId\":\"" + txtEsfehanPayerId.Text;
                    if (txtEsfehanAccountId.Text.Length > 0)
                        str_comm += "\",\"AccountID\":\"" + txtEsfehanAccountId.Text;
                    if (txtEsfehanFeild59.Text.Length > 0)
                        str_comm += "\",\"MerchantMsg\":\"" + txtEsfehanFeild59.Text;
                    if (txtEsfehanPcID.Text.Length > 0)
                        str_comm += "\",\"PcID\":\"" + txtEsfehanPcID.Text;
                    str_comm += "\"}";
                    byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);
                    stream.Write(sendCommand, 0, sendCommand.Length);
                    stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                    int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                    string jsonStr = Encoding.UTF8.GetString(resvCommand);
                    Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                    ParseJson(values);

                    client.Close();
                    btEsfehanCreditConfirm.Enabled = true;

                }
                catch (Exception ex)
                {
                    btEsfehanCreditConfirm.Enabled = true;
                    try
                    {
                        MessageBox.Show(ex.Message.ToString());

                        client.Close();

                    }
                    catch
                    { }
                }
            }
            btEsfehanCreditConfirm.Enabled = true;
        }

        private void btAdd_Click(object sender, EventArgs e)
        {

            {
                int rowsNum = dataGridView1.RowCount;

                if (rowsNum == 10)
                {
                    MessageBox.Show("امکان اضافه شدن رکورد جدید وجود ندارد");
                    return;
                }

                if (txtAccountIdM.Text == "")
                {
                    MessageBox.Show(" امکان ارسال شناسه حساب بدون مقدار وجود ندارد ");
                    return;
                }

                if (txtAmount.Text == "")
                {
                    MessageBox.Show("امکان ارسال مبلغ بدون مقدار وجود ندارد");
                    return;
                }

                try
                {
                    totalAmount = totalAmount + UInt64.Parse(txtAmount.Text);
                }
                catch
                {
                    MessageBox.Show("مبلغ ورودی نامعتبر است");
                    txtAmount.Text = "";
                    return;
                }

                dataGridView1.Rows.Add(txtAccountIdM.Text, txtAmount.Text, txtPayerId.Text);

                txtTotalAmount.Text = totalAmount.ToString();          
            }
        }

        private void btRmv_Click(object sender, EventArgs e)
        {

            {
                int selectedCount = dataGridView1.SelectedRows.Count;

                int rmv_index = 0;

                if (this.dataGridView1.SelectedRows.Count > 0)
                {
                    rmv_index = this.dataGridView1.SelectedRows[0].Index;


                    string rmv_amount = dataGridView1.Rows[rmv_index].Cells[1].Value.ToString();

                    totalAmount = totalAmount - UInt64.Parse(rmv_amount);

                    dataGridView1.Rows.RemoveAt(this.dataGridView1.SelectedRows[0].Index);

                    txtTotalAmount.Text = totalAmount.ToString();
                }
                else
                {
                    MessageBox.Show("رکوردی جهت حذف وجود ندارد");
                    return;
                }

            }
        }

        private void btmultiPaymentConfirm_Click(object sender, EventArgs e)

        {
            btmultiPaymentConfirm.Enabled = false;
            UInt64 local_totalAmount = 0;

            int rowsNum = dataGridView1.RowCount;

            if (rowsNum == 0)
            {
                btmultiPaymentConfirm.Enabled = true;
                MessageBox.Show("لطفا اطلاعات واریزی تراکنش را وارد نمایید");
                return;
            }

            if (txtTotalAmount.Text == "")
            {
                btmultiPaymentConfirm.Enabled = true;
                MessageBox.Show("مبلغ کل پرداخت نامعتبر می باشد");
                return;
            }

                local_totalAmount = 0;
            string[] AccountID = new string[10];
            string[] Amount = new string[10];
            string[] PayerID = new string[10];
            string RequestList = null;
            for (int i = 0; i < rowsNum; i++)
                {
                    AccountID[i] = dataGridView1.Rows[i].Cells[0].Value.ToString();
                    Amount[i] = dataGridView1.Rows[i].Cells[1].Value.ToString();
                    PayerID[i] = dataGridView1.Rows[i].Cells[2].Value.ToString();
                    RequestList += "{\"AccountID\":\"" + AccountID[i] + "\",\"Amount\":\"" + Amount[i] + "\",\"PayerID\":\"" + PayerID[i] + "\"}";
                    local_totalAmount = local_totalAmount + UInt64.Parse(Amount[i]);
                    if (i != rowsNum - 1)
                    {
                        //RequestList += "\",\"";
                        RequestList += ",";
                    }
                }

            System.Net.Sockets.TcpClient client = null;
            try
            {
                System.Net.ServicePointManager.Expect100Continue = false;
                byte[] resvCommand = new byte[10025];
                client = new System.Net.Sockets.TcpClient(txtIP.Text, UInt16.Parse(txtPort.Text)); // Create a new connection  
                if (!client.Connected)
                {
                    btmultiPaymentConfirm.Enabled = true;
                    MessageBox.Show("pleas check Service Port");
                    return;
                }
                NetworkStream stream = client.GetStream();
                //string str_comm = "" + "{\"ServiceCode\" :\"" + "4" + "\",\"TotalAmount\":\"" + local_totalAmount.ToString() + "\",\"RequestList\":[" + RequestList + "],\"PrintDetail\":\"" + txtPrinFlag.Text + "\",\"PcID\":\"" + txtMultiPcID.Text + "\"}";
                string str_comm = "" + "{\"ServiceCode\" :\"" + "4";
                if (local_totalAmount.ToString().Length > 0)
                    str_comm += "\",\"TotalAmount\":\"" + local_totalAmount.ToString();
                if (RequestList.Length > 0)
                    str_comm += "\",\"RequestList\":[" + RequestList + "]";
                if (txtMultiPaymentMsg.Text.Length > 0)
                    str_comm += "\",\"MerchantMsg\":\"" + txtMultiPaymentMsg.Text;
                if (txtPrinFlag.Text.Length > 0)
                    str_comm += ",\"PrintDetail\":\"" + txtPrinFlag.Text;
                if (txtMultiPcID.Text.Length > 0)
                {
                    if (txtPrinFlag.Text.Length > 0)
                        str_comm += "\"";
                    str_comm += ",\"PcID\":\"" + txtMultiPcID.Text;
                }
                if (txtMultiPcID.Text.Length > 0 || txtPrinFlag.Text.Length > 0)
                    str_comm += "\"}";
                else
                    str_comm += "}";
                byte[] sendCommand = System.Text.Encoding.ASCII.GetBytes(str_comm);
                stream.Write(sendCommand, 0, sendCommand.Length);
                stream.ReadTimeout = Int32.Parse(ReadTimeOut.Text);
                int recvSize = stream.Read(resvCommand, 0, resvCommand.Length);

                string jsonStr = Encoding.UTF8.GetString(resvCommand);
                Dictionary<String, String> values = JsonConvert.DeserializeObject<Dictionary<String, String>>(jsonStr);
                ParseJson(values);

                client.Close();
                btmultiPaymentConfirm.Enabled = true;

            }
            catch (Exception ex)
            {
                btmultiPaymentConfirm.Enabled = true;
                try
                {
                    MessageBox.Show(ex.Message.ToString());

                    client.Close();

                }
                catch
                { }
            }
            btmultiPaymentConfirm.Enabled = true;
        }

        private void ParseJson(Dictionary<string, string> values)
        {
            foreach (KeyValuePair<String, String> d in values)
            {
                //values.Add(d.Key, d.Value);
                if (d.Key == "AccountNo")
                    txtAccountNo.Text = d.Value;
                else if (d.Key == "PAN" && d.Value.Length > 0)
                {
                    txtCardNo.Text = d.Value;
                }
                else if (d.Key == "SerialTransaction")
                    txtTransSerialNo.Text = d.Value;
                else if (d.Key == "TraceNumber")
                    txtRRN.Text = d.Value;
                else if (d.Key == "TerminalNo")
                    txtTeminalNo.Text = d.Value;
                else if (d.Key == "TransactionDate")
                    txtDate.Text = d.Value;
                else if (d.Key == "TransactionTime")
                    txtTime.Text = d.Value;
                else if (d.Key == "ReasonCode")
                    txtResponseCode.Text = d.Value;
                if (d.Key == "ReturnCode")
                {
                    textResult.Text = d.Value;
                    if (d.Value == "100")
                        pictureBox1.Image = imageList1.Images[0];
                    else
                        pictureBox1.Image = imageList1.Images[1];
                }
            }
        }
    }
}
