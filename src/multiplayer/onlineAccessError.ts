export class OnlineAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnlineAccessError";
  }
}