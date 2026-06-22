import { useMemo, useState } from "react";
import { Table, Tag, Space, Select, DatePicker, Button, Skeleton, Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useAuditEvents, type AuditFilter } from "../../api/queries";
import { AuditEventDrawer, type AuditRowExt } from "./AuditEventDrawer";
import { AuditCostChart } from "./AuditCostChart";

const KNOWN_TYPES = [
  "ai.generate",
  "report.run",
  "export.csv",
  "AiRequest",
  "ReportExecution",
  "Export",
  "FailedQuery",
  "UserActivity",
  "ProviderChange",
] as const;

/** Minimal RFC-4180 CSV helper — avoids importing QueryResult-based toCsv. */
function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(
  headers: string[],
  rows: Record<string, string | number | null | undefined>[],
): string {
  const head = headers.map(escapeCell).join(",");
  const body = rows
    .map((r) => headers.map((h) => escapeCell(r[h])).join(","))
    .join("\r\n");
  return rows.length ? `${head}\r\n${body}` : head;
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLog() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<AuditFilter>({});
  const { data: events, isLoading } = useAuditEvents(filter);
  const [selected, setSelected] = useState<AuditRowExt | null>(null);

  const list = (events ?? []) as AuditRowExt[];

  const exportCsv = () => {
    const headers = ["id", "ts", "actorId", "type", "tokens", "cost"];
    const rows = list.map((e) => ({
      id: e.id,
      ts: e.ts,
      actorId: e.actorId,
      type: e.type,
      tokens: e.tokens ?? null,
      cost: e.cost ?? null,
    }));
    downloadCsv(`audit-${Date.now()}.csv`, rowsToCsv(headers, rows));
  };

  const columns = useMemo(
    () => [
      {
        title: t("admin.audit.time"),
        dataIndex: "ts",
        render: (ts: string) => new Date(ts).toLocaleString(),
      },
      {
        title: t("admin.audit.actor"),
        dataIndex: "actorId",
        render: (_: unknown, e: AuditRowExt) => e.actorName ?? e.actorId,
      },
      {
        title: t("admin.audit.eventType"),
        dataIndex: "type",
        render: (ty: string) => (
          <Tag>{t(`admin.audit.type.${ty}`, { defaultValue: ty })}</Tag>
        ),
      },
      {
        title: t("admin.audit.tokens"),
        dataIndex: "tokens",
        render: (v?: number) => v ?? "—",
      },
      {
        title: t("admin.audit.cost"),
        dataIndex: "cost",
        render: (v?: number) => (v != null ? `$${v.toFixed(4)}` : "—"),
      },
    ],
    [t],
  );

  return (
    <div>
      <h2>{t("admin.audit.title")}</h2>
      <div style={{ marginBottom: 16 }}>
        <AuditCostChart />
      </div>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          onChange={(_d, [from, to]) =>
            setFilter((f) => ({ ...f, from: from || undefined, to: to || undefined }))
          }
        />
        <Select
          allowClear
          placeholder={t("admin.audit.eventType")}
          style={{ width: 200 }}
          options={KNOWN_TYPES.map((ty) => ({
            value: ty,
            label: t(`admin.audit.type.${ty}`, { defaultValue: ty }),
          }))}
          onChange={(ty: string | undefined) => setFilter((f) => ({ ...f, type: ty }))}
        />
        <Button onClick={exportCsv} disabled={list.length === 0}>
          {t("admin.audit.exportCsv")}
        </Button>
      </Space>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : list.length === 0 ? (
        <Empty description={t("admin.audit.empty")} />
      ) : (
        <Table
          rowKey="id"
          dataSource={list}
          columns={columns}
          onRow={(e) => ({
            onClick: () => setSelected(e),
            style: { cursor: "pointer" },
          })}
        />
      )}
      <AuditEventDrawer event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
