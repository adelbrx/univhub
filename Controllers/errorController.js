const AppError = require("../utils/appError");

const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsErrorDB = (error) => {
  const message = `Duplicate field value : ${JSON.stringify(
    error.keyValue
  )}, Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((element) => element.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const sendErrorDev = (error, response) => {
  response.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    error: error,
    stack: error.stack,
  });
};

const sendErrorProd = (error, response) => {
  // Operational, trusted error: send message to client
  if (error.isOperational) {
    response.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    // 1) Log error
    console.log("ERROR 💥", error);
    // 2) Send generic message
    response.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (error, request, response, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";
  if (process.env.NODE_ENV === "dev") {
    sendErrorDev(error, response);
  } else if (process.env.NODE_ENV === "prod") {
    let errorHardCopy = { ...error };
    errorHardCopy.message = error.message;

    if (errorHardCopy.name === "CastError") {
      errorHardCopy = handleCastErrorDB(errorHardCopy);
    }

    if (errorHardCopy.code === 11000) {
      errorHardCopy = handleDuplicateFieldsErrorDB(errorHardCopy);
    }

    if (errorHardCopy.name === "ValidationError") {
      errorHardCopy = handleValidationErrorDB(errorHardCopy);
    }

    sendErrorProd(errorHardCopy, response);
  }
};
