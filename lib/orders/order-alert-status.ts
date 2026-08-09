export function isNewOrderAlertStatus(status: string, triggerStatus = "payment_confirmed"): boolean {
  return status === triggerStatus;
}
