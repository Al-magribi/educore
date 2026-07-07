"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { AdminSelect } from "@/components/admin/home/AdminSelect.js";
import {
  fileAcceptPresetOptions,
  getFileAcceptForPreset,
  resolveFileAcceptPreset,
} from "@/lib/file-accept.js";
import {
  FIELD_TYPES,
  OPTION_TYPES,
  createField,
  createGroup,
  finalizeId,
  findDuplicateFieldIds,
  findFieldLocation,
  isFieldIdTaken,
  normalizeFormGroups,
  sanitizeIdInput,
} from "./form-constants.js";
import { FormPreviewModal } from "./FormPreviewModal.jsx";

const fieldTypeOptions = FIELD_TYPES.map((type) => ({
  value: type.value,
  label: type.label,
}));

function AddFieldSelect({ groupTitle, onAdd }) {
  const [pickerValue, setPickerValue] = useState("");

  return (
    <AdminSelect
      value={pickerValue}
      placeholder="Tambah field..."
      options={fieldTypeOptions}
      onChange={(type) => {
        onAdd(type);
        setPickerValue("");
      }}
      size="sm"
      className="w-full sm:w-52"
      aria-label={`Tambah field ke ${groupTitle}`}
    />
  );
}

export function FormBuilderEditor({ form, onCancel, onSaved }) {
  const initialGroups = normalizeFormGroups(form.schema?.groups ?? []);
  const initialMeta = {
    name: form.schema?.meta?.name || form.name || "",
    description: form.schema?.meta?.description ?? "",
  };

  const [meta, setMeta] = useState(initialMeta);
  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroups[0]?.id ?? null);
  const [selectedFieldId, setSelectedFieldId] = useState(initialGroups[0]?.fields[0]?.id ?? null);
  const [selectionMode, setSelectionMode] = useState(initialGroups[0]?.fields[0]?.id ? "field" : "group");
  const [message, setMessage] = useState(null);
  const [fieldIdError, setFieldIdError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const totalFields = useMemo(
    () => groups.reduce((sum, group) => sum + group.fields.length, 0),
    [groups]
  );

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    return findFieldLocation(groups, selectedFieldId)?.field ?? null;
  }, [groups, selectedFieldId]);

  const selectedFieldGroupId = useMemo(() => {
    if (!selectedFieldId) return null;
    return findFieldLocation(groups, selectedFieldId)?.group.id ?? null;
  }, [groups, selectedFieldId]);

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.id,
        label: group.title?.trim() || group.id,
      })),
    [groups]
  );

  const updateGroup = useCallback((groupId, patch) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
  }, []);

  const updateField = useCallback((fieldId, patch) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        fields: group.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      }))
    );
  }, []);

  const selectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedFieldId(null);
    setSelectionMode("group");
    setFieldIdError(null);
  };

  const selectField = (groupId, fieldId) => {
    setSelectedGroupId(groupId);
    setSelectedFieldId(fieldId);
    setSelectionMode("field");
    setFieldIdError(null);
  };

  const addGroup = () => {
    const group = createGroup("");
    setGroups((prev) => [...prev, { ...group, title: "" }]);
    selectGroup(group.id);
  };

  const removeGroup = (groupId) => {
    if (groups.length <= 1) return;

    const next = groups.filter((g) => g.id !== groupId);
    setGroups(next);

    if (selectedGroupId === groupId) {
      const fallback = next[0];
      setSelectedGroupId(fallback?.id ?? null);
      setSelectedFieldId(fallback?.fields[0]?.id ?? null);
      setSelectionMode(fallback?.fields[0]?.id ? "field" : "group");
    } else if (selectedFieldId) {
      const stillExists = findFieldLocation(next, selectedFieldId);
      if (!stillExists) {
        setSelectedFieldId(next[0]?.fields[0]?.id ?? null);
        setSelectionMode(next[0]?.fields[0]?.id ? "field" : "group");
      }
    }
  };

  const moveGroup = (groupId, direction) => {
    setGroups((prev) => {
      const index = prev.findIndex((g) => g.id === groupId);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addField = (groupId, type) => {
    const field = createField(type);
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, fields: [...g.fields, field] } : g))
    );
    selectField(groupId, field.id);
  };

  const removeField = (groupId, fieldId) => {
    const next = groups.map((g) =>
      g.id === groupId ? { ...g, fields: g.fields.filter((f) => f.id !== fieldId) } : g
    );
    setGroups(next);

    if (selectedFieldId === fieldId) {
      const group = next.find((g) => g.id === groupId);
      const remaining = group?.fields ?? [];
      if (remaining.length) {
        selectField(groupId, remaining[0].id);
      } else {
        selectGroup(groupId);
      }
    }
  };

  const moveField = (groupId, fieldId, direction) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const index = g.fields.findIndex((f) => f.id === fieldId);
        if (index < 0) return g;
        const target = index + direction;
        if (target < 0 || target >= g.fields.length) return g;
        const fields = [...g.fields];
        [fields[index], fields[target]] = [fields[target], fields[index]];
        return { ...g, fields };
      })
    );
  };

  const moveFieldToGroup = (fieldId, targetGroupId) => {
    setGroups((prev) => {
      const location = findFieldLocation(prev, fieldId);
      if (!location || location.group.id === targetGroupId) return prev;

      const field = location.field;
      return prev.map((group) => {
        if (group.id === location.group.id) {
          return { ...group, fields: group.fields.filter((f) => f.id !== fieldId) };
        }
        if (group.id === targetGroupId) {
          return { ...group, fields: [...group.fields, field] };
        }
        return group;
      });
    });
    setSelectedGroupId(targetGroupId);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const duplicateFieldIds = findDuplicateFieldIds(groups);
    if (duplicateFieldIds.length) {
      const duplicateList = duplicateFieldIds.join(", ");
      setMessage({
        type: "error",
        text: `ID field duplikat: ${duplicateList}. Setiap field wajib memiliki ID unik.`,
      });
      window.alert(
        `ID field duplikat: ${duplicateList}.\n\nSetiap field wajib memiliki ID yang unik. Perbaiki sebelum menyimpan.`
      );
      setSaving(false);
      return;
    }

    try {
      const sanitizedGroups = groups.map((group) => {
        const groupId = finalizeId(group.id);
        return {
          ...group,
          id: groupId,
          fields: group.fields.map((field) => {
            const next = field.options
              ? {
                  ...field,
                  options: field.options.map((option) => option.trim()).filter(Boolean),
                }
              : field;
            return { ...next, id: finalizeId(field.id) };
          }),
        };
      });

      const payload = {
        name: meta.name,
        meta,
        groups: sanitizedGroups,
      };

      const url = form.id ? `/api/spmb-admin/forms/${form.id}` : "/api/spmb-admin/forms";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan formulir");

      onSaved?.(data.form);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="mb-3 text-sm font-medium text-[var(--admin-primary)] hover:underline"
          >
            ← Kembali ke daftar
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {form.id ? "Edit Formulir" : "Formulir Baru"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Susun field dalam grup — data calon siswa, orang tua, alamat, berkas, dan sebagainya.
          </p>
          {form.id ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {form.isActive ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Aktif
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  Tidak aktif
                </span>
              )}
              {form.version ? (
                <span className="text-xs text-slate-500">Versi {form.version}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama formulir">
                  <TextInput
                    value={meta.name}
                    onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Deskripsi">
                  <TextInput
                    value={meta.description}
                    onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Grup & field</h2>
                  <p className="text-sm text-slate-500">
                    {groups.length} grup · {totalFields} field
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addGroup}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Grup baru
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {groups.map((group, groupIndex) => (
                  <section key={group.id} className="px-5 py-4">
                    <div
                      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${
                        selectionMode === "group" && selectedGroupId === group.id
                          ? "border-[var(--admin-primary)] bg-[var(--admin-primary-soft)]/30"
                          : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-3">
                        <label className="block">
                          <span className="text-xs font-medium text-slate-500">Nama grup</span>
                          <TextInput
                            value={group.title}
                            onChange={(e) => updateGroup(group.id, { title: e.target.value })}
                            onFocus={() => selectGroup(group.id)}
                            placeholder="Mis. Data Calon Siswa, Data Orang Tua, Berkas"
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-medium text-slate-500">
                            Deskripsi grup <span className="font-normal text-slate-400">(opsional)</span>
                          </span>
                          <TextInput
                            value={group.description ?? ""}
                            onChange={(e) => updateGroup(group.id, { description: e.target.value })}
                            onFocus={() => selectGroup(group.id)}
                            placeholder="Subjudul yang tampil di formulir"
                          />
                        </label>
                        <p className="text-xs text-slate-400">
                          {group.fields.length} field · ID: {group.id}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveGroup(group.id, -1)}
                          disabled={groupIndex === 0}
                          className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-white disabled:opacity-40"
                          aria-label="Naikkan grup"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGroup(group.id, 1)}
                          disabled={groupIndex === groups.length - 1}
                          className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-white disabled:opacity-40"
                          aria-label="Turunkan grup"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(group.id)}
                          disabled={groups.length <= 1}
                          className="rounded-lg px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        >
                          Hapus grup
                        </button>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1">
                      {group.fields.map((field, fieldIndex) => (
                        <li
                          key={field.id}
                          className={`flex flex-col gap-3 rounded-xl px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                            selectedFieldId === field.id
                              ? "bg-[var(--admin-primary-soft)]/40 ring-1 ring-[var(--admin-primary)]/20"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectField(group.id, field.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="font-medium text-slate-900">
                              {field.label}
                              {field.required ? (
                                <span className="ml-1 text-rose-500" aria-label="wajib">
                                  *
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {field.id} ·{" "}
                              {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                            </p>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveField(group.id, field.id, -1)}
                              disabled={fieldIndex === 0}
                              className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              aria-label="Naikkan field"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveField(group.id, field.id, 1)}
                              disabled={fieldIndex === group.fields.length - 1}
                              className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              aria-label="Turunkan field"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeField(group.id, field.id)}
                              className="rounded-lg px-2 py-1 text-sm text-rose-600 hover:bg-rose-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {FIELD_TYPES.slice(0, 3).map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => addField(group.id, t.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          + {t.label}
                        </button>
                      ))}
                      <AddFieldSelect
                        groupTitle={group.title}
                        onAdd={(type) => addField(group.id, type)}
                      />
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <aside className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-7rem)] xl:self-start">
            <div className="flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">
                  {selectionMode === "group" ? "Properti grup" : "Properti field"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectionMode === "group"
                    ? selectedGroup?.title ?? "Pilih grup"
                    : selectedField?.label ?? "Pilih field"}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {selectionMode === "group" && selectedGroup ? (
                  <div className="space-y-4">
                    <Field label="Nama grup" hint="Tampil sebagai judul section di formulir calon siswa.">
                      <TextInput
                        value={selectedGroup.title}
                        onChange={(e) => updateGroup(selectedGroup.id, { title: e.target.value })}
                        placeholder="Mis. Data Calon Siswa"
                        required
                      />
                    </Field>
                    <Field label="Deskripsi grup" hint="Tampil sebagai subjudul di formulir.">
                      <textarea
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-(--admin-primary) focus:ring-2 focus:ring-(--admin-ring)"
                        rows={3}
                        value={selectedGroup.description ?? ""}
                        onChange={(e) =>
                          updateGroup(selectedGroup.id, { description: e.target.value })
                        }
                        placeholder="Opsional — penjelasan singkat grup"
                      />
                    </Field>
                    <Field label="ID grup" hint="Unik, huruf kecil dan underscore.">
                      <TextInput
                        value={selectedGroup.id}
                        onChange={(e) => {
                          const id = sanitizeIdInput(e.target.value);
                          if (!id) return;
                          updateGroup(selectedGroup.id, { id });
                          if (selectedGroupId === selectedGroup.id) {
                            setSelectedGroupId(id);
                          }
                        }}
                      />
                    </Field>
                  </div>
                ) : null}

                {selectionMode === "field" && selectedField ? (
                  <div className="space-y-4">
                    <Field label="Grup">
                      <AdminSelect
                        value={selectedFieldGroupId ?? ""}
                        options={groupOptions}
                        onChange={(groupId) => moveFieldToGroup(selectedField.id, groupId)}
                      />
                    </Field>
                    <Field label="Label">
                      <TextInput
                        value={selectedField.label}
                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                      />
                    </Field>
                    <Field label="ID field" hint="Unik, huruf kecil dan underscore.">
                      <TextInput
                        value={selectedField.id}
                        aria-invalid={Boolean(fieldIdError)}
                        onChange={(e) => {
                          const id = sanitizeIdInput(e.target.value);
                          if (!id) return;
                          const oldId = selectedField.id;
                          if (id !== oldId && isFieldIdTaken(groups, id, oldId)) {
                            const normalizedId = finalizeId(id) || id;
                            const alertText = `ID field "${normalizedId}" sudah digunakan oleh field lain. Pilih ID yang unik.`;
                            setFieldIdError(alertText);
                            window.alert(alertText);
                            return;
                          }
                          setFieldIdError(null);
                          updateField(oldId, { id });
                          if (selectedFieldId === oldId) {
                            setSelectedFieldId(id);
                          }
                        }}
                      />
                      {fieldIdError ? (
                        <p className="mt-1.5 text-xs text-rose-600" role="alert">
                          {fieldIdError}
                        </p>
                      ) : null}
                    </Field>
                    <Field label="Tipe">
                      <AdminSelect
                        value={selectedField.type}
                        options={fieldTypeOptions}
                        onChange={(type) => {
                          updateField(selectedField.id, {
                            type,
                            options: OPTION_TYPES.has(type)
                              ? selectedField.options ?? ["Opsi 1"]
                              : undefined,
                            accept:
                              type === "file"
                                ? getFileAcceptForPreset("image")
                                : undefined,
                          });
                        }}
                      />
                    </Field>
                    {!OPTION_TYPES.has(selectedField.type) &&
                    selectedField.type !== "checkbox" &&
                    selectedField.type !== "file" ? (
                      <Field label="Placeholder">
                        <TextInput
                          value={selectedField.placeholder ?? ""}
                          onChange={(e) =>
                            updateField(selectedField.id, { placeholder: e.target.value })
                          }
                        />
                      </Field>
                    ) : null}
                    {selectedField.type === "file" ? (
                      <Field label="Tipe file">
                        <AdminSelect
                          value={resolveFileAcceptPreset(selectedField.accept)}
                          options={fileAcceptPresetOptions}
                          onChange={(preset) =>
                            updateField(selectedField.id, {
                              accept: getFileAcceptForPreset(preset),
                            })
                          }
                        />
                      </Field>
                    ) : null}
                    {OPTION_TYPES.has(selectedField.type) ? (
                      <Field label="Opsi (satu per baris)">
                        <textarea
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-(--admin-primary) focus:ring-2 focus:ring-(--admin-ring)"
                          rows={4}
                          value={(selectedField.options ?? []).join("\n")}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              options: e.target.value.split("\n"),
                            })
                          }
                        />
                      </Field>
                    ) : null}
                    {selectedField.type !== "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedField.required)}
                          onChange={(e) =>
                            updateField(selectedField.id, { required: e.target.checked })
                          }
                          className="rounded border-slate-300"
                        />
                        Wajib diisi
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {!selectedGroup && !selectedField ? (
                  <p className="text-sm text-slate-500">
                    Pilih grup atau field untuk mengedit properti.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>

        <FormMessage message={message} />
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Pratinjau formulir
          </button>
          <SaveButton saving={saving}>Simpan formulir</SaveButton>
        </div>
      </form>

      <FormPreviewModal
        open={showPreview}
        meta={meta}
        groups={groups}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
