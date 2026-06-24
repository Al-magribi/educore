"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextArea,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { AdminSelect } from "./AdminSelect.jsx";
import { QuestionnaireExcelImport } from "./QuestionnaireExcelImport.jsx";
import {
  createQuestion,
  KUESIONER_TYPE_OPTIONS,
  QUESTION_TYPES,
  QUESTION_TYPE_OPTIONS,
  QUESTIONNAIRE_TEMPLATES,
} from "./questionnaire-templates.js";

function createEmptyDraft() {
  const template = QUESTIONNAIRE_TEMPLATES[0];
  return {
    title: template.title,
    schema: structuredClone(template.schema),
  };
}

function schemaToDraft(questionnaire) {
  if (!questionnaire) return createEmptyDraft();
  return {
    title: questionnaire.title,
    schema: {
      type: questionnaire.schema?.type ?? "custom",
      description: questionnaire.schema?.description ?? "",
      questions: questionnaire.schema?.questions ?? [],
    },
  };
}

function QuestionTypeBadge({ type }) {
  const isLong = type === QUESTION_TYPES.JAWABAN_PANJANG;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isLong ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
      }`}
    >
      {isLong ? "Esai" : "Pilihan"}
    </span>
  );
}

function BuilderTab({ questionnaire, onSaved, onActivate }) {
  const [draft, setDraft] = useState(() => schemaToDraft(questionnaire));
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    questionnaire?.schema?.questions?.[0]?.id ?? draft.schema.questions[0]?.id ?? null
  );
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!questionnaire?.id);

  useEffect(() => {
    const next = schemaToDraft(questionnaire);
    setDraft(next);
    setSelectedQuestionId(next.schema.questions[0]?.id ?? null);
    setShowTemplates(!questionnaire?.id);
  }, [questionnaire?.id]);

  const schema = draft.schema;

  const selectedQuestion = useMemo(
    () => schema.questions.find((q) => q.id === selectedQuestionId) ?? null,
    [schema.questions, selectedQuestionId]
  );

  const updateSchema = (patch) => {
    setDraft((prev) => ({ ...prev, schema: { ...prev.schema, ...patch } }));
  };

  const updateQuestion = (id, patch) => {
    updateSchema({
      questions: schema.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  };

  const changeQuestionType = (questionId, nextType) => {
    const current = schema.questions.find((q) => q.id === questionId);
    if (!current || current.type === nextType) return;

    if (nextType === QUESTION_TYPES.JAWABAN_PANJANG) {
      updateQuestion(questionId, {
        type: QUESTION_TYPES.JAWABAN_PANJANG,
        options: [],
        placeholder: current.placeholder || "Tuliskan jawaban Anda...",
      });
      return;
    }

    updateQuestion(questionId, {
      type: QUESTION_TYPES.PILIHAN,
      placeholder: "",
      options:
        current.options?.length > 0
          ? current.options
          : [
              { id: `${questionId}_a`, label: "Opsi A" },
              { id: `${questionId}_b`, label: "Opsi B" },
            ],
    });
  };

  const updateOption = (questionId, optionId, patch) => {
    updateSchema({
      questions: schema.questions.map((q) =>
        q.id !== questionId
          ? q
          : {
              ...q,
              options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
            }
      ),
    });
  };

  const addQuestion = (type = QUESTION_TYPES.PILIHAN) => {
    const question = createQuestion(type);
    updateSchema({ questions: [...schema.questions, question] });
    setSelectedQuestionId(question.id);
  };

  const removeQuestion = (id) => {
    const questions = schema.questions.filter((q) => q.id !== id);
    if (selectedQuestionId === id) setSelectedQuestionId(questions[0]?.id ?? null);
    updateSchema({ questions });
  };

  const addOption = (questionId) => {
    updateSchema({
      questions: schema.questions.map((q) =>
        q.id !== questionId
          ? q
          : {
              ...q,
              options: [
                ...q.options,
                { id: `${questionId}_${Date.now().toString(36)}`, label: "Opsi baru" },
              ],
            }
      ),
    });
  };

  const removeOption = (questionId, optionId) => {
    updateSchema({
      questions: schema.questions.map((q) =>
        q.id !== questionId
          ? q
          : { ...q, options: q.options.filter((o) => o.id !== optionId) },
      ),
    });
  };

  const applyTemplate = (templateId) => {
    const template = QUESTIONNAIRE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setDraft({
      title: template.title,
      schema: structuredClone(template.schema),
    });
    setSelectedQuestionId(template.schema.questions[0]?.id ?? null);
    setShowTemplates(false);
    setMessage({ type: "success", text: `Template "${template.label}" diterapkan` });
  };

  const handleExcelImport = (imported) => {
    setDraft({
      title: imported.title,
      schema: structuredClone(imported.schema),
    });
    setSelectedQuestionId(imported.schema.questions[0]?.id ?? null);
    setShowTemplates(false);
    setMessage({
      type: "success",
      text: `Impor Excel berhasil — ${imported.schema.questions.length} soal dimuat. Klik Simpan kuesioner untuk menyimpan ke server.`,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = { title: draft.title, schema: draft.schema };
      const url = questionnaire?.id
        ? `/api/spmb-admin/questionnaires/${questionnaire.id}`
        : "/api/spmb-admin/questionnaires";
      const method = questionnaire?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Gagal menyimpan kuesioner" });
        return;
      }

      setMessage({ type: "success", text: json.message || "Kuesioner berhasil disimpan" });
      onSaved(json.questionnaire);
      setShowTemplates(false);
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan" });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!questionnaire?.id) return;
    setActivating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/questionnaires/${questionnaire.id}/activate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Gagal mengaktifkan" });
        return;
      }
      setMessage({ type: "success", text: "Kuesioner aktif dan tampil ke calon siswa" });
      onActivate(json.questionnaire);
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan" });
    } finally {
      setActivating(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <QuestionnaireExcelImport draft={draft} onImport={handleExcelImport} />

      {showTemplates ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Pilih template</h2>
              <p className="text-sm text-slate-500">Mulai cepat dengan template siap pakai</p>
            </div>
            {questionnaire?.id ? (
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Tutup
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUESTIONNAIRE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[var(--admin-primary)] hover:shadow-md"
              >
                <p className="font-semibold text-slate-900">{template.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{template.description}</p>
                <p className="mt-2 text-xs font-medium text-[var(--admin-primary)]">
                  {template.schema.questions.length} soal
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
          >
            Ganti template
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Judul kuesioner">
              <TextInput
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Kategori">
              <AdminSelect
                value={schema.type}
                onChange={(value) => updateSchema({ type: value })}
                options={KUESIONER_TYPE_OPTIONS}
                placeholder="Pilih kategori"
              />
            </Field>
            <Field label="Deskripsi" className="sm:col-span-2 lg:col-span-1">
              <TextInput
                value={schema.description}
                onChange={(e) => updateSchema({ description: e.target.value })}
                placeholder="Penjelasan singkat untuk calon siswa"
              />
            </Field>
          </div>
          {questionnaire?.id ? (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  questionnaire.isActive
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 ring-slate-200"
                }`}
              >
                {questionnaire.isActive ? "Aktif" : "Nonaktif"}
              </span>
              {!questionnaire.isActive ? (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activating}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {activating ? "..." : "Aktifkan"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Daftar soal</h2>
              <p className="text-sm text-slate-500">{schema.questions.length} item</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addQuestion(QUESTION_TYPES.PILIHAN)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                + Pilihan
              </button>
              <button
                type="button"
                onClick={() => addQuestion(QUESTION_TYPES.JAWABAN_PANJANG)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: "var(--admin-primary)" }}
              >
                + Esai
              </button>
            </div>
          </div>
          <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
            {schema.questions.map((question, index) => (
              <li
                key={question.id}
                className={`px-4 py-3 ${selectedQuestionId === question.id ? "bg-[var(--admin-primary-soft)]/50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionId(question.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                      <QuestionTypeBadge type={question.type} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">{question.text}</p>
                    {question.type === QUESTION_TYPES.PILIHAN ? (
                      <p className="mt-0.5 text-xs text-slate-500">{question.options.length} opsi</p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    className="shrink-0 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                    aria-label="Hapus soal"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {selectedQuestion ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Edit soal</h2>
            <div className="mt-4 space-y-5">
              <Field label="Jenis soal">
                <AdminSelect
                  value={selectedQuestion.type}
                  onChange={(value) => changeQuestionType(selectedQuestion.id, value)}
                  options={QUESTION_TYPE_OPTIONS}
                  placeholder="Pilih jenis soal"
                />
              </Field>

              <Field label="Teks pertanyaan">
                <TextArea
                  value={selectedQuestion.text}
                  onChange={(e) => updateQuestion(selectedQuestion.id, { text: e.target.value })}
                  rows={3}
                />
              </Field>

              {selectedQuestion.type === QUESTION_TYPES.JAWABAN_PANJANG ? (
                <Field label="Placeholder (petunjuk isian)" hint="Teks bantuan di dalam kotak jawaban">
                  <TextInput
                    value={selectedQuestion.placeholder ?? ""}
                    onChange={(e) =>
                      updateQuestion(selectedQuestion.id, { placeholder: e.target.value })
                    }
                    placeholder="Contoh: Tuliskan jawaban Anda secara lengkap..."
                  />
                </Field>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Opsi jawaban</p>
                    <button
                      type="button"
                      onClick={() => addOption(selectedQuestion.id)}
                      className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
                    >
                      + Tambah opsi
                    </button>
                  </div>
                  {selectedQuestion.options.map((option, optIndex) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <TextInput
                        value={option.label}
                        onChange={(e) =>
                          updateOption(selectedQuestion.id, option.id, { label: e.target.value })
                        }
                        placeholder="Teks opsi"
                        className="flex-1"
                      />
                      {selectedQuestion.options.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => removeOption(selectedQuestion.id, option.id)}
                          className="shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                          aria-label="Hapus opsi"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
            Pilih soal dari daftar atau tambah soal baru
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {schema.questions.length} soal ·{" "}
          {schema.questions.filter((q) => q.type === QUESTION_TYPES.PILIHAN).length} pilihan ·{" "}
          {schema.questions.filter((q) => q.type === QUESTION_TYPES.JAWABAN_PANJANG).length} esai
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FormMessage message={message} />
          <SaveButton saving={saving}>Simpan kuesioner</SaveButton>
        </div>
      </div>
    </form>
  );
}

function ResultsTab({ questionnaires }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterId, setFilterId] = useState("");
  const [selected, setSelected] = useState(null);

  const filterOptions = useMemo(
    () => [
      { value: "", label: "Semua kuesioner" },
      ...questionnaires.map((q) => ({ value: q.id, label: q.title })),
    ],
    [questionnaires]
  );

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterId ? `?questionnaireId=${filterId}` : "";
      const res = await fetch(`/api/spmb-admin/questionnaire-responses${qs}`);
      const json = await res.json();
      if (res.ok) setResponses(json.responses ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterId]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Hasil Kuesioner</h2>
          <p className="text-sm text-slate-500">{responses.length} jawaban tercatat</p>
        </div>
        <div className="w-full sm:w-72">
          <AdminSelect
            value={filterId}
            onChange={setFilterId}
            options={filterOptions}
            placeholder="Filter kuesioner"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
          Memuat hasil...
        </div>
      ) : responses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Belum ada jawaban kuesioner dari calon siswa.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Pendaftar</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Kuesioner</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-600 md:table-cell">
                    Kelengkapan
                  </th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-600 lg:table-cell">
                    Waktu
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {responses.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.applicantName}</p>
                      <p className="text-xs text-slate-500">{row.applicantEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.questionnaireTitle}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          row.isComplete
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                            : "bg-amber-50 text-amber-800 ring-amber-200"
                        }`}
                      >
                        {row.answeredCount}/{row.totalQuestions} soal
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{row.submittedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-[var(--admin-primary-soft)]"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setSelected(null)}
            aria-label="Tutup"
          />
          <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Detail jawaban</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xl font-semibold text-slate-900">{selected.applicantName}</p>
              <p className="text-sm text-slate-600">{selected.applicantEmail}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{selected.questionnaireTitle}</p>
              <p className="mt-1 text-xs text-slate-500">Dikirim: {selected.submittedAt}</p>

              <div className="mt-6 space-y-4">
                {(selected.answerDetails ?? []).map((item, index) => (
                  <div key={item.questionId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                      <QuestionTypeBadge type={item.questionType} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{item.questionText}</p>
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      {item.answerLabel || (
                        <span className="italic text-slate-400">Belum dijawab</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default function KuesionerAdmin({ initialQuestionnaires = [] }) {
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires);
  const [selectedId, setSelectedId] = useState(initialQuestionnaires[0]?.id ?? "new");
  const [tab, setTab] = useState("builder");
  const [deleting, setDeleting] = useState(false);

  const selected = useMemo(
    () => (selectedId === "new" ? null : questionnaires.find((q) => q.id === selectedId) ?? null),
    [questionnaires, selectedId]
  );

  const handleSaved = (questionnaire) => {
    setQuestionnaires((prev) => {
      const exists = prev.some((q) => q.id === questionnaire.id);
      if (exists) return prev.map((q) => (q.id === questionnaire.id ? questionnaire : q));
      return [questionnaire, ...prev];
    });
    setSelectedId(questionnaire.id);
  };

  const handleActivate = (questionnaire) => {
    setQuestionnaires((prev) =>
      prev.map((q) => ({ ...q, isActive: q.id === questionnaire.id }))
    );
  };

  const handleDelete = async () => {
    if (!selected?.id || !confirm("Hapus kuesioner ini? Jawaban terkait juga akan terhapus.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/spmb-admin/questionnaires/${selected.id}`, { method: "DELETE" });
      if (res.ok) {
        setQuestionnaires((prev) => prev.filter((q) => q.id !== selected.id));
        setSelectedId("new");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kuesioner</h1>
        <p className="mt-1 text-sm text-slate-600">
          Buat soal pilihan ganda atau jawaban panjang, gunakan template, dan lihat hasil calon siswa.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:inline-flex">
        {[
          { id: "builder", label: "Editor" },
          { id: "results", label: "Hasil Jawaban" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        <ResultsTab questionnaires={questionnaires} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Daftar</p>
              <button
                type="button"
                onClick={() => setSelectedId("new")}
                className="text-xs font-semibold text-[var(--admin-primary)] hover:underline"
              >
                + Baru
              </button>
            </div>
            <ul className="mt-3 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedId("new")}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    selectedId === "new"
                      ? "bg-[var(--admin-primary-soft)] font-medium text-[var(--admin-primary)]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Kuesioner baru
                </button>
              </li>
              {questionnaires.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(q.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedId === q.id
                        ? "bg-[var(--admin-primary-soft)] font-medium text-[var(--admin-primary)]"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="line-clamp-2">{q.title}</span>
                    {q.isActive ? (
                      <span className="mt-0.5 block text-xs text-emerald-600">Aktif</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            {selected?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="mt-4 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus kuesioner"}
              </button>
            ) : null}
          </aside>

          <BuilderTab
            key={selectedId}
            questionnaire={selected}
            onSaved={handleSaved}
            onActivate={handleActivate}
          />
        </div>
      )}
    </div>
  );
}
