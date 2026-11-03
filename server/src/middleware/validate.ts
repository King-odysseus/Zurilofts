import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/index.js';

/**
 * Validate query string parameters against a Zod schema. Kept separate from
 * validate() because a GET has no body and overwriting req.query wholesale is
 * how a route ends up losing a parameter another middleware relies on.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // The parsed value holds Dates and numbers, which ParsedQs cannot express,
      // so it replaces the raw query through a cast rather than a spread.
      req.query = schema.parse(req.query) as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        next(new ValidationError(messages));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body against a Zod schema.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        next(new ValidationError(messages));
      } else {
        next(error);
      }
    }
  };
}
