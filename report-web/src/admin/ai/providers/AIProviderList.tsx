import { useMemo, useState } from "react";
import { Table, Tag, Button, Space, Alert, Skeleton, Empty, message } from "antd";
import { useTranslation } from "react-i18next";
import type { ProviderConfig } from "../../../contracts";
import { useTenantAIConfig, useUpdateTenantAIConfig, useTestProvider } from "../../../api/queries";
import { ProviderFormModal } from "./ProviderFormModal";

export function AIProviderList() {
  const { t } = useTranslation();
  const { data: cfg, isLoading } = useTenantAIConfig();
  const update = useUpdateTenantAIConfig();
  const test = useTestProvider();
  const [modal, setModal] = useState<{ open: boolean; initial?: ProviderConfig }>({ open: false });
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; latencyMs: number; error?: string } | null>(null);

  const providers = cfg?.providers ?? [];

  const save = (p: ProviderConfig) => {
    if (!cfg) return;
    const exists = cfg.providers.some((x) => x.id === p.id);
    const providersNext = exists ? cfg.providers.map((x) => (x.id === p.id ? p : x)) : [...cfg.providers, p];
    update.mutate({ ...cfg, providers: providersNext });
    setModal({ open: false });
  };

  const remove = (id: string) => {
    if (!cfg) return;
    update.mutate({
      ...cfg,
      providers: cfg.providers.filter((x) => x.id !== id),
      fallbackChain: cfg.fallbackChain.filter((f) => f !== id),
    });
  };

  const runTest = async (id: string) => {
    const r = await test.mutateAsync(id);
    setTestResult({ id, ...r });
    if (r.ok) void message.success(t("admin.ai.testOk", { ms: r.latencyMs }));
  };

  const columns = useMemo(() => ([
    { title: t("admin.ai.colType"), dataIndex: "type", render: (v: string) => t(`admin.ai.type.${v}`) },
    { title: t("admin.ai.model"), dataIndex: "model" },
    { title: t("admin.ai.apiKey"), dataIndex: "keyRef", render: (k: string | null) => (k ? "•••••" : <Tag>{t("admin.ai.noKey")}</Tag>) },
    { title: t("admin.ai.status"), dataIndex: "enabled", render: (e: boolean) => <Tag color={e ? "green" : "default"}>{e ? t("admin.ai.enabled") : t("admin.ai.disabled")}</Tag> },
    {
      title: t("common.actions"),
      render: (_: unknown, r: ProviderConfig) => (
        <Space>
          <Button size="small" loading={test.isPending} onClick={() => void runTest(r.id)}>{t("admin.ai.testConnection")}</Button>
          <Button size="small" onClick={() => setModal({ open: true, initial: r })}>{t("common.edit")}</Button>
          <Button size="small" danger onClick={() => remove(r.id)}>{t("common.delete")}</Button>
        </Space>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [t, test.isPending]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
        <h2>{t("admin.ai.providersTitle")}</h2>
        <Button type="primary" onClick={() => setModal({ open: true })}>{t("admin.ai.addProvider")}</Button>
      </Space>
      {testResult && !testResult.ok && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={t("admin.ai.testFailed")}
          description={testResult.error}
          closable
          onClose={() => setTestResult(null)}
        />
      )}
      {providers.length === 0 ? (
        <Empty description={t("admin.ai.noProviders")}>
          <Button type="primary" onClick={() => setModal({ open: true })}>{t("admin.ai.addProvider")}</Button>
        </Empty>
      ) : (
        <Table rowKey="id" dataSource={providers} columns={columns} pagination={false} />
      )}
      <ProviderFormModal
        open={modal.open}
        initial={modal.initial}
        onCancel={() => setModal({ open: false })}
        onSave={save}
      />
    </div>
  );
}
