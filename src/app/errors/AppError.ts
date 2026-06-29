// class AppError extends Error {
//   public statusCode: number;

//   constructor(statusCode: number, message: string, stack = '') {
//     super(message);
//     this.statusCode = statusCode;

//     if (stack) {
//       this.stack = stack;
//     } else {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

// export default AppError;

import { TMessageKey } from './messages';

class AppError extends Error {
  public statusCode: number;
  public errorKey: TMessageKey;
  public variables?: Record<string, string | number | boolean>;

  constructor(
    statusCode: number,
    errorKey: TMessageKey,
    variables?: Record<string, string | number | boolean>,
    stack = '',
  ) {
    super(errorKey);

    this.statusCode = statusCode;
    this.errorKey = errorKey;
    this.variables = variables;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
