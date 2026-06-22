import { useMemo, useState, useCallback } from "react";
import { Table, Tag, Button, Space, Skeleton, Empty, Alert, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { DataSourceRecord } from "../../api/queries";
import { useDataSources, useTestDataSource } from "../../api/queries";

const STATUS_COLOR: Record<DataSourceRecord["status"], string> = {
  connected: "green",
  error: "red",
  unconfigured: "default",
};

export function DataSourceList() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: sources, isLoading } = useDataSources();
  const test = useTestDataSource();
  const [err, setErr] = useState<string | null>(null);

  const runTest = useCallback(
    async (id: string) => {
      const r = await test.mutateAsync(id);
      if (r.ok) {
        void message.success(t("admin.ds.testOk"));
      } else {
        setErr(r.error ?? t("admin.ds.testFailed"));
      }
    },
    [test, t],
  );

  const goToModel = useCallback(
    (id: string) => nav(`/admin/semantic-models?model=${id}`),
    [nav],
  );

  const syncSchema = useCallback(() => {
    void message.success(t("admin.ds.syncOk"));
  }, [t]);

  const columns = useMemo(
    () => [
      { title: t("admin.ds.name"), dataIndex: "name" as const },
      {
        title: t("admin.ds.kindLabel"),
        dataIndex: "kind" as const,
        render: (k: string) => t(`admin.ds.kind.${k}`),
      },
      {
        title: t("admin.ds.rowCount"),
        dataIndex: "rowCount" as const,
        render: (n?: number) => (n !== undefined ? n.toLocaleString() : "—"),
      },
      {
        title: t("admin.ds.status"),
        dataIndex: "status" as const,
        render: (s: DataSourceRecord["status"]) => (
          <Tag color={STATUS_COLOR[s]}>{t(`admin.ds.statusValue.${s}`)}</Tag>
        ),
      },
      {
        title: t("admin.ds.semanticModel"),
        dataIndex: "semanticModelId" as const,
        render: (id: string) => (
          <Button type="link" onClick={() => goToModel(id)}>
            {id}
          </Button>
        ),
      },
      {
        title: t("common.actions"),
        render: (_: unknown, r: DataSourceRecord) => (
          <Space>
            <Button size="small" onClick={() => void runTest(r.id)}>
              {t("admin.ds.testConnection")}
            </Button>
            <Button size="small" onClick={syncSchema}>
              {t("admin.ds.syncSchema")}
            </Button>
          </Space>
        ),
      },
    ],
    [t, goToModel, runTest, syncSchema],
  );

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  const list = sources ?? [];

  return (
    <div>
      <Space
        style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}
      >
        <h2>{t("admin.ds.title")}</h2>
        <Button type="primary">{t("admin.ds.addSource")}</Button>
      </Space>
      {err && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={t("admin.ds.testFailed")}
          description={err}
          onClose={() => setErr(null)}
        />
      )}
      {list.length === 0 ? (
        <Empty description={t("admin.ds.empty")}>
          <Space>
            <Button type="primary">{t("admin.ds.addSource")}</Button>
            <Button onClick={() => nav("/admin/semantic-models")}>
              {t("admin.ds.useSamples")}
            </Button>
          </Space>
        </Empty>
      ) : (
        <Table<DataSourceRecord>
          rowKey="id"
          dataSource={list}
          columns={columns}
          pagination={false}
        />
      )}
    </div>
  );
}
