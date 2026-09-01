'use strict';
/**
 * Erros — هر لایه همین کلاس‌ها را throw می‌کند.
 * Global error handler آن‌ها را به response یکدست spec تبدیل می‌کند.
 */

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends ApiError {
  constructor(message, details) {
    super(400, 'VALIDATION_ERROR', message || 'ورودی معتبر نیست.', details);
  }
}

class AuthError extends ApiError {
  constructor(message) {
    super(401, 'UNAUTHORIZED', message || 'برای این کار باید وارد حساب بشی.');
  }
}

class ForbiddenError extends ApiError {
  constructor(message) {
    super(403, 'FORBIDDEN', message || 'دسترسی نداری.');
  }
}

class NotFoundError extends ApiError {
  constructor(message) {
    super(404, 'NOT_FOUND', message || 'چیزی پیدا نشد.');
  }
}

class ConflictError extends ApiError {
  constructor(message, code) {
    super(409, code || 'CONFLICT', message);
  }
}

/** خطای بیزینس (stock کم، coupon نامعتبر و...) — ۴۰۹ مگر اینکه status خاص داشته باشی */
class BusinessRuleError extends ApiError {
  constructor(message, code, status = 409) {
    super(status, code || 'BUSINESS_RULE', message);
  }
}

class DatabaseError extends ApiError {
  constructor(message, cause) {
    super(500, 'DATABASE_ERROR', message || 'مشکلی با دیتابیس پیش اومد.');
    this.cause = cause;
  }
}

module.exports = {
  ApiError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  DatabaseError,
};
