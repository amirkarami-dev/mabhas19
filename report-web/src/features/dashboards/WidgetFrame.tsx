import { Alert, Button, Card, Dropdown } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardWidget } from "@/dashboard/widget";
import { useReport } from "@/api/queries";
import { runQuery } from "@/query/engine";
import { chooseView } from "@/presentation/auto-viz";
import { getDataset, getModelForDataset } from "@/semantic/registry";
import { ReportViewRenderer } from "@/presentation/ReportView";

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

  return (
    <Card
      size="small"
      title={widget.title ?? data?.definition.name ?? t("dash.widget")}
      loading={isLoading}
      styles={{ body: { height: "calc(100% - 40px)", overflow: "auto" } }}
      extra={
        editing && (
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
        )
      }
    >
      {isError || computed === null ? (
        <Alert type="error" showIcon message={t("dash.widgetError")} />
      ) : computed ? (
        <ReportViewRenderer
          view={computed.views[widget.viewIndex ?? 0] ?? computed.views[0]}
          def={data!.definition}
          result={computed.result}
        />
      ) : null}
    </Card>
  );
}
