"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const TYPE_LABELS = {
  kepribadian: "Kepribadian",
  gaya_belajar: "Gaya Belajar",
  survey: "Survey",
  custom: "Kuesioner",
};

function isAnswered(question, value) {
  if (value == null) return false;
  if (question.type === "jawaban_panjang") {
    return typeof value === "string" && value.trim() !== "";
  }
  return typeof value === "string" && value.trim() !== "";
}

function LockedPaymentCard({ paymentState }) {
  if (paymentState?.isReview) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xl text-white">
            ⏳
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-blue-950">Menunggu verifikasi pembayaran</h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-900/80">
              Kuesioner akan terbuka setelah pembayaran formulir dikonfirmasi admin.
            </p>
            <Link
              href="/spmb/pembayaran"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-medium text-blue-900 transition hover:bg-blue-100"
            >
              Lihat status pembayaran
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xl text-white">
          🔒
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-amber-950">Kuesioner terkunci</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
            Selesaikan pembayaran biaya formulir terlebih dahulu sebelum mengisi kuesioner.
          </p>
          <Link
            href="/spmb/pembayaran"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Ke halaman pembayaran
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ period, progress, access }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-primary via-secondary to-accent p-6 text-primary-foreground shadow-sm md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">Kuesioner SPMB</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Kepribadian & Gaya Belajar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            {period
              ? `Gelombang ${period.name} · ${period.academicYear}`
              : "Jawab kuesioner untuk membantu sekolah memahami profil Anda."}
          </p>
        </div>
        {access.canFill && progress.total > 0 ? (
          <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Progress</p>
            <p className="mt-1 text-2xl font-bold">{progress.percent}%</p>
            <div className="mt-2 h-1.5 w-full min-w-[140px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/75">
              {progress.completed} dari {progress.total} kuesioner selesai
            </p>
          </div>
        ) : null}
      </div>
      {period?.closesAt ? (
        <p className="mt-5 text-sm text-white/80">Batas pendaftaran: {period.closesAt}</p>
      ) : null}
    </section>
  );
}

