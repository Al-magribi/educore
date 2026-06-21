"use client";

import { useEffect, useState } from "react";
import { GelombangStepForm } from "@/components/spmb-admin/pengaturan/GelombangStepForm.jsx";
import { ItemBiayaStep } from "@/components/spmb-admin/pengaturan/ItemBiayaStep.jsx";
import { PeriodStepIndicator } from "@/components/spmb-admin/pengaturan/PeriodStepIndicator.jsx";
import { PersyaratanKeuanganStep } from "@/components/spmb-admin/pengaturan/PersyaratanKeuanganStep.jsx";
import { getRecommendedStep } from "@/components/spmb-admin/pengaturan/period-steps.js";
import { DEFAULT_FINANCIAL_TITLE } from "@/modules/spmb/period-fees.js";

function toDateInputValue(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function buildGelombangForm(period) {
  if (!period) {
    return {
      academicYear: "2026/2027",
      name: "",
      opensAt: "",
      closesAt: "",
      isActive: false,
    };
  }

  return {
    academicYear: period.academicYear,
    name: period.name,
    opensAt: toDateInputValue(period.opensAt),
    closesAt: toDateInputValue(period.closesAt),
    isActive: period.isActive,
  };
}

function buildRequirementsForm(period) {
  const fees = period?.financialFees;
  return {
    title: fees?.title || DEFAULT_FINANCIAL_TITLE,
    note: fees?.note || "",
    items: (fees?.items ?? []).map((item) => ({ ...item })),
  };
}

export function PeriodWizard({
  mode = "create",
  period: initialPeriod = null,
  initialStep,
  onDone,
  onCancel,
  onMessage,
}) {
  const [currentStep, setCurrentStep] = useState(initialStep ?? (initialPeriod ? getRecommendedStep(initialPeriod) : 1));
  const [period, setPeriod] = useState(initialPeriod);
  const [gelombangForm, setGelombangForm] = useState(() => buildGelombangForm(initialPeriod));
  const [requirementsForm, setRequirementsForm] = useState(() => buildRequirementsForm(initialPeriod));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialPeriod) {
      setPeriod(initialPeriod);
      setGelombangForm(buildGelombangForm(initialPeriod));
      setRequirementsForm(buildRequirementsForm(initialPeriod));
      setCurrentStep(initialStep ?? getRecommendedStep(initialPeriod));
    }
  }, [initialPeriod, initialStep]);

  const periodName = period?.name || gelombangForm.name || "Gelombang baru";

  const handleStep1 = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const isCreate = mode === "create" && !period;
      const res = await fetch(isCreate ? "/api/spmb-admin/periods" : `/api/spmb-admin/periods/${period.id}`, {
        method: isCreate ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gelombangForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan gelombang");

      const saved = data.period;
      setPeriod(saved);
      setRequirementsForm(buildRequirementsForm(saved));
      onMessage?.({ type: "success", text: data.message || "Gelombang disimpan" });
      setCurrentStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    if (!period) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/spmb-admin/periods/${period.id}/financial-fees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "requirements",
          financialFees: requirementsForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan persyaratan keuangan");

      const saved = data.period;
      setPeriod(saved);
      setRequirementsForm(buildRequirementsForm(saved));
      onMessage?.({ type: "success", text: data.message });
      setCurrentStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStep3 = async (e) => {
    e.preventDefault();
    if (!period) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/spmb-admin/periods/${period.id}/financial-fees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "items",
          financialFees: requirementsForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan item biaya");

      onMessage?.({ type: "success", text: data.message });
      onDone?.(data.period);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStepClick = (stepId) => {
    if (!period && stepId > 1) return;
    setCurrentStep(stepId);
    setError(null);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
      <PeriodStepIndicator
        currentStep={currentStep}
        period={period}
        onStepClick={handleStepClick}
      />

      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {currentStep === 1 ? (
        <GelombangStepForm
          form={gelombangForm}
          onChange={setGelombangForm}
          onSubmit={handleStep1}
          onCancel={onCancel}
          saving={saving}
          submitLabel={period ? "Simpan & lanjut" : "Buat gelombang & lanjut"}
        />
      ) : null}

      {currentStep === 2 ? (
        <PersyaratanKeuanganStep
          form={requirementsForm}
          onChange={setRequirementsForm}
          onSubmit={handleStep2}
          onBack={() => setCurrentStep(1)}
          saving={saving}
          periodName={periodName}
        />
      ) : null}

      {currentStep === 3 ? (
        <ItemBiayaStep
          form={requirementsForm}
          onChange={setRequirementsForm}
          onSubmit={handleStep3}
          onBack={() => setCurrentStep(2)}
          saving={saving}
          periodName={periodName}
        />
      ) : null}
    </div>
  );
}
