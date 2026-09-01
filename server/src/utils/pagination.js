'use strict';
/**
 * parsePagination — ?page=1&limit=20 (limit سقف 100)
 * { offset, limit, page, clamped } برمی‌گرداند.
 */
function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  let limit = parseInt(query.limit || String(defaultLimit), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, offset: (page - 1) * limit };
}

function toPagination(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

module.exports = { parsePagination, toPagination };
