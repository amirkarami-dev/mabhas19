import { useState } from "react";
import { Button, Card, Col, Row, Statistic, Table, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { useRunDetail, useRuns, useTriggerRun } from "../../lib/queries";
import { LOG_STATUS_LABEL, RUN_STATUS_LABEL } from "../../lib/types";
import type { MunReportLogDto, MunWorkerType } from "../../lib/types";

const WORKER_LABEL: Record<MunWorkerType, string> = {
  SaveEngineerReport: "گزارش مهندس ناظر",
  SaveEngMap: "نقشه مهندسین",
};

export function Dashboard() {
  const { data: runs } = useRuns();
  const trigger = useTriggerRun();
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

  const latestByWorker = (worker: MunWorkerType) => runs?.find((r) => r.workerType === worker);
  const activeRunId = selectedRunId ?? runs?.find((r) => r.status === "Running")?.runId ?? runs?.[0]?.runId;
  const { data: detail } = useRunDetail(activeRunId);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {(["SaveEngineerReport", "SaveEngMap"] as const).map((worker) => {
          const run = latestByWorker(worker);
          return (
            <Col span={12} key={worker}>
              <Card
                title={WORKER_LABEL[worker]}
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    loading={trigger.isPending}
                    onClick={() => trigger.mutate(worker)}
                  >
                    اجرای فوری
                  </Button>
                }
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="موفق" value={run?.successCount ?? 0} valueStyle={{ color: "#3f8600" }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="ناموفق" value={run?.failedCount ?? 0} valueStyle={{ color: "#cf1322" }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="کل" value={run?.totalRows ?? 0} />
                  </Col>
                </Row>
                {run && (
                  <Typography.Text
                    type="secondary"
                    style={{ display: "block", marginTop: 12, cursor: "pointer" }}
                    onClick={() => setSelectedRunId(run.runId)}
                  >
                    آخرین اجرا: {new Date(run.startedAt).toLocaleString("fa-IR")} —{" "}
                    <Tag color={run.status === "Running" ? "processing" : run.status === "Completed" ? "success" : "error"}>
                      {RUN_STATUS_LABEL[run.status]}
                    </Tag>
                  </Typography.Text>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {runs && runs.length > 0 && (
        <Card title="روند اجراها" style={{ marginBottom: 24 }}>
          <ReactECharts
            style={{ height: 280 }}
            option={{
              tooltip: {},
              legend: { data: ["موفق", "ناموفق"] },
              xAxis: { type: "category", data: runs.map((r) => new Date(r.startedAt).toLocaleTimeString("fa-IR")).reverse() },
              yAxis: { type: "value" },
              series: [
                { name: "موفق", type: "bar", stack: "total", data: runs.map((r) => r.successCount).reverse(), color: "#3f8600" },
                { name: "ناموفق", type: "bar", stack: "total", data: runs.map((r) => r.failedCount).reverse(), color: "#cf1322" },
              ],
            }}
          />
        </Card>
      )}

      <Card title="جزئیات آخرین اجرا">
        <Table<MunReportLogDto>
          rowKey="id"
          size="small"
          dataSource={detail?.logs ?? []}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "پیگیری", dataIndex: "peygiri" },
            { title: "شماره پروژه", dataIndex: "projectNo" },
            {
              title: "وضعیت",
              dataIndex: "status",
              render: (status: MunReportLogDto["status"]) => (
                <Tag color={status === "Success" ? "success" : "error"}>{LOG_STATUS_LABEL[status]}</Tag>
              ),
            },
            { title: "تلاش", dataIndex: "attemptNumber" },
            { title: "خطا", dataIndex: "errorMessage" },
          ]}
        />
        <AnimatePresence>
          {detail?.logs.slice(0, 3).map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: "none" }}
            />
          ))}
        </AnimatePresence>
      </Card>
    </div>
  );
}
