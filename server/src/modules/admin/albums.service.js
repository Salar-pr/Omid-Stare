'use strict';
/**
 * admin/albums.service — CRUD آلبوم + tracks
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../utils/errors');
const { z } = require('zod');

const albumSchema = z.object({
  title: z.string().trim().min(2, 'عنوان آلبوم رو بنویس').max(160),
  titleFa: z.string().trim().max(160).optional().default(''),
  year: z.coerce.number().int().min(1300, 'سال شمسی معتبر نیست').max(1500),
  genre: z.string().trim().max(80).optional().default(''),
  coverImage: z.string().trim().max(400).optional().default(''),
  description: z.string().trim().max(3000).optional().default(''),
  isPublished: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

const trackSchema = z.object({
  trackNumber: z.coerce.number().int().min(1).max(200),
  title: z.string().trim().min(2, 'عنوان ترک رو بنویس').max(160),
  duration: z.coerce.number().int().min(0).max(7200).optional().default(0),
  audioUrl: z.string().trim().max(400).nullable().optional(),
  isPublished: z.boolean().optional().default(true),
});

async function listAll() {
  const { rows } = await pool.query(
    `SELECT a.*, (SELECT count(*)::int FROM album_tracks t WHERE t.album_id = a.id) AS track_count
       FROM albums a ORDER BY a.sort_order, a.year`
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    titleFa: r.title_fa,
    year: r.year,
    genre: r.genre,
    coverImage: r.cover_image,
    description: r.description,
    isPublished: r.is_published,
    sortOrder: r.sort_order,
    trackCount: r.track_count,
    createdAt: r.created_at,
  }));
}

async function create(input) {
  const data = albumSchema.parse(input);
  const { rows } = await pool.query(
    `INSERT INTO albums (title, title_fa, year, genre, cover_image, description, is_published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [data.title, data.titleFa, data.year, data.genre, data.coverImage, data.description, data.isPublished, data.sortOrder]
  );
  return rows[0].id;
}

async function update(id, input) {
  const data = albumSchema.partial().parse(input);
  const colMap = {
    title: 'title', titleFa: 'title_fa', year: 'year', genre: 'genre',
    coverImage: 'cover_image', description: 'description', isPublished: 'is_published', sortOrder: 'sort_order',
  };
  const sets = [];
  const params = [];
  for (const [k, col] of Object.entries(colMap)) {
    if (data[k] !== undefined) {
      params.push(data[k]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) throw new ValidationError('فیلدی برای تغییر نفرستادی.');
  params.push(id);
  const { rowCount } = await pool.query(
    `UPDATE albums SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`,
    params
  );
  if (!rowCount) throw new NotFoundError('آلبوم پیدا نشد.');
  return true;
}

/** حذف = unpublished؛ hard فقط اگر admin خواست */
async function remove(id, hard) {
  if (hard === true) {
    const { rowCount } = await pool.query('DELETE FROM albums WHERE id = $1', [id]);
    if (!rowCount) throw new NotFoundError('آلبوم پیدا نشد.');
    return { deleted: true };
  }
  const { rowCount } = await pool.query(
    'UPDATE albums SET is_published = FALSE, updated_at = now() WHERE id = $1',
    [id]
  );
  if (!rowCount) throw new NotFoundError('آلبوم پیدا نشد.');
  return { deleted: false, unpublished: true };
}

async function move(id, dir) {
  if (!['up', 'down'].includes(dir)) return { moved: false };
  const { rows: tRows } = await pool.query('SELECT sort_order FROM albums WHERE id = $1', [id]);
  if (!tRows.length) throw new NotFoundError('آلبوم پیدا نشد.');
  const targetOrder = tRows[0].sort_order;

  const orderDir = dir === 'up' ? 'DESC' : 'ASC';
  const cmp = dir === 'up' ? '<' : '>';
  const { rows: nRows } = await pool.query(
    `SELECT id, sort_order FROM albums
      WHERE sort_order ${cmp} $1
      ORDER BY sort_order ${orderDir}
      LIMIT 1`,
    [targetOrder]
  );
  if (!nRows.length) return { moved: false };

  const neighbor = nRows[0];
  await pool.query(
    `UPDATE albums SET sort_order = $1 WHERE id = $2`,
    [neighbor.sort_order, id]
  );
  await pool.query(
    `UPDATE albums SET sort_order = $1 WHERE id = $2`,
    [targetOrder, neighbor.id]
  );
  return { moved: true };
}

// ---------- tracks ----------
async function listTracks(albumId) {
  const { rows } = await pool.query(
    `SELECT id, track_number, title, duration, audio_url, is_published
       FROM album_tracks WHERE album_id = $1 ORDER BY track_number`,
    [albumId]
  );
  return rows.map((r) => ({
    id: r.id,
    trackNumber: r.track_number,
    title: r.title,
    duration: r.duration,
    audioUrl: r.audio_url,
    isPublished: r.is_published,
  }));
}

async function addTrack(albumId, input) {
  const data = trackSchema.parse(input);
  const { rows: aRows } = await pool.query('SELECT id FROM albums WHERE id = $1', [albumId]);
  if (!aRows.length) throw new NotFoundError('آلبوم پیدا نشد.');
  const { rowCount } = await pool.query(
    `INSERT INTO album_tracks (album_id, track_number, title, duration, audio_url, is_published)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (album_id, track_number) DO NOTHING
     RETURNING id`,
    [albumId, data.trackNumber, data.title, data.duration, data.audioUrl || null, data.isPublished]
  );
  if (!rowCount) throw new BusinessRuleError(`شماره ترک ${data.trackNumber} تکراری است.`, 'TRACK_EXISTS', 400);
  return rows[0].id;
}

async function updateTrack(trackId, input) {
  const data = trackSchema.partial().parse(input);
  const colMap = {
    trackNumber: 'track_number', title: 'title', duration: 'duration', audioUrl: 'audio_url', isPublished: 'is_published',
  };
  const sets = [];
  const params = [];
  for (const [k, col] of Object.entries(colMap)) {
    if (data[k] !== undefined) {
      params.push(data[k]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) throw new ValidationError('فیلدی برای تغییر نفرستادی.');
  params.push(trackId);
  const { rowCount } = await pool.query(
    `UPDATE album_tracks SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  );
  if (!rowCount) throw new NotFoundError('ترک پیدا نشد.');
  return true;
}

async function removeTrack(trackId) {
  const { rowCount } = await pool.query('DELETE FROM album_tracks WHERE id = $1', [trackId]);
  if (!rowCount) throw new NotFoundError('ترک پیدا نشد.');
  return true;
}

module.exports = {
  listAll, create, update, remove, move,
  listTracks, addTrack, updateTrack, removeTrack,
};
