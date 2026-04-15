import { ApiError, fieldLabel } from "@/lib/api-error";

export function FormErrorAlert({ error }: { error: ApiError | null }) {
  if (!error) return null;

  const showList = error.details.length > 1;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <p className={showList ? "font-semibold leading-snug" : "leading-snug"}>
        {error.message}
      </p>
      {showList ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-red-900/95">
          {error.details.map((d, i) => (
            <li key={`${d.field}-${i}`}>
              <span className="font-medium text-red-950">
                {fieldLabel(d.field)}:
              </span>{" "}
              {d.issue}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
