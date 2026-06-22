// report-web/src/features/ask-ai/AskAiBuilder.tsx
import { Alert, Breadcrumb, Button, Dropdown, Empty, Space, Spin } from "antd";
import { DownloadOutlined, SaveOutlined } from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReportViewRenderer } from "@/presentation/ReportView";
import { buildExportMenuItems } from "@/features/export";
import { AuthContext } from "@/auth/useAuth";
import { PromptHero } from "./PromptHero";
import { DefinitionPanel } from "./DefinitionPanel";
import { ViewSwitcher } from "./ViewSwitcher";
import { SaveReportModal } from "./SaveReportModal";
import { useAskAi } from "./useAskAi";

const THINKING_STEPS = [
  "ask.thinking.understanding",
  "ask.thinking.resolving",
  "ask.thinking.building",
] as const;

export function AskAiBuilder() {
  const { t } = useTranslation();

  // Use the context directly so we don't throw when AuthProvider is absent in tests.
  const auth = useContext(AuthContext);
  const roles = auth?.roles ?? [];
  // AI Manager can run/preview but cannot save (execute-only, no reports:write — §3.1).
  const canSave = !roles.includes("AIManager");

  const { state, submit, setDataset, switchView, drill, drillUp } = useAskAi();
  const [saveOpen, setSaveOpen] = useState(false);

  if (state.phase === "hero") {
    return (
      <div className="ask-screen ask-screen--hero">
        <PromptHero
          compact={false}
          datasetKey={state.datasetKey}
          onDataset={setDataset}
          onSubmit={(p) => void submit(p)}
        />
      </div>
    );
  }

  const activeView = state.views[state.activeViewIndex];

  return (
    <div className="ask-screen ask-screen--work">
      <PromptHero
        compact
        datasetKey={state.datasetKey}
        onDataset={setDataset}
        onSubmit={(p) => void submit(p)}
      />

      {state.phase === "thinking" && (
        <div className="ask-thinking" role="status">
          <Spin />
          <motion.span
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {t(THINKING_STEPS[0])}
          </motion.span>
        </div>
      )}

      {state.phase === "error" && (
        <Alert
          type="warning"
          showIcon
          role="alert"
          message={t("ask.error.unmappedTitle")}
          description={t("ask.error.unmappedHint")}
        />
      )}

      {state.phase === "result" && state.def && state.result && (
        <>
          <DefinitionPanel def={state.def} />

          <Space className="ask-toolbar" wrap>
            <ViewSwitcher
              views={state.views}
              active={activeView}
              result={state.result}
              onSwitch={switchView}
            />
            {canSave && (
              <Button
                icon={<SaveOutlined />}
                onClick={() => setSaveOpen(true)}
                data-testid="save-btn"
              >
                {t("ask.saveToLibrary")}
              </Button>
            )}
            <Dropdown
              menu={{ items: buildExportMenuItems(state.def, state.result) }}
              trigger={["click"]}
            >
              <Button icon={<DownloadOutlined />} data-testid="export-btn">
                {t("ask.export")}
              </Button>
            </Dropdown>
          </Space>

          {state.drillPath.length > 0 && (
            <Breadcrumb
              items={[
                {
                  title: (
                    <a
                      onClick={() => drillUp()}
                      style={{ cursor: "pointer" }}
                    >
                      {t("ask.root")}
                    </a>
                  ),
                },
                ...state.drillPath.map((c) => ({ title: c.label })),
              ]}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={state.activeViewIndex + (activeView?.component ?? "")}
              data-testid="result-canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {state.result.total === 0 ? (
                <Empty description={t("ask.empty.noRows")} />
              ) : activeView ? (
                <ReportViewRenderer
                  view={activeView}
                  def={state.def}
                  result={state.result}
                  onDrill={drill}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {state.def && (
        <SaveReportModal
          open={saveOpen}
          def={state.def}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </div>
  );
}
