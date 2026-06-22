// report-web/src/features/ask-ai/DefinitionPanel.tsx
import { Button, Collapse, Tooltip } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ReportDefinition } from "@/contracts";

interface Props {
  def: ReportDefinition;
}

export function DefinitionPanel({ def }: Props) {
  const { t } = useTranslation();
  const json = JSON.stringify(def, null, 2);
  const lines = json.split("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(json);
  };

  return (
    <div data-testid="definition-panel">
      <Collapse
        ghost
        items={[
          {
            key: "def",
            label: t("ask.definitionTitle"),
            extra: (
              <Tooltip title={t("ask.copyJson")}>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copy();
                  }}
                />
              </Tooltip>
            ),
            children: (
              <motion.pre
                className="ask-def__code"
                initial="hidden"
                animate="show"
                variants={{
                  show: { transition: { staggerChildren: 0.012 } },
                }}
                style={{
                  maxHeight: 320,
                  overflow: "auto",
                  fontSize: 12,
                  direction: "ltr",
                  textAlign: "left",
                }}
              >
                {lines.map((ln, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 4 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    {ln || " "}
                  </motion.div>
                ))}
              </motion.pre>
            ),
          },
        ]}
      />
    </div>
  );
}
