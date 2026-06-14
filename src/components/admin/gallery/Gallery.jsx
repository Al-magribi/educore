'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Field,
  FormMessage,
  SaveButton,
  SelectInput,
  TextArea,
  TextInput,
} from '@/components/admin/home/AdminFormFields.js';
import { hasImageUrl } from '@/lib/images.js';

const emptyForm = {
  title: '',
  slug: '',
  description: '',
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

function AlbumFormModal({ open, title, onClose, compact = false, children }) {
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
      aria-labelledby="gallery-form-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Tutup"
      />
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl ${
          compact ? 'max-w-2xl' : 'max-h-[min(94dvh,920px)] max-w-3xl'
        }`}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="gallery-form-title" className="text-lg font-bold text-slate-900">
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
        <div className={compact ? '' : 'flex min-h-0 flex-1 flex-col overflow-hidden'}>{children}</div>
      </div>
    </div>
  );
}

function AlbumImageGrid({ album, onAlbumChange, onMessage }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const images = album?.images ?? [];

  const uploadFiles = async (files) => {
    if (!album?.id || !files?.length) return;

    setUploading(true);
    onMessage(null);

    try {
      const uploaded = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'gallery');

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengunggah');

        uploaded.push({
          imageUrl: data.url,
          imageAlt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        });
      }

      const res = await fetch(`/api/admin/gallery/${album.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: uploaded }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan gambar');

      onAlbumChange(data.album);
      onMessage({ type: 'success', text: `${uploaded.length} gambar ditambahkan` });
    } catch (err) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setCover = async (imageId) => {
    setBusyId(imageId);
    onMessage(null);
    try {
      const res = await fetch(`/api/admin/gallery/${album.id}/cover`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengatur cover');
      onAlbumChange(data.album);
      onMessage({ type: 'success', text: 'Cover album diperbarui' });
    } catch (err) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const moveImage = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const orderedIds = images.map((img) => img.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];

    setBusyId(orderedIds[target]);
    onMessage(null);
    try {
      const res = await fetch(`/api/admin/gallery/${album.id}/images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah urutan');
      onAlbumChange(data.album);
    } catch (err) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm('Hapus gambar ini dari album?')) return;

    setBusyId(imageId);
    onMessage(null);
    try {
      const res = await fetch(`/api/admin/gallery/images/${imageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus gambar');
      onAlbumChange(data.album);
      onMessage({ type: 'success', text: 'Gambar dihapus' });
    } catch (err) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Gambar album</p>
          <p className="text-xs text-slate-500">
            Unggah banyak gambar sekaligus. Gambar dioptimasi otomatis dengan Sharp (WebP).
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
            {uploading ? 'Mengunggah...' : '+ Tambah Gambar'}
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
          <p className="text-sm text-slate-500">Belum ada gambar. Unggah foto untuk album ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => {
            const isCover = album.coverImageId === image.id;
            const isBusy = busyId === image.id;

            return (
              <div
                key={image.id}
                className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm ${
                  isCover ? 'border-amber-300 ring-2 ring-amber-200' : 'border-slate-200'
                }`}>
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image
                    src={image.imageUrl}
                    alt={image.imageAlt || album.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 200px"
                  />
                  {isCover ? (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                      Cover
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-1 border-t border-slate-100 p-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={isBusy || index === 0}
                      onClick={() => moveImage(index, -1)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      title="Pindah ke kiri">
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || index === images.length - 1}
                      onClick={() => moveImage(index, 1)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      title="Pindah ke kanan">
                      →
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {!isCover ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setCover(image.id)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                        Jadi cover
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => deleteImage(image.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Gallery() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [activeAlbum, setActiveAlbum] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const isEditing = Boolean(editingId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gallery');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat galeri');
      setAlbums(data.albums ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    return albums.filter((album) => {
      if (filter === 'published' && album.status !== 'published') return false;
      if (filter === 'draft' && album.status !== 'draft') return false;
      if (!q) return true;
      return album.title.toLowerCase().includes(q) || album.slug.toLowerCase().includes(q);
    });
  }, [albums, filter, search]);

  const openCreate = () => {
    setEditingId(null);
    setActiveAlbum(null);
    setForm(emptyForm);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = async (album) => {
    setEditingId(album.id);
    setForm({
      title: album.title,
      slug: album.slug,
      description: album.description ?? '',
      status: album.status,
    });
    setMessage(null);
    setShowForm(true);

    try {
      const res = await fetch(`/api/admin/gallery/${album.id}`);
      const data = await res.json();
      if (res.ok) setActiveAlbum(data.album);
      else setActiveAlbum(album);
    } catch {
      setActiveAlbum(album);
    }
  };

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setActiveAlbum(null);
    setForm(emptyForm);
    setMessage(null);
  }, []);

  const setField = (key) => (e) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: form.status,
    };

    try {
      const url = isEditing ? `/api/admin/gallery/${editingId}` : '/api/admin/gallery';
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

      const savedAlbum = data.album;
      const hasImages =
        (savedAlbum?.images?.length ?? 0) > 0 ||
        (savedAlbum?.imageCount ?? 0) > 0 ||
        (activeAlbum?.images?.length ?? 0) > 0;

      if (isEditing && hasImages) {
        closeForm();
        return;
      }

      if (!isEditing && savedAlbum) {
        setEditingId(savedAlbum.id);
        setActiveAlbum(savedAlbum);
        setForm({
          title: savedAlbum.title,
          slug: savedAlbum.slug,
          description: savedAlbum.description ?? '',
          status: savedAlbum.status,
        });
      } else if (savedAlbum) {
        setActiveAlbum(savedAlbum);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm('Hapus album beserta semua gambarnya? Tindakan tidak dapat dibatalkan.')) {
      return;
    }

    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/gallery/${editingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      closeForm();
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Galeri</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola album foto yang tampil di halaman <span className="font-medium text-slate-800">/galeri</span>.
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
          + Album Baru
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul atau slug album..."
          className="w-full flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
        />
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'published', label: 'Terbit' },
            { id: 'draft', label: 'Draft' },
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

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Memuat daftar album...
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 text-sm font-medium text-[var(--admin-primary)] hover:underline">
            Coba lagi
          </button>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {albums.length === 0
            ? 'Belum ada album. Klik «Album Baru» untuk memulai.'
            : 'Tidak ada album yang cocok dengan filter.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAlbums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => openEdit(album)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="relative aspect-[16/10] bg-slate-100">
                {hasImageUrl(album.coverImage) ? (
                  <Image
                    src={album.coverImage}
                    alt={album.coverAlt || album.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-sm font-medium text-slate-400">Belum ada gambar</span>
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <StatusBadge status={album.status} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 line-clamp-2">{album.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {album.imageCount} foto · Diperbarui {formatListDate(album.updatedAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AlbumFormModal
        open={showForm}
        title={isEditing ? 'Edit Album' : 'Album Baru'}
        onClose={closeForm}
        compact={!isEditing}>
        <form onSubmit={handleSubmit} className={isEditing ? 'flex min-h-0 flex-1 flex-col' : ''}>
          <div
            className={`space-y-4 px-5 py-5 sm:px-6 ${
              isEditing ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : ''
            }`}>
            <FormMessage message={message} />

            <Field label="Judul album">
              <TextInput
                value={form.title}
                onChange={setField('title')}
                required
                placeholder="Contoh: Upacara Bendera 2025"
              />
            </Field>

            <Field label="Slug URL" hint="Kosongkan untuk dibuat otomatis dari judul.">
              <TextInput value={form.slug} onChange={setField('slug')} placeholder="upacara-bendera-2025" />
            </Field>

            <Field label="Deskripsi">
              <TextArea
                value={form.description}
                onChange={setField('description')}
                rows={isEditing ? 3 : 2}
                placeholder="Ringkasan singkat album (opsional)"
              />
            </Field>

            <Field label="Status">
              <SelectInput value={form.status} onChange={setField('status')}>
                <option value="draft">Draft</option>
                <option value="published">Terbit</option>
              </SelectInput>
            </Field>

            {isEditing && activeAlbum ? (
              <AlbumImageGrid album={activeAlbum} onAlbumChange={setActiveAlbum} onMessage={setMessage} />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Simpan album terlebih dahulu, lalu unggah gambar.
              </p>
            )}

            {isEditing && form.status === 'published' && form.slug ? (
              <a
                href={`/galeri/${form.slug}`}
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
          </div>

          <div className="flex justify-end shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Batal
            </button>

            <SaveButton saving={saving}>{isEditing ? 'Simpan Perubahan' : 'Buat Album'}</SaveButton>
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                {deleting ? 'Menghapus...' : 'Hapus Album'}
              </button>
            ) : null}
          </div>
        </form>
      </AlbumFormModal>
    </div>
  );
}
