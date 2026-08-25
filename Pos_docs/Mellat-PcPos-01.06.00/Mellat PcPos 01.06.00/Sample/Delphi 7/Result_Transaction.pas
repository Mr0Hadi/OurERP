{*******************************************************}
{                                                       }
{       last update: 05 Tir 1397                       }
{                                                       }
{       Behpardakht Mellat                              }
{                                                       }
{*******************************************************}

unit Result_Transaction;

interface
uses Classes;
Type
  Result_Transaction_Table = class{(TComponent)}
  private
    { Private declarations }
     l_SerialTransaction : String ;
     l_TraceNumber : String ;
     l_TransactionDate : String ;
     l_TransactionTime : String ;
     l_PAN : String ;
     l_BIN : String ;
     l_TerminalNo : String ;
     l_AccountNo : String ;
     l_ReqID : String;
     l_ReasonCode : String;
     l_ReturnCode : String;
     l_PcId :String;
     l_TotalAmount : String;
     l_DiscountAmount : String;
  Protected

  public
    { Public declarations }
     Procedure Set_Result_SerialTransaction(Value : String);
     Procedure Set_Result_TraceNumber(Value : String);
     Procedure Set_Result_TransactionDate(Value : String);
     Procedure Set_Result_TransactionTime(Value : String);
     Procedure Set_Result_PAN(Value : String);
     Procedure Set_Result_BIN(Value : String);
     Procedure Set_Result_TerminalNo(Value : String);
     Procedure Set_Result_AccountNo(Value : String);
     Procedure Set_Result_ReqId(Value : String);
     Procedure Set_Result_ReasonCode(Value : String);
     Procedure Set_Result_ReturnCode(Value : String);
     Procedure Set_Result_PcId(Value : String);
     Procedure Set_Result_TotalAmount(Value : String);
     Procedure Set_Result_DiscountAmount(Value : String);

     property Result_SerialTransaction : String Read l_SerialTransaction  Write Set_Result_SerialTransaction;
     property Result_TraceNumber       : String Read l_TraceNumber        Write Set_Result_TraceNumber;
     property Result_TransactionDate   : String Read l_TransactionDate    Write Set_Result_TransactionDate;
     property Result_TransactionTime   : String Read l_TransactionTime    Write Set_Result_TransactionTime;
     property Result_PAN               : String Read l_PAN                Write Set_Result_PAN;
     property Result_BIN               : String Read l_BIN                Write Set_Result_BIN;
     property Result_TerminalNo        : String Read l_TerminalNo         Write Set_Result_TerminalNo;
     property Result_AccountNo         : String Read l_AccountNo          Write Set_Result_AccountNo;
     property Result_ReqId             : String Read l_ReqId              Write Set_Result_ReqId;
     property Result_ReasonCode        : String Read l_ReasonCode         Write Set_Result_ReasonCode;
     property Result_ReturnCode        : String Read l_ReturnCode         Write Set_Result_ReturnCode;
     property Result_PcId              : String Read l_PcId               Write Set_Result_PcId;
     property Result_TotalAmount       : String Read l_TotalAmount        Write Set_Result_TotalAmount;
     property Result_DiscountAmount    : String Read l_DiscountAmount     Write Set_Result_DiscountAmount;


Published
     constructor Create();
  end;

implementation

   constructor Result_Transaction_Table.Create();
   begin
     l_SerialTransaction := '000000';
     l_TraceNumber := '000000000000';
     l_TransactionDate := '0000000000';
     l_TransactionTime := '00000';
     l_PAN := '0000';
     l_BIN := '000000';
     l_TerminalNo := '00000000';
     l_AccountNo := '00000000000000';
     l_ReqID := '0';
     l_ReasonCode := '0';
     l_ReturnCode := '0';
     l_PcId := '0';
     l_TotalAmount := '0';
     l_DiscountAmount := '0';
   end;
   Procedure Result_Transaction_Table.Set_Result_SerialTransaction(Value : String);
   Begin
      l_SerialTransaction := Value;
   End;


   Procedure Result_Transaction_Table.Set_Result_TraceNumber(Value : String);
   Begin
      l_TraceNumber := Value;
   End;
   Procedure Result_Transaction_Table.Set_Result_TransactionDate(Value : String);
   Begin
      l_TransactionDate := Value;
   End;
   Procedure Result_Transaction_Table.Set_Result_TransactionTime(Value : String);
   Begin
      l_TransactionTime := Value;
   End;
   Procedure Result_Transaction_Table.Set_Result_PAN(Value : String);
   Begin
      l_PAN := Value;
   End;
   Procedure Result_Transaction_Table.Set_Result_BIN(Value : String);
   Begin
      l_BIN := Value;
   End;
   Procedure Result_Transaction_Table.Set_Result_TerminalNo(Value : String);
   Begin
      l_TerminalNo := Value;
   End;
   Procedure Result_Transaction_Table.Set_Result_AccountNo(Value : String);
   Begin
      l_AccountNo := Value;
   End;

   Procedure Result_Transaction_Table.Set_Result_ReqId(Value : String);
   Begin
      l_ReqID := Value;
   End;

   Procedure Result_Transaction_Table.Set_Result_ReasonCode(Value : String);
   Begin
      l_ReasonCode := Value;
   End;

   Procedure Result_Transaction_Table.Set_Result_ReturnCode(Value : String);
   Begin
      if Value = '000' then
         Value := '100';
      l_ReturnCode := Value;
   End;

   Procedure Result_Transaction_Table.Set_Result_PcId(Value : String);
   Begin
      l_PcId := Value;
   End;

   Procedure Result_Transaction_Table.Set_Result_TotalAmount(Value : String);
   Begin
      l_TotalAmount := Value;
   End;

   Procedure Result_Transaction_Table.Set_Result_DiscountAmount(Value : String);
   Begin
      l_DiscountAmount := Value;
   End;



end.
