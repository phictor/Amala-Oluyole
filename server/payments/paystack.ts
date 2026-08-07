export type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
};

type PaystackEnvelope<T> = { status: boolean; message?: string; data?: T };

export function validatePaystackTransaction(
  transaction: PaystackTransaction,
  expected: { reference: string; amountKobo: number; orderId: number; userId: number; appId: string },
): void {
  if (transaction.status !== "success") throw new Error("Payment was not successful");
  if (transaction.reference !== expected.reference) throw new Error("Payment reference mismatch");
  if (transaction.amount !== expected.amountKobo) throw new Error("Payment amount mismatch");
  if (transaction.currency !== "NGN") throw new Error("Payment currency mismatch");

  const metadata = transaction.metadata ?? {};
  if (
    String(metadata.orderId ?? "") !== String(expected.orderId) ||
    String(metadata.userId ?? "") !== String(expected.userId) ||
    String(metadata.appId ?? "") !== expected.appId
  ) {
    throw new Error("Payment metadata mismatch");
  }
}

export async function initializePaystackTransaction(input: {
  secretKey: string;
  email: string;
  amountKobo: number;
  reference: string;
  orderId: number;
  userId: number;
  appId: string;
}): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      metadata: { orderId: input.orderId, userId: input.userId, appId: input.appId },
    }),
  });
  const body = (await response.json().catch(() => null)) as PaystackEnvelope<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> | null;
  if (!response.ok || !body?.status || !body.data) throw new Error("Payment initialization failed");
  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
}

export async function verifyPaystackTransaction(
  reference: string,
  secretKey: string,
): Promise<PaystackTransaction> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const body = (await response.json().catch(() => null)) as PaystackEnvelope<PaystackTransaction> | null;
  if (!response.ok || !body?.status || !body.data) throw new Error("Payment verification failed");
  return body.data;
}
