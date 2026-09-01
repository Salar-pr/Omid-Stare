'use strict';
/**
 * respond — response format یکدست کل API:
 *   ok:  { success:true,  data:{...}, message:"..." }
 *   err: { success:false, error:{ code, message, details? } }
 */

function ok(reply, data, message, status = 200) {
  return reply.code(status).send({
    success: true,
    data: data === undefined ? null : data,
    message: message || '',
  });
}

function created(reply, data, message) {
  return ok(reply, data, message, 201);
}

/**
 * تبدیل هر throw شده (ApiError / ZodError / ناشناخته) به response خطا.
 * هیچ وقت stack یا جزئیات داخلی به کلاینت نده.
 */
function fail(reply, err, log) {
  if (err && err.name === 'ZodError') {
    const details = (err.issues || [])
      .slice(0, 8)
      .map((i) => ({ field: (i.path || []).join('.'), message: i.message }));
    return reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'ورودی فرم ایراد داره — یک‌بار دیگه چکش کن.',
        details,
      },
    });
  }

  if (err && err.name === 'ApiError') {
    const body = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    if (err.details) body.error.details = err.details;
    return reply.code(err.status).send(body);
  }

  // rate limit (429) — @fastify/rate-limit error
  if (err && (err.statusCode === 429 || err.code === 'FST_RATE_LIMIT')) {
    const body =
      err && err.success === false && err.error
        ? { success: false, error: err.error }
        : { success: false, error: { code: 'RATE_LIMITED', message: 'درخواستات خیلی شلوغه — چند دقیقه بعد امتحان کن.' } };
    return reply.code(429).send(body);
  }

  // payload بد فرمتی / unknown
  if (err && (err.validation === true || /JSON/i.test(err.message || ''))) {
    return reply.code(400).send({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'درخواست معتبر نیست.' },
    });
  }

  // اشتباهات شناخته‌شده PostgreSQL → mapped به status مناسب
  if (err && err.code === '22P02') {
    // invalid input syntax (مثلاً uuid بد) — fault سمت client است
    return reply.code(400).send({
      success: false,
      error: { code: 'INVALID_ID', message: 'شناسه معتبر نیست.' },
    });
  }
  if (err && err.code === '23505') {
    return reply.code(409).send({
      success: false,
      error: { code: 'DUPLICATE', message: 'این مقدار تکراری است.' },
    });
  }

  // خطاهای 4xx شناخته‌شده (مثلاً از pluginها) — به 500 تبدیل نمی‌شوند
  if (err && typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
    return reply.code(err.statusCode).send({
      success: false,
      error: { code: 'ERROR', message: err.message || 'درخواست معتبر نیست.' },
    });
  }

  if (log) log.error({ err }, 'unhandled error');
  return reply.code(500).send({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'خطای سرور — بعداً دوباره امتحان کن.' },
  });
}

function page(pagination, items, message) {
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } };
}

module.exports = { ok, created, fail, page };
