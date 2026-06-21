"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";

const TEST_TYPES = [
  { value: "kepribadian", label: "Tes kepribadian" },
  { value: "gaya_belajar", label: "Tes gaya belajar" },
  { value: "custom", label: "Tes custom" },
];

const defaultProfiles = [
  { key: "visual", label: "Visual", description: "Belajar optimal lewat gambar dan diagram." },
  { key: "auditory", label: "Auditori", description: "Belajar optimal lewat diskusi dan audio." },
  { key: "kinesthetic", label: "Kinestetik", description: "Belajar optimal lewat praktik langsung." },
];

const seedTest = {
  title: "Tes Gaya Belajar",
  type: "gaya_belajar",
  description: "Identifikasi preferensi belajar calon siswa.",
  profiles: defaultProfiles,
  questions: [
    {
      id: "q1",
      text: "Saat mempelajari materi baru, saya paling suka...",
      options: [
        { id: "q1_a", label: "Melihat diagram atau video", scores: { visual: 2, auditory: 0, kinesthetic: 0 } },
        { id: "q1_b", label: "Mendengarkan penjelasan guru", scores: { visual: 0, auditory: 2, kinesthetic: 0 } },
        { id: "q1_c", label: "Langsung mencoba sendiri", scores: { visual: 0, auditory: 0, kinesthetic: 2 } },
      ],
    },
  ],
};

function createQuestion() {
  const id = `q_${Date.now().toString(36)}`;
  return {
    id,
    text: "Pertanyaan baru",
    options: [
      { id: `${id}_a`, label: "Opsi A", scores: { visual: 1, auditory: 0, kinesthetic: 0 } },
      { id: `${id}_b`, label: "Opsi B", scores: { visual: 0, auditory: 1, kinesthetic: 0 } },
    ],
  };
}

