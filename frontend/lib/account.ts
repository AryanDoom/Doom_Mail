export interface SendingAccount {
  /** the From address, null until an account is connected */
  address: string | null;
  /** optional display name shown before the address */
  name: string | null;
  /** whether the backend has an account it can actually send with */
  connected: boolean;
}

export const SENDING_ACCOUNT: SendingAccount = {
  address: null,
  name: null,
  connected: false,
};

export function sendingAccountLabel(account: SendingAccount = SENDING_ACCOUNT): string {
  if (!account.connected || !account.address) return "Not connected";
  return account.name ? `${account.name} <${account.address}>` : account.address;
}