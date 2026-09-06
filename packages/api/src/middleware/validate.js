import { ZodError } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
          }
        });
      }
      next(err);
    }
  };
}
