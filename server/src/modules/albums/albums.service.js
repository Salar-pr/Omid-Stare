'use strict';
/**
 * albums.service — لیست published با tracks (بدون N+1: یک query برای tracks همگانی)
 */
const { db } = require('../../db/client');
const { albums, albumTracks } = require('../../db/schema');
const { and, eq, inArray, desc, asc, sql, isNull, or } = require('drizzle-orm');
const { parsePagination, toPagination } = require('../../utils/pagination');
const { NotFoundError } = require('../../utils/errors');

function toApi(a, tracks, trackCount) {
  return {
    id: a.id,
    title: a.title,
    titleFa: a.titleFa,
    year: a.year,
    genre: a.genre,
    coverImage: a.coverImage,
    description: a.description,
    sortOrder: a.sortOrder,
    isPublished: a.isPublished,
    trackCount: trackCount || tracks.length,
    tracks: tracks.map((t) => ({
      id: t.id,
      trackNumber: t.trackNumber,
      title: t.title,
      duration: t.duration,
      audioUrl: t.audioUrl,
    })),
  };
}

async function list(query) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 24, maxLimit: 60 });
  const includeUnpublished = query.includeUnpublished === '1';

  const where = includeUnpublished ? undefined : eq(albums.isPublished, true);
  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(albums)
      .where(where)
      .orderBy(asc(albums.sortOrder), asc(albums.year))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql`count(*)` })
      .from(albums)
      .where(where),
  ]);

  const ids = rows.map((r) => r.id);
  let tracksByAlbum = new Map();
  let countsByAlbum = new Map();
  if (ids.length) {
    const tracks = await db
      .select()
      .from(albumTracks)
      .where(and(inArray(albumTracks.albumId, ids), eq(albumTracks.isPublished, true)))
      .orderBy(asc(albumTracks.trackNumber));
    for (const t of tracks) {
      if (!tracksByAlbum.has(t.albumId)) tracksByAlbum.set(t.albumId, []);
      tracksByAlbum.get(t.albumId).push(t);
    }
    const counts = await db
      .select({ albumId: albumTracks.albumId, n: sql`count(*)` })
      .from(albumTracks)
      .where(and(inArray(albumTracks.albumId, ids), eq(albumTracks.isPublished, true)))
      .groupBy(albumTracks.albumId);
    countsByAlbum = new Map(counts.map((c) => [c.albumId, Number(c.n)]));
  }

  return {
    items: rows.map((r) => toApi(r, tracksByAlbum.get(r.id) || [], countsByAlbum.get(r.id) || 0)),
    pagination: toPagination(page, limit, Number(countRows[0].n)),
  };
}

async function byId(id, { admin = false } = {}) {
  const rows = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
  const a = rows[0];
  if (!a) throw new NotFoundError('آلبوم پیدا نشد.');
  if (!a.isPublished && !admin) throw new NotFoundError('آلبوم پیدا نشد.');

  const tracks = await db
    .select()
    .from(albumTracks)
    .where(and(eq(albumTracks.albumId, id), admin ? undefined : eq(albumTracks.isPublished, true)))
    .orderBy(asc(albumTracks.trackNumber));

  return toApi(a, tracks);
}

module.exports = { list, byId, toApi };
