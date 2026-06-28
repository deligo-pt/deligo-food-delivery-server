class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string, stack = '') {
    super(message);
    this.statusCode = statusCode;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;

// class AppError extends Error {
//   public statusCode: number;
//   public errorKey: TMessageKey;
//   public variables?: Record<string, any>;

//   constructor(
//     statusCode: number,
//     errorKey: TMessageKey,
//     variables?: Record<string, any>,
//     stack = '',
//   ) {
//     super(errorKey);

//     this.statusCode = statusCode;
//     this.errorKey = errorKey;
//     this.variables = variables;

//     if (stack) {
//       this.stack = stack;
//     } else {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

// export default AppError;
