// report-web/src/features/viewer/ReportViewer.tsx
import {
  Breadcrumb,
  Button,
  Descriptions,
  Dropdown,
  Empty,
  Result,
  Skeleton,
  Space,
  Typography,
} from "antd";
import { DownloadOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import type {
  Filter,
  FilterValue,
  GroupNode,
  QueryResult,
  ReportDefinition,
  ReportView,
} from "@/contracts";
import { useReport } from "@/api/queries";
import { runQuery } from "@/query/engine";
import { drillInto } from "@/query/drilldown";
import { chooseView } from "@/presentation/auto-viz";
import { getDataset, getModelForDataset } from "@/semantic/registry";
import { ReportViewRenderer } from "@/presentation/ReportView";
import { buildExportMenuItems } from "@/features/export";
import { ViewSwitcher, type SwitchTarget } from "@/features/ask-ai/ViewSwitcher";
import { useAuth } from "@/auth/useAuth";
import { FilterBar } from "./FilterBar";

type Crumb = { label: string; def: ReportDefinition; result: QueryResult; views: ReportView[] };

export function ReportViewer() {
  const { t } = useTranslation();
  const { reportId = "" } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { data, isLoading, isError } = useReport(reportId);

  const [filterValues, setFilterValues] = useState<Record<number, FilterValue>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [drillPath, setDrillPath] = useState<Crumb[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const semantic = useMemo(() => {
    if (!data) return undefined;
    try {
      return getModelForDataset(data.definition.dataset);
    } catch {
      return undefined;
    }
  }, [data]);

  const dataset = useMemo(() => {
    if (!data) return undefined;
    try {
      return getDataset(data.definition.dataset);
    } catch {
      return undefined;
    }
  }, [data]);

  // Apply live filter-bar overrides into the definition before running.
  const liveDef = useMemo<ReportDefinition | undefined>(() => {
    if (!data) return undefined;
    const base = data.definition;
    const filters: Filter[] = (base.filters ?? []).map((f, i) =>
      filterValues[i] === undefined ? f : { ...f, value: filterValues[i] },
    );
    return { ...base, filters };
    // refreshKey forces recompute on "Refresh"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filterValues, refreshKey]);

  const computed = useMemo(() => {
    if (!liveDef || !dataset || !semantic) return undefined;
    try {
      const result = runQuery(liveDef, dataset, semantic);
      const views =
        liveDef.presentation?.views?.length > 0
          ? liveDef.presentation.views
          : chooseView(liveDef, result, semantic);
      return { result, views };
    } catch {
      return undefined;
    }
  }, [liveDef, dataset, semantic]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError || (data === null && !isLoading)) {
    return <Result status="404" title={t("viewer.notFound")} />;
  }
  if (!data) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (!computed || !liveDef || !semantic) {
    return <Result status="error" title={t("viewer.invalid")} />;
  }

  const { result, views } = drillPath.length
    ? { result: drillPath[drillPath.length - 1].result, views: drillPath[drillPath.length - 1].views }
    : computed;

  const activeDef = drillPath.length ? drillPath[drillPath.length - 1].def : liveDef;
  const activeView = views[Math.min(activeIdx, views.length - 1)] ?? views[0];

  const canEdit =
    roles.includes("ReportDesigner") ||
    roles.includes("PowerUser") ||
    roles.includes("TenantAdmin") ||
    roles.includes("SuperAdmin");

  const drill = (node: GroupNode) => {
    if (!dataset) return;
    try {
      const { def, result: r } = drillInto(activeDef, node, dataset, semantic);
      const drillViews = chooseView(def, r, semantic);
      setDrillPath((p) => [
        ...p,
        { label: String(node.value), def, result: r, views: drillViews },
      ]);
      setActiveIdx(0);
    } catch {
      // drilldown config missing — silently skip
    }
  };

  const drillUp = (toRoot = false) => {
    setDrillPath((p) => (toRoot ? [] : p.slice(0, -1)));
    setActiveIdx(0);
  };

  const switchView = (target: SwitchTarget) => {
    const idx = views.findIndex((v) =>
      target === "table" || target === "kpi"
        ? v.type === target
        : v.component.toLowerCase().includes(target),
    );
    setActiveIdx(idx >= 0 ? idx : 0);
  };

  return (
    <div className="viewer-screen">
      <Typography.Title level={2}>{data.definition.name}</Typography.Title>
      {data.definition.description && (
        <Typography.Paragraph type="secondary">{data.definition.description}</Typography.Paragraph>
      )}
      <Descriptions
        size="small"
        column={3}
        items={[
          { key: "owner", label: t("viewer.owner"), children: data.ownerName },
          { key: "model", label: t("viewer.model"), children: data.definition.dataset },
          { key: "updated", label: t("viewer.updated"), children: data.updatedAt },
        ]}
      />

      <FilterBar
        filters={liveDef.filters ?? []}
        semantic={semantic}
        onChange={(i, v) => setFilterValues((s) => ({ ...s, [i]: v }))}
      />

      <Space className="viewer-toolbar" wrap>
        <ViewSwitcher views={views} active={activeView} result={result} onSwitch={switchView} />
        <Button icon={<ReloadOutlined />} onClick={() => setRefreshKey((k) => k + 1)}>
          {t("viewer.refresh")}
        </Button>
        {canEdit && (
          <Button icon={<EditOutlined />} onClick={() => navigate(`/ask?from=${reportId}`)}>
            {t("viewer.openInAsk")}
          </Button>
        )}
        <Dropdown menu={{ items: buildExportMenuItems(activeDef, result) }} trigger={["click"]}>
          <Button icon={<DownloadOutlined />}>{t("viewer.export")}</Button>
        </Dropdown>
      </Space>

      {drillPath.length > 0 && (
        <Breadcrumb
          items={[
            { title: <a onClick={() => drillUp(true)}>{data.definition.name}</a> },
            ...drillPath.map((c) => ({ title: c.label })),
          ]}
        />
      )}

      <div data-testid="result-canvas">
        {result.total === 0 ? (
          <Empty description={t("viewer.emptyFilters")} />
        ) : (
          <ReportViewRenderer view={activeView} def={activeDef} result={result} onDrill={drill} />
        )}
      </div>
    </div>
  );
}