function SubmittedBanner({ response }) {
  if (!response?.isComplete) return null;
  return (
    <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:mx-6 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          ✓
        </div>
        <div>
          <p className="font-semibold text-emerald-950">Jawaban telah dikirim</p>
          <p className="mt-1 text-sm text-emerald-900/80">
            {response.answeredCount}/{response.totalQuestions} soal terjawab
            {response.submittedAt ? ` · ${response.submittedAt}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuestionnaireCard({
  questionnaire,
  selections,
  onAnswer,
  disabled,
  saving,
  onSave,
  onSubmit,
  canSubmit,
}) {
  const { schema, response } = questionnaire;
  const typeLabel = TYPE_LABELS[schema.type] ?? TYPE_LABELS.custom;
  const answeredCount = schema.questions.filter((q) => isAnswered(q, selections[q.id])).length;
  const isComplete = response.isComplete;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {typeLabel}
            </span>
            <h2 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">{questionnaire.title}</h2>
            {schema.description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{schema.description}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-slate-500">Progress soal</p>
            <p className="text-lg font-bold text-slate-900">
              {answeredCount}/{schema.questions.length}
            </p>
          </div>
        </div>
      </div>

      <SubmittedBanner response={response} />

      <div className="space-y-6 p-5 sm:p-6">
        {schema.questions.map((question, index) => (
          <fieldset key={question.id} className="scroll-mt-24" id={`q-${question.id}`}>
            <legend className="mb-3 block w-full text-sm font-semibold text-slate-900 sm:text-base">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {index + 1}
              </span>
              {question.text}
            </legend>

            {question.type === "jawaban_panjang" ? (
              <div className="pl-0 sm:pl-8">
                <textarea
                  value={selections[question.id] ?? ""}
                  onChange={(e) => onAnswer(questionnaire.id, question.id, e.target.value)}
                  placeholder={question.placeholder || "Tuliskan jawaban Anda..."}
                  disabled={disabled}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            ) : (
              <div className="space-y-2.5 pl-0 sm:pl-8">
                {(question.options ?? []).map((option) => {
                  const selected = selections[question.id] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        selected
                          ? "border-primary bg-primary/5 text-slate-900 ring-1 ring-primary/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={selected}
                        onChange={() => onAnswer(questionnaire.id, question.id, option.id)}
                        disabled={disabled}
                        className="h-4 w-4 shrink-0 border-slate-300 text-primary focus:ring-primary/30"
                      />
                      <span className="leading-relaxed">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}
      </div>

      {!disabled ? (
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => onSave(questionnaire.id)}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan sementara"}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(questionnaire.id)}
            disabled={saving || !canSubmit(questionnaire.id)}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : isComplete ? "Perbarui jawaban" : "Kirim jawaban"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function KuesionerPageView({ initialData }) {
  const [data, setData] = useState(initialData);
  const [selectionsMap, setSelectionsMap] = useState(() => buildSelectionsMap(initialData));
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [savingId, setSavingId] = useState(null);

  function buildSelectionsMap(pageData) {
    const map = {};
    for (const q of pageData?.questionnaires ?? []) {
      map[q.id] = { ...(q.response?.selections ?? {}) };
    }
    return map;
  }

  const refresh = useCallback(async () => {
    const res = await fetch("/api/spmb/kuesioner", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      setSelectionsMap(buildSelectionsMap(json));
    }
    return json;
  }, []);

  useEffect(() => {
    if (!initialData) {
      refresh().finally(() => setLoading(false));
    }
  }, [initialData, refresh]);

  const access = data?.access ?? { canFill: false, isEditable: false };
  const progress = data?.progress ?? { total: 0, completed: 0, percent: 0 };
  const isReadOnly = !access.isEditable;

  const handleAnswer = useCallback((questionnaireId, questionId, value) => {
    setSelectionsMap((prev) => ({
      ...prev,
      [questionnaireId]: { ...prev[questionnaireId], [questionId]: value },
    }));
    setError(null);
  }, []);

  const canSubmitQuestionnaire = useCallback(
    (questionnaireId) => {
      const questionnaire = data?.questionnaires?.find((q) => q.id === questionnaireId);
      if (!questionnaire) return false;
      const selections = selectionsMap[questionnaireId] ?? {};
      return questionnaire.schema.questions.every((q) => isAnswered(q, selections[q.id]));
    },
    [data?.questionnaires, selectionsMap]
  );

  const persist = async (questionnaireId, submit) => {
    setNotice(null);
    setError(null);
    setSavingId(questionnaireId);

    try {
      const res = await fetch("/api/spmb/kuesioner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionnaireId,
          selections: selectionsMap[questionnaireId] ?? {},
          submit,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Gagal menyimpan kuesioner");
        return;
      }

      setData(json);
      setSelectionsMap(buildSelectionsMap(json));
      setNotice({
        type: "success",
        text: submit
          ? "Jawaban kuesioner berhasil dikirim."
          : "Jawaban tersimpan sementara.",
      });
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">Memuat kuesioner...</p>
        </div>
      </div>
    );
  }

  if (!data?.activePeriod) {
    return (
      <div className="space-y-6">
        <PageHeader period={null} progress={progress} access={access} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-amber-950">Periode pendaftaran belum dibuka</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
            Saat ini tidak ada gelombang pendaftaran aktif.
          </p>
          <Link
            href="/user"
            className="mt-5 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Kembali ke dashboard
          </Link>
        </div>
      </div>
    );
  }

  const questionnaires = data.questionnaires ?? [];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader period={data.activePeriod} progress={progress} access={access} />

      {!access.canFill ? <LockedPaymentCard paymentState={data.paymentState} /> : null}

      {notice ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {questionnaires.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
            📋
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Belum ada kuesioner aktif</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin belum mempublikasikan kuesioner untuk periode ini. Anda dapat melanjutkan langkah
            pendaftaran lainnya.
          </p>
          <Link
            href="/user"
            className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Kembali ke dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {questionnaires.map((questionnaire) => (
            <QuestionnaireCard
              key={questionnaire.id}
              questionnaire={questionnaire}
              selections={selectionsMap[questionnaire.id] ?? {}}
              onAnswer={handleAnswer}
              disabled={isReadOnly || !access.canFill}
              saving={savingId === questionnaire.id}
              onSave={(id) => persist(id, false)}
              onSubmit={(id) => persist(id, true)}
              canSubmit={canSubmitQuestionnaire}
            />
          ))}
        </div>
      )}

      {access.canFill && isReadOnly ? (
        <p className="text-center text-sm text-slate-500">
          Kuesioner dalam mode baca saja karena pendaftaran sudah difinalisasi.
        </p>
      ) : null}
    </div>
  );
}
