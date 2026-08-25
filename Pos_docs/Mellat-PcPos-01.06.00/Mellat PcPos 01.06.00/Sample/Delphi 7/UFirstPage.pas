unit UFirstPage;

interface

uses
  
  Windows, Messages, SysUtils, Classes,
  Controls, Forms, Dialogs,
  StdCtrls, ExtCtrls, Result_Transaction, Application_Layer,
  ComCtrls, jpeg, ScktComp, Sockets,UTools;

type
  TForm2 = class(TForm)
    Button1: TButton;
    Panel1: TPanel;
    Label3: TLabel;
    editAccount: TEdit;
    Label4: TLabel;
    EditBank: TEdit;
    Label5: TLabel;
    EditCard: TEdit;
    Label6: TLabel;
    EditSerial: TEdit;
    Label7: TLabel;
    EditTerminal: TEdit;
    EditSabt: TEdit;
    Label8: TLabel;
    Label9: TLabel;
    EditDate: TEdit;
    EditTime: TEdit;
    Label10: TLabel;
    EditError: TEdit;
    Label12: TLabel;
    EditErrorCode: TEdit;
    Panel2: TPanel;
    PageControl1: TPageControl;
    Tab_Buy: TTabSheet;
    Image1: TImage;
    Image2: TImage;
    Image3: TImage;
    Tab_Setting: TTabSheet;
    Label11: TLabel;
    EdtMoney: TEdit;
    EdtPayerid: TEdit;
    Label1: TLabel;
    Label2: TLabel;
    EdtMerchant: TMemo;
    Edit_MerchantAddData: TEdit;
    Label23: TLabel;
    GroupBox2: TGroupBox;
    Label25: TLabel;
    Edit_PortNumber: TEdit;
    Edit_IPAddress: TEdit;
    Label13: TLabel;
    procedure Button1Click(Sender: TObject);
    procedure FormShow(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

var
  Form2: TForm2;
  

implementation

{$R *.dfm}

procedure TForm2.Button1Click(Sender: TObject);
Var
   MSG_OK : string;
   Result_Transaction_Table1 : Result_Transaction_Table;
   Application_Layer1  : TApplication_Layer;

begin
   try
       EditError.Text := '';
       editAccount.Text := '';
       EditBank.Text := '';
       EditCard.Text := '';
       EditSerial.Text := '';
       EditTerminal.Text := '';
       EditSabt.Text := '';
       EditDate.Text := '';
       EditTime.Text := '';
       EditErrorCode.Text := '';
       Form2.Refresh;
       Result_Transaction_Table1  := Result_Transaction_Table.Create;

       Application_Layer1   := TApplication_Layer.Create(Edit_IPAddress.Text,StrToIntDef(Edit_PortNumber.Text,1024),60);


       if PageControl1.ActivePage = Tab_Buy then
           Result_Transaction_Table1 := Application_Layer1.POS_PC_Debits_Goods_And_Service(EdtMoney.Text,EdtPayerid.Text,EdtMerchant.Text,MSG_OK);


       EditError.Text := MSG_OK;
       editAccount.Text := Result_Transaction_Table1.Result_AccountNo;
       EditBank.Text := Result_Transaction_Table1.Result_BIN;
       EditCard.Text := Result_Transaction_Table1.Result_PAN;
       EditSerial.Text := Result_Transaction_Table1.Result_SerialTransaction;
       EditTerminal.Text := Result_Transaction_Table1.Result_TerminalNo;
       EditSabt.Text := Result_Transaction_Table1.Result_TraceNumber;
       EditDate.Text := Result_Transaction_Table1.Result_TransactionDate;
       EditTime.Text := Result_Transaction_Table1.Result_TransactionTime;
       EditErrorCode.Text := Result_Transaction_Table1.Result_ReturnCode;

   finally

   end;

end;

procedure TForm2.FormShow(Sender: TObject);
begin
   PageControl1.ActivePage := Tab_Buy;
end;




end.
