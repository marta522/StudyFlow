import axios from "axios";
import {
  BarChart3,
  Download,
  FilePlus2,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";
import { downloadCsv } from "../utils/csv";

interface ReportDetail {
  lesson_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  subject: string;
  tutor: string;
  student: string;
  duration_hours: number;
  hourly_rate: number;
  student_cost: number;
  tutor_salary: number;
}

interface FinancialReport {
  id_financial_reports: number;
  month: number;
  year: number;
  total_student_cost: number | string;
  total_tutor_salary: number | string;
  created_at: string;
  lesson_count?: number;
  details?: ReportDetail[];
}

interface ApiError {
  message?: string | string[];
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się obsłużyć raportu finansowego.";
}

function formatMonth(month: number, year: number): string {
  return new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatCurrency(value: number | string): string {
  return `${Number(value).toFixed(2)} zł`;
}

function downloadReport(report: FinancialReport) {
  if (!report.details) return;
  const columns = [
    "ID lekcji",
    "Data",
    "Od",
    "Do",
    "Przedmiot",
    "Korepetytor",
    "Uczeń",
    "Liczba godzin",
    "Stawka godzinowa",
    "Koszt ucznia",
    "Wynagrodzenie korepetytora",
  ];
  const rows = report.details.map((detail) => [
    detail.lesson_id,
    detail.lesson_date.slice(0, 10),
    detail.start_time,
    detail.end_time,
    detail.subject,
    detail.tutor,
    detail.student,
    detail.duration_hours,
    detail.hourly_rate,
    detail.student_cost,
    detail.tutor_salary,
  ]);
  downloadCsv(
    `raport-finansowy-${report.year}-${String(report.month).padStart(2, "0")}.csv`,
    [columns, ...rows],
  );
}

export function FinancialReports() {
  const [period, setPeriod] = useState(CURRENT_MONTH);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [currentReport, setCurrentReport] = useState<FinancialReport | null>(
    null,
  );
  const [comparisonIds, setComparisonIds] = useState<[string, string]>([
    "",
    "",
  ]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<FinancialReport[]>(
        "/users/reports/financial",
      );
      setReports(data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(reportId: number) {
    setError(null);
    try {
      const { data } = await api.get<FinancialReport>(
        `/users/reports/financial/${reportId}`,
      );
      setCurrentReport(data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .get<FinancialReport[]>("/users/reports/financial")
      .then(({ data }) => {
        if (!cancelled) setReports(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!period) {
      setError("Wybierz miesiąc raportu.");
      return;
    }
    const [year, month] = period.split("-").map(Number);
    setGenerating(true);
    setError(null);
    try {
      const { data } = await api.post<FinancialReport>(
        "/users/reports/financial",
        { month, year },
      );
      setCurrentReport(data);
      await loadReports();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="financial-reports-title">
      <header>
        <h2
          id="financial-reports-title"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <BarChart3 className="size-6 text-brand-yellow" aria-hidden="true" />
          Raporty finansowe
        </h2>
        <p className="mt-1 text-sm text-brand-textMuted">
          Raport obejmuje zakończone lekcje. Wynagrodzenie korepetytora wynosi
          80% kosztu lekcji.
        </p>
      </header>

      <form
        onSubmit={handleGenerate}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
      >
        <label className="space-y-2 text-sm text-brand-textMuted">
          Miesiąc raportu
          <input
            required
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="block rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
        >
          <FilePlus2 className="size-4" aria-hidden="true" />
          {generating ? "Generowanie…" : "Wygeneruj raport"}
        </button>
        <button
          type="button"
          onClick={() => void loadReports()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-4 py-2.5 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Odśwież
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {reports.length >= 2 && (
        <section className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5">
          <h3 className="text-lg font-bold">Porównanie raportów</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <label
                key={index}
                className="space-y-2 text-sm text-brand-textMuted"
              >
                {index === 0 ? "Okres bazowy" : "Porównaj z"}
                <select
                  value={comparisonIds[index]}
                  onChange={(event) =>
                    setComparisonIds((previous) => {
                      const next: [string, string] = [...previous];
                      next[index] = event.target.value;
                      return next;
                    })
                  }
                  className="block w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                >
                  <option value="">Wybierz raport</option>
                  {reports.map((report) => (
                    <option
                      key={report.id_financial_reports}
                      value={report.id_financial_reports}
                    >
                      {formatMonth(report.month, report.year)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {comparisonIds[0] &&
            comparisonIds[1] &&
            comparisonIds[0] !== comparisonIds[1] &&
            (() => {
              const base = reports.find(
                (report) =>
                  report.id_financial_reports === Number(comparisonIds[0]),
              );
              const compared = reports.find(
                (report) =>
                  report.id_financial_reports === Number(comparisonIds[1]),
              );
              if (!base || !compared) return null;
              const metrics = [
                {
                  label: "Koszty uczniów",
                  base: Number(base.total_student_cost),
                  compared: Number(compared.total_student_cost),
                },
                {
                  label: "Wynagrodzenia korepetytorów",
                  base: Number(base.total_tutor_salary),
                  compared: Number(compared.total_tutor_salary),
                },
                {
                  label: "Zakończone lekcje",
                  base:
                    base.lesson_count ??
                    new Set(base.details?.map((detail) => detail.lesson_id))
                      .size,
                  compared:
                    compared.lesson_count ??
                    new Set(compared.details?.map((detail) => detail.lesson_id))
                      .size,
                },
              ];
              return (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="text-brand-textMuted">
                      <tr>
                        <th className="p-3">Wskaźnik</th>
                        <th className="p-3">
                          {formatMonth(base.month, base.year)}
                        </th>
                        <th className="p-3">
                          {formatMonth(compared.month, compared.year)}
                        </th>
                        <th className="p-3">Różnica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric, index) => (
                        <tr
                          key={metric.label}
                          className="border-t border-brand-cardBorder"
                        >
                          <th className="p-3 font-medium">{metric.label}</th>
                          <td className="p-3">
                            {index < 2
                              ? formatCurrency(metric.base)
                              : metric.base}
                          </td>
                          <td className="p-3">
                            {index < 2
                              ? formatCurrency(metric.compared)
                              : metric.compared}
                          </td>
                          <td className="p-3 font-semibold text-brand-yellow">
                            {index < 2
                              ? formatCurrency(metric.compared - metric.base)
                              : metric.compared - metric.base}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
        </section>
      )}

      {currentReport && (
        <article
          id="financial-report-print"
          className="financial-report-print space-y-4 rounded-2xl border border-brand-yellow/40 bg-brand-card p-6"
        >
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #financial-report-print, #financial-report-print * { visibility: visible !important; }
              #financial-report-print {
                position: absolute;
                inset: 0;
                width: 100%;
                color: #111 !important;
                background: #fff !important;
                border: 0 !important;
              }
              #financial-report-print * {
                color: #111 !important;
                background: transparent !important;
                border-color: #bbb !important;
              }
              #financial-report-print button { display: none !important; }
            }
          `}</style>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold capitalize">
                Raport za {formatMonth(currentReport.month, currentReport.year)}
              </h3>
              <p className="mt-1 text-sm text-brand-textMuted">
                Zakończone lekcje: {currentReport.lesson_count ?? 0}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadReport(currentReport)}
              className="financial-report-screen-only inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover print:hidden"
            >
              <Download className="size-4" aria-hidden="true" />
              Pobierz CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="financial-report-screen-only inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-4 py-2.5 text-sm font-semibold text-brand-yellow hover:border-brand-yellow print:hidden"
            >
              <Printer className="size-4" aria-hidden="true" />
              Drukuj / Zapisz PDF
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="rounded-lg border border-brand-cardBorder p-4 text-sm">
              Koszty uczniów:{" "}
              <strong className="text-brand-yellow">
                {Number(currentReport.total_student_cost).toFixed(2)} zł
              </strong>
            </p>
            <p className="rounded-lg border border-brand-cardBorder p-4 text-sm">
              Wynagrodzenia korepetytorów:{" "}
              <strong className="text-brand-yellow">
                {Number(currentReport.total_tutor_salary).toFixed(2)} zł
              </strong>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-cardBorder text-brand-textMuted">
                  <th className="p-2">Data</th>
                  <th className="p-2">Przedmiot</th>
                  <th className="p-2">Korepetytor</th>
                  <th className="p-2">Uczeń</th>
                  <th className="p-2">Czas</th>
                  <th className="p-2">Koszt</th>
                  <th className="p-2">Wynagrodzenie</th>
                </tr>
              </thead>
              <tbody>
                {(currentReport.details ?? []).map((detail, index) => (
                  <tr
                    key={`${detail.lesson_id}-${detail.student}-${index}`}
                    className="border-b border-brand-cardBorder/60"
                  >
                    <td className="p-2">{detail.lesson_date}</td>
                    <td className="p-2">{detail.subject}</td>
                    <td className="p-2">{detail.tutor}</td>
                    <td className="p-2">{detail.student}</td>
                    <td className="p-2">{detail.duration_hours} h</td>
                    <td className="p-2">{formatCurrency(detail.student_cost)}</td>
                    <td className="p-2">{formatCurrency(detail.tutor_salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <section className="space-y-3" aria-labelledby="report-history-title">
        <h3 id="report-history-title" className="text-lg font-bold">
          Wygenerowane raporty
        </h3>
        {loading ? (
          <p role="status" className="text-brand-textMuted">
            Ładowanie raportów…
          </p>
        ) : !error && reports.length === 0 ? (
          <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-brand-textMuted">
            Nie wygenerowano jeszcze raportów.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <article
                key={report.id_financial_reports}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-cardBorder bg-brand-card p-4"
              >
                <div>
                  <h4 className="font-semibold capitalize">
                    {formatMonth(report.month, report.year)}
                  </h4>
                  <p className="mt-1 text-sm text-brand-textMuted">
                    Koszty: {Number(report.total_student_cost).toFixed(2)} zł
                    {" · "}
                    Wynagrodzenia:{" "}
                    {Number(report.total_tutor_salary).toFixed(2)} zł
                  </p>
                </div>
                {currentReport?.id_financial_reports ===
                  report.id_financial_reports && (
                  <button
                    type="button"
                    onClick={() => downloadReport(currentReport)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-yellow transition hover:border-brand-yellow"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    CSV
                  </button>
                )}
                {currentReport?.id_financial_reports !==
                  report.id_financial_reports && (
                  <button
                    type="button"
                    onClick={() => void loadReport(report.id_financial_reports)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-yellow transition hover:border-brand-yellow"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Otwórz / pobierz
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