export default function TestBuilderAdmin() {
  const [test, setTest] = useState(seedTest);
  const [selectedQuestionId, setSelectedQuestionId] = useState(seedTest.questions[0]?.id ?? null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("educore-spmb-test-draft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setTest(parsed);
      setSelectedQuestionId(parsed.questions?.[0]?.id ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  const selectedQuestion = useMemo(
    () => test.questions.find((q) => q.id === selectedQuestionId) ?? null,
    [test.questions, selectedQuestionId]
  );

  const profileKeys = test.profiles.map((p) => p.key);

  const updateQuestion = (id, patch) => {
    setTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  };

  const updateOption = (questionId, optionId, patch) => {
    setTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id !== questionId
          ? q
          : {
              ...q,
              options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
            }
      ),
    }));
  };

  const updateOptionScore = (questionId, optionId, profileKey, value) => {
    setTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id !== questionId
          ? q
          : {
              ...q,
              options: q.options.map((o) =>
                o.id !== optionId
                  ? o
                  : {
                      ...o,
                      scores: {
                        ...Object.fromEntries(profileKeys.map((k) => [k, o.scores?.[k] ?? 0])),
                        [profileKey]: Number(value) || 0,
                      },
                    }
              ),
            }
      ),
    }));
  };

  const addQuestion = () => {
    const question = createQuestion();
    setTest((prev) => ({ ...prev, questions: [...prev.questions, question] }));
    setSelectedQuestionId(question.id);
  };

  const removeQuestion = (id) => {
    setTest((prev) => {
      const questions = prev.questions.filter((q) => q.id !== id);
      if (selectedQuestionId === id) setSelectedQuestionId(questions[0]?.id ?? null);
      return { ...prev, questions };
    });
  };

  const addOption = (questionId) => {
    const scores = Object.fromEntries(profileKeys.map((k) => [k, 0]));
    setTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id !== questionId
          ? q
          : {
              ...q,
              options: [
                ...q.options,
                {
                  id: `${questionId}_${Date.now().toString(36)}`,
                  label: "Opsi baru",
                  scores,
                },
              ],
            }
      ),
    }));
  };

  const addProfile = () => {
    const key = `profile_${Date.now().toString(36)}`;
    setTest((prev) => ({
      ...prev,
      profiles: [...prev.profiles, { key, label: "Profil baru", description: "" }],
      questions: prev.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({
          ...o,
          scores: { ...o.scores, [key]: 0 },
        })),
      })),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      localStorage.setItem("educore-spmb-test-draft", JSON.stringify(test));
      setMessage({
        type: "success",
        text: "Draft tes disimpan. Skor dihitung dari total poin per profil hasil.",
      });
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan draft tes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tes & Scoring</h1>
        <p className="mt-1 text-sm text-slate-600">
          Buat tes kepribadian, gaya belajar, atau tes custom dengan bobot skor per jawaban.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Judul tes">
              <TextInput
                value={test.title}
                onChange={(e) => setTest((t) => ({ ...t, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Jenis tes">
              <SelectInput
                value={test.type}
                onChange={(e) => setTest((t) => ({ ...t, type: e.target.value }))}
              >
                {TEST_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Deskripsi">
              <TextInput
                value={test.description}
                onChange={(e) => setTest((t) => ({ ...t, description: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Pertanyaan</h2>
                  <p className="text-sm text-slate-500">{test.questions.length} item</p>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--admin-primary)" }}
                >
                  Tambah pertanyaan
                </button>
              </div>

              <ul className="divide-y divide-slate-100">
                {test.questions.map((question, index) => (
                  <li
                    key={question.id}
                    className={`px-5 py-4 ${selectedQuestionId === question.id ? "bg-[var(--admin-primary-soft)]/40" : ""}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionId(question.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Soal {index + 1}
                        </p>
                        <p className="mt-1 font-medium text-slate-900">{question.text}</p>
                        <p className="mt-1 text-xs text-slate-500">{question.options.length} opsi jawaban</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {selectedQuestion ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Edit pertanyaan</h2>
                <div className="mt-4 space-y-4">
                  <Field label="Teks pertanyaan">
                    <TextArea
                      value={selectedQuestion.text}
                      onChange={(e) => updateQuestion(selectedQuestion.id, { text: e.target.value })}
                      rows={3}
                    />
                  </Field>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">Opsi & bobot skor</p>
                      <button
                        type="button"
                        onClick={() => addOption(selectedQuestion.id)}
                        className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
                      >
                        + Opsi
                      </button>
                    </div>

                    {selectedQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <TextInput
                          value={option.label}
                          onChange={(e) =>
                            updateOption(selectedQuestion.id, option.id, { label: e.target.value })
                          }
                          placeholder="Label opsi"
                        />
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {test.profiles.map((profile) => (
                            <label key={profile.key} className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="min-w-0 truncate">{profile.label}</span>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={option.scores?.[profile.key] ?? 0}
                                onChange={(e) =>
                                  updateOptionScore(
                                    selectedQuestion.id,
                                    option.id,
                                    profile.key,
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-900">Profil hasil</h2>
                <button
                  type="button"
                  onClick={addProfile}
                  className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
                >
                  + Profil
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Skor tertinggi menentukan profil calon siswa.
              </p>
              <div className="mt-4 space-y-3">
                {test.profiles.map((profile) => (
                  <div key={profile.key} className="rounded-xl border border-slate-200 p-3">
                    <TextInput
                      value={profile.label}
                      onChange={(e) =>
                        setTest((prev) => ({
                          ...prev,
                          profiles: prev.profiles.map((p) =>
                            p.key === profile.key ? { ...p, label: e.target.value } : p
                          ),
                        }))
                      }
                      className="mb-2"
                    />
                    <TextInput
                      value={profile.description}
                      onChange={(e) =>
                        setTest((prev) => ({
                          ...prev,
                          profiles: prev.profiles.map((p) =>
                            p.key === profile.key ? { ...p, description: e.target.value } : p
                          ),
                        }))
                      }
                      placeholder="Deskripsi hasil"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Cara scoring</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-600">
                <li>Setiap jawaban memberi poin ke satu atau lebih profil.</li>
                <li>Jumlahkan poin per profil setelah semua soal dijawab.</li>
                <li>Profil dengan poin tertinggi ditampilkan sebagai hasil utama.</li>
              </ol>
            </div>

            <FormMessage message={message} />
            <SaveButton saving={saving}>Simpan tes</SaveButton>
          </div>
        </div>
      </form>
    </div>
  );
}
