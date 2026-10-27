
interface USDT_PaymentPayload {
  event: string;
  data: {
    txHash: string;
    from: string;
    to: string;
    amount: string;
    blockNumber: number;
  };
}