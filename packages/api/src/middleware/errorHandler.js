export function errorHandler(err, req, res, next) {
  console.error('[API Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected internal error occurred'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  });
}
