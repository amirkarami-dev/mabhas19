// report-web/src/features/ask-ai/useAskAi.ts
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Dataset,
  GroupNode,
  QueryResult,
  ReportDefinition,
  ReportView,
  SemanticModel,
  ViewType,
} from "@/contracts";
import { createAIService } from "@/ai/mock-ai-service";
import { runQuery } from "@/query/engine";
import { drillInto } from "@/query/drilldown";
import { chooseView } from "@/presentation/auto-viz";
import { getDataset, getSemanticModel } from "@/semantic/registry";

export type DrillCrumb = {
  label: string;
  def: ReportDefinition;
  result: QueryResult;
  views: ReportView[];
};

export type AskAiPhase = "hero" | "thinking" | "result" | "error";

export interface AskAiState {
  phase: AskAiPhase;
  datasetKey: string;
  def?: ReportDefinition;
  result?: QueryResult;
  views: ReportView[];
  activeViewIndex: number;
  drillPath: DrillCrumb[];
  explanation?: string;
  errorKey?: string;
}

/** The default model key to pre-select. */
const DEFAULT_MODEL_KEY = "model-sales";

/** Maps a view-switcher subtype to a ReportView shape. */
const SUBTYPE_TO_VIEW: Record<
  "bar" | "line" | "pie",
  Pick<ReportView, "type" | "library" | "component">
> = {
  bar: { type: "chart", library: "recharts", component: "BarChart" },
  line: { type: "chart", library: "recharts", component: "LineChart" },
  pie: { type: "chart", library: "recharts", component: "PieChart" },
};

export function useAskAi() {
  const ai = useMemo(() => createAIService(), []);
  const [state, setState] = useState<AskAiState>({
    phase: "hero",
    datasetKey: DEFAULT_MODEL_KEY,
    views: [],
    activeViewIndex: 0,
    drillPath: [],
  });
  // Guard against out-of-order responses from rapid resubmits.
  const reqSeq = useRef(0);

  const submit = useCallback(
    async (prompt: string, datasetKey?: string) => {
      const key = datasetKey ?? state.datasetKey;
      const seq = ++reqSeq.current;
      setState((s) => ({ ...s, phase: "thinking", datasetKey: key, errorKey: undefined }));
      try {
        const semantic: SemanticModel = getSemanticModel(key);
        // The dataset source lives in the first entity of the model.
        const datasetSource = semantic.entities[0].source;
        const dataset: Dataset = getDataset(datasetSource);
        const res = await ai.generate({ prompt, semanticModel: semantic, locale: "fa" });
        if (seq !== reqSeq.current) return; // stale
        const def = res.definition;
        const result = runQuery(def, dataset, semantic);
        // Prefer AI-pinned views; if empty, fall back to auto-viz.
        const views =
          def.presentation?.views?.length > 0
            ? def.presentation.views
            : chooseView(def, result, semantic);
        setState((s) => ({
          ...s,
          phase: "result",
          def,
          result,
          views,
          activeViewIndex:
            typeof def.presentation?.defaultView === "number"
              ? def.presentation.defaultView
              : 0,
          drillPath: [],
          explanation: res.explanation,
        }));
      } catch {
        if (seq !== reqSeq.current) return;
        setState((s) => ({ ...s, phase: "error", errorKey: "ask.error.unmapped" }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ai, state.datasetKey],
  );

  const switchView = useCallback(
    (type: ViewType | "bar" | "line" | "pie") => {
      setState((s) => {
        // Look for an existing view of that type/subtype first (avoids recompute).
        const existing = s.views.findIndex((v) =>
          type === "table" || type === "kpi"
            ? v.type === type
            : v.component.toLowerCase().includes(type),
        );
        if (existing >= 0) return { ...s, activeViewIndex: existing };
        if (type === "table" || type === "kpi") {
          const v: ReportView = {
            type,
            library: "antd",
            component: type === "table" ? "Table" : "KpiCard",
            mapping: {},
          };
          return { ...s, views: [...s.views, v], activeViewIndex: s.views.length };
        }
        // Build a chart view reusing the current result's mapping.
        const base = s.views[s.activeViewIndex];
        const chartKey = type as "bar" | "line" | "pie";
        const subtype = SUBTYPE_TO_VIEW[chartKey] ?? SUBTYPE_TO_VIEW.bar;
        const v: ReportView = {
          ...subtype,
          mapping: base?.mapping ?? {},
        };
        return { ...s, views: [...s.views, v], activeViewIndex: s.views.length };
      });
    },
    [],
  );

  const drill = useCallback(
    (node: GroupNode) => {
      setState((s) => {
        if (!s.def) return s;
        const semantic = getSemanticModel(s.datasetKey);
        const datasetSource = semantic.entities[0].source;
        const dataset = getDataset(datasetSource);
        const { def, result } = drillInto(s.def, node, dataset, semantic);
        const views = chooseView(def, result, semantic);
        const crumb: DrillCrumb = {
          label: String(node.value),
          def: s.def,
          result: s.result!,
          views: s.views,
        };
        return {
          ...s,
          def,
          result,
          views,
          activeViewIndex: 0,
          drillPath: [...s.drillPath, crumb],
        };
      });
    },
    [],
  );

  const drillUp = useCallback(() => {
    setState((s) => {
      if (s.drillPath.length === 0) return s;
      const path = [...s.drillPath];
      const prev = path.pop()!;
      return {
        ...s,
        def: prev.def,
        result: prev.result,
        views: prev.views,
        activeViewIndex: 0,
        drillPath: path,
      };
    });
  }, []);

  /**
   * Switches the active dataset (model key) only — does NOT generate a new report.
   * Used by the dataset picker so the user can change context before submitting.
   */
  const setDataset = useCallback(
    (key: string) => setState((s) => ({ ...s, datasetKey: key })),
    [],
  );

  const reset = useCallback(
    () =>
      setState({
        phase: "hero",
        datasetKey: DEFAULT_MODEL_KEY,
        views: [],
        activeViewIndex: 0,
        drillPath: [],
      }),
    [],
  );

  return { state, submit, setDataset, switchView, drill, drillUp, reset };
}
