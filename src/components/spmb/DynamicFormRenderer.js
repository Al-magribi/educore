/**
 * Render form fields dari JSON schema (form_definitions).
 * @param {{ fields: Array<{ id: string, type: string, label: string, required?: boolean }> }} formDefinition
 */
export function DynamicFormRenderer({ formDefinition }) {
  const fields = formDefinition?.fields ?? [];

  if (fields.length === 0) {
    return <p className="text-zinc-500">Formulir belum dikonfigurasi.</p>;
  }

  return (
    <form className="space-y-4">
      {fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </label>
          {/* TODO: render per field.type */}
          <input
            type="text"
            name={field.id}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            disabled
          />
        </div>
      ))}
    </form>
  );
}
