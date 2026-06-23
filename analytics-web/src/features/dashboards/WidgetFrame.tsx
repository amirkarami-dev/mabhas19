import { Alert, Button, Dropdown } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardWidget } from "@/dashboard/widget";
import { useReport } from "@/api/queries";
import { runQuery } from "@/query/engine";
import { chooseView } from "@/presentation/auto-viz";
import { getDataset, getModelForDataset } from "@/semantic/registry";
import { ReportViewRenderer } from "@/presentation/ReportView";
import { KpiTile, SectionCard } from "@/components/ui";

interface Props {
  widget: DashboardWidget;
  editing: boolean;
  onRemove: () => void;
}

export function WidgetFrame({ widget, editing, onRemove }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useReport(widget.reportId);

  const computed = useMemo(() => {
    if (!data) return undefined;
    try {
      const semantic = getModelForDataset(data.definition.dataset);
      const dataset = getDataset(data.definition.dataset);
      const result = runQuery(data.definition, dataset, semantic);
      const views =
        data.definition.presentation?.views != null &&
        data.definition.presentation.views.length > 0
          ? data.definition.presentation.views
          : chooseView(data.definition, result, semantic);
      return { result, views };
    } catch {
      return null; // broken widget → inline alert, never breaks the board
    }
  }, [data]);

  const title = widget.title ?? data?.definition.name ?? t("dash.widget");

  const actions = editing ? (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "remove",
            danger: true,
            label: t("dash.removeWidget"),
            onClick: onRemove,
          },
        ],
      }}
    >
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined />}
        aria-label={t("dash.widgetMenu")}
      />
    </Dropdown>
  ) : undefined;

  // KPI bento: if the primary view is a kpi and we have a single value, render
  // it as a KpiTile card (no chart container overhead, fills the bento cell).
  const activeView = computed?.views[widget.viewIndex ?? 0] ?? computed?.views[0];
  const isKpiView = activeView?.type === "kpi";

  if (isKpiView && computed && data) {
    const valueKey = activeView.mapping.value as string | undefined;
    const firstRow = computed.result.rows[0] as Record<string, unknown> | undefined;
    const kpiValue = valueKey && firstRow ? String(firstRow[valueKey] ?? "—") : "—";

    return (
      <SectionCard
        size="small"
        title={title}
        loading={isLoading}
        extra={actions}
        style={{ height: "100%" }}
        styles={{ body: { height: "calc(100% - 40px)", overflow: "hidden" } }}
      >
        {isError || computed === null ? (
          <Alert type="error" showIcon message={t("dash.widgetError")} />
        ) : (
          <div style={{ padding: "8px 0" }}>
            <KpiTile label={title} value={kpiValue} tone="emerald" />
          </div>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard
      size="small"
      title={title}
      loading={isLoading}
      extra={actions}
      style={{ height: "100%" }}
      styles={{ body: { height: "calc(100% - 40px)", overflow: "auto" } }}
    >
      {isError || computed === null ? (
        <Alert type="error" showIcon message={t("dash.widgetError")} />
      ) : computed && data ? (
        <ReportViewRenderer
          view={activeView!}
          def={data.definition}
          result={computed.result}
        />
      ) : null}
    </SectionCard>
  );
}
