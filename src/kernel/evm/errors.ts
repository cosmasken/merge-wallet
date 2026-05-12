export class NetworkError extends Error {
  constructor(message = "Network connection failed. Check your internet connection.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class InsufficientFundsError extends Error {
  required: bigint;
  available: bigint;

  constructor(required: bigint, available: bigint) {
    super(`Insufficient RBTC balance. Required: ${required}, Available: ${available}`);
    this.name = "InsufficientFundsError";
    this.required = required;
    this.available = available;
  }
}

export class TransactionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionFailedError";
  }
}

export function classifyError(e: unknown): Error {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("connection") ||
      msg.includes("timeout") ||
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("enotfound")
    ) {
      return new NetworkError();
    }
    if (
      msg.includes("insufficient funds") ||
      msg.includes("exceeds balance") ||
      msg.includes("insufficient balance")
    ) {
      return new InsufficientFundsError(0n, 0n);
    }
    if (
      msg.includes("nonce") ||
      msg.includes("already known") ||
      msg.includes("replacement")
    ) {
      return new TransactionFailedError("Transaction failed. The nonce may be stale. Try again.");
    }
    if (
      msg.includes("gas") ||
      msg.includes("intrinsic")
    ) {
      return new TransactionFailedError("Gas estimation failed. The transaction may be invalid.");
    }
    return e;
  }
  return new Error(String(e));
}
