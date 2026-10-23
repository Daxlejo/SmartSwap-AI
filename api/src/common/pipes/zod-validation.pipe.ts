import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map(
          (err) => `${err.path.join('.') || 'root'}: ${err.message}`,
        );
        throw new BadRequestException({
          message: formatted,
          error: 'Bad Request',
        });
      }
      throw new BadRequestException({
        message: 'Validation failed',
        error: 'Bad Request',
      });
    }
  }
}
