'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NEWS_CATEGORIES } from '@/modules/cms/news/index.js';
import { isBodyHtmlEmpty } from '@/modules/cms/news/mapper.js';
import { hasImageUrl } from '@/lib/images.js';
import { Field, FormMessage, SaveButton, TextArea, TextInput } from '@/components/admin/home/AdminFormFields.js';
import { ImageUploadField } from '@/components/admin/home/ImageUploadField.js';
import { useConfirmDelete } from '@/components/admin/home/ConfirmDeleteModal.js';
import { NewsRichTextEditor } from '@/components/admin/news/NewsRichTextEditor.jsx';

const PAGE_SIZE = 10;

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  bodyHtml: '',
  category: 'Informasi',
  coverImage: '',
  coverAlt: '',
  featured: false,
  readMinutes: '',
  status: 'draft',
};

function formatListDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function StatusBadge({ status }) {
  const published = status === 'published';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        published ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
      }`}>
      {published ? 'Terbit' : 'Draft'}
    </span>
  );
}

function NewsCoverThumb({ post, className = 'h-12 w-16' }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 ${className}`}>
      {hasImageUrl(post.coverImage) ? (
        <Image src={post.coverImage} alt={post.coverAlt || post.title} fill className="object-cover" sizes="80px" />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function NewsPagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalItems === 0) return null;

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Menampilkan{' '}
        <span className="font-semibold text-slate-900">
          {start}–{end}
        </span>{' '}
        dari <span className="font-semibold text-slate-900">{totalItems}</span> berita
      </p>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginasi berita">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const active = page === pageNumber;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => onPageChange(pageNumber)}
                  aria-label={`Ke halaman ${pageNumber}`}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold transition ${
                    active ? 'text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  style={active ? { background: 'var(--admin-primary)' } : undefined}>
                  {pageNumber}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Halaman berikutnya"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function NewsFormModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-form-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Tutup"
      />
      <div className="relative flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="news-form-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup form">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

export default function NewsAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const isEditing = Boolean(editingId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/news');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat berita');
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === 'published' && post.status !== 'published') return false;
      if (filter === 'draft' && post.status !== 'draft') return false;
      if (filter === 'featured' && !post.featured) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.slug.toLowerCase().includes(q)
      );
    });
  }, [posts, filter, search]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, page]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = (post) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      bodyHtml: post.bodyHtml ?? '',
      category: post.category,
      coverImage: post.coverImage ?? '',
      coverAlt: post.coverAlt ?? '',
      featured: post.featured,
      readMinutes: post.readMinutes ? String(post.readMinutes) : '',
      status: post.status,
    });
    setMessage(null);
    setShowForm(true);
  };

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }, []);

  const setField = (key) => (e) => {
    const target = e.target;
    let value = target.type === 'checkbox' ? target.checked : target.value;
    if (target.type === 'number') value = target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (isBodyHtmlEmpty(form.bodyHtml)) {
      setMessage({ type: 'error', text: 'Isi berita wajib diisi' });
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      bodyHtml: form.bodyHtml,
      category: form.category,
      coverImage: form.coverImage,
      coverAlt: form.coverAlt,
      featured: form.featured,
      status: form.status,
      ...(form.readMinutes ? { readMinutes: Number(form.readMinutes) } : {}),
    };

    try {
      const url = isEditing ? `/api/admin/news/${editingId}` : '/api/admin/news';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      setMessage({ type: 'success', text: data.message || 'Berhasil disimpan' });
      await load();
      if (!isEditing && data.post) {
        setEditingId(data.post.id);
        setForm({
          title: data.post.title,
          slug: data.post.slug,
          excerpt: data.post.excerpt,
          bodyHtml: data.post.bodyHtml ?? '',
          category: data.post.category,
          coverImage: data.post.coverImage ?? '',
          coverAlt: data.post.coverAlt ?? '',
          featured: data.post.featured,
          readMinutes: data.post.readMinutes ? String(data.post.readMinutes) : '',
          status: data.post.status,
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post) => {
    const target = post ?? (editingId ? { id: editingId, title: form.title } : null);
    if (!target?.id) return;

    const ok = await confirmDelete({
      title: 'Hapus berita',
      description: `Berita "${target.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
    });
    if (!ok) return;

    setDeletingId(target.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/news/${target.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      if (editingId === target.id) closeForm();
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Berita</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola artikel yang tampil di beranda dan halaman{' '}
            <span className="font-medium text-slate-800">/berita</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
          style={{
            background: 'var(--admin-primary)',
            boxShadow: '0 4px 14px color-mix(in srgb, var(--admin-primary) 35%, transparent)',
          }}>
          + Berita Baru
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul, kategori, atau slug..."
          className="w-full flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
        />
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'published', label: 'Terbit' },
            { id: 'draft', label: 'Draft' },
            { id: 'featured', label: 'Unggulan' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === item.id ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={filter === item.id ? { background: 'var(--admin-primary)' } : undefined}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Memuat daftar berita...</p>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 text-sm font-medium text-[var(--admin-primary)] hover:underline">
              Coba lagi
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {posts.length === 0
              ? 'Belum ada berita. Klik «Berita Baru» untuk memulai.'
              : 'Tidak ada berita yang cocok dengan filter.'}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Sampul</th>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Diperbarui</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPosts.map((post) => (
                    <tr key={post.id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <NewsCoverThumb post={post} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 line-clamp-2">{post.title}</p>
                        {post.featured ? (
                          <span className="mt-1 inline-block text-xs font-semibold text-amber-700">Unggulan</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{post.category}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatListDate(post.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(post)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post)}
                            disabled={deletingId === post.id}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                            {deletingId === post.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedPosts.map((post) => (
                <div key={post.id} className="px-4 py-4">
                  <div className="flex gap-3">
                    <NewsCoverThumb post={post} className="h-16 w-24" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-slate-900">{post.title}</p>
                        <StatusBadge status={post.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {post.category}
                        {post.featured ? ' · Unggulan' : ''} · {formatListDate(post.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={deletingId === post.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                      {deletingId === post.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <NewsPagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredPosts.length}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <NewsFormModal open={showForm} title={isEditing ? 'Edit Berita' : 'Berita Baru'} onClose={closeForm}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormMessage message={message} />

          <Field label="Judul">
            <TextInput value={form.title} onChange={setField('title')} required placeholder="Judul berita" />
          </Field>

          <Field
            label="Slug URL"
            hint="Kosongkan untuk dibuat otomatis dari judul. Hanya huruf kecil, angka, dan strip.">
            <TextInput value={form.slug} onChange={setField('slug')} placeholder="contoh-pembukaan-spmb" />
          </Field>

          <Field label="Ringkasan">
            <TextArea
              value={form.excerpt}
              onChange={setField('excerpt')}
              required
              rows={3}
              placeholder="Tampil di kartu berita dan meta deskripsi"
            />
          </Field>

          <Field label="Isi berita" hint="Gunakan toolbar untuk format teks seperti di Word.">
            <NewsRichTextEditor
              editorKey={editingId ?? 'new'}
              value={form.bodyHtml}
              onChange={(html) => setForm((f) => ({ ...f, bodyHtml: html }))}
              placeholder="Tulis paragraf pembuka, tambahkan subjudul, daftar, dan tautan..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori">
              <select
                value={form.category}
                onChange={setField('category')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]">
                {NEWS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={setField('status')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]">
                <option value="draft">Draft</option>
                <option value="published">Terbit</option>
              </select>
            </Field>
          </div>

          <Field label="Estimasi baca (menit)" hint="Kosongkan untuk hitung otomatis dari isi.">
            <TextInput
              type="number"
              min={1}
              max={60}
              value={form.readMinutes}
              onChange={setField('readMinutes')}
              placeholder="Otomatis"
            />
          </Field>

          <ImageUploadField
            label="Gambar sampul"
            value={form.coverImage}
            onChange={(url) => setForm((f) => ({ ...f, coverImage: url }))}
            alt={form.coverAlt}
            onAltChange={(alt) => setForm((f) => ({ ...f, coverAlt: alt }))}
            category="cms"
            optional
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={setField('featured')}
              className="h-4 w-4 rounded border-slate-300 text-[var(--admin-primary)] focus:ring-[var(--admin-ring)]"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Berita unggulan</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Hanya satu unggulan aktif; tampil menonjol di /berita dan beranda.
              </span>
            </span>
          </label>

          {isEditing && form.status === 'published' && form.slug ? (
            <a
              href={`/berita/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--admin-primary)] hover:underline">
              Lihat di situs
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ) : null}

          <div className="sticky bottom-0 -mx-5 flex justify-end flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Batal
            </button>

            <SaveButton saving={saving}>{isEditing ? 'Simpan Perubahan' : 'Buat Berita'}</SaveButton>
            {isEditing ? (
              <button
                type="button"
                onClick={() => handleDelete()}
                disabled={Boolean(deletingId) || saving}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                {deletingId === editingId ? 'Menghapus...' : 'Hapus'}
              </button>
            ) : null}
          </div>
        </form>
      </NewsFormModal>
      <ConfirmDeleteDialog />
    </div>
  );
}
