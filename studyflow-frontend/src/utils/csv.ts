type CsvValue = string | number | null | undefined;

export function downloadCsv(
  filename: string,
  rows: readonly (readonly CsvValue[])[],
) {
  const csv = `\uFEFF${rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          const safeText = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
          return `"${safeText.replace(/"/g, '""')}"`;
        })
        .join(";"),
    )
    .join("\r\n")}`;
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
