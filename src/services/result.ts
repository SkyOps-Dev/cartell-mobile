// Port of frontend/lib/services/enums/result.dart (spec 03 §3).

export enum ResultStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  OFFLINE = 'OFFLINE',
  NOT_SIGNED_IN = 'NOT_SIGNED_IN',
}

export class Result {
  constructor(readonly status: ResultStatus, readonly messages: string[]) {}

  static success(): Result {
    return new Result(ResultStatus.SUCCESS, []);
  }

  /** If both are given, `messages` wins. */
  static failure({
    message,
    messages,
  }: { message?: string; messages?: string[] } = {}): Result {
    if (messages !== undefined) {
      return new Result(ResultStatus.FAILURE, messages);
    }
    return new Result(
      ResultStatus.FAILURE,
      message !== undefined ? [message] : [],
    );
  }

  static offline(): Result {
    return new Result(ResultStatus.OFFLINE, ['Could not reach the server.']);
  }

  static notSignedIn(): Result {
    return new Result(ResultStatus.NOT_SIGNED_IN, ['You are not signed in.']);
  }

  get succeeded(): boolean {
    return this.status === ResultStatus.SUCCESS;
  }

  get failed(): boolean {
    return !this.succeeded;
  }
}
