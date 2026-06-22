import { useMemo } from "react";
import { Table, Skeleton, Empty, Tag, Space } from "antd";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import type { SemanticModel, Entity } from "../../contracts";
import { useSemanticModels } from "../../api/queries";
import { FieldPreviewTable } from "./FieldPreviewTable";

export function SemanticModelList() {
  const { t } = useTranslation();
  const { data: models, isLoading } = useSemanticModels();
  const [params] = useSearchParams();
  const focusId = params.get("model");

  const columns = useMemo(
    () => [
      {
        title: t("admin.sm.name"),
        dataIndex: "name" as const,
        render: (name: SemanticModel["name"]) => name["fa-IR"] || name["en-US"],
      },
      {
        title: t("admin.sm.id"),
        dataIndex: "id" as const,
      },
      {
        title: t("admin.sm.entities"),
        render: (_: unknown, m: SemanticModel) => m.entities.length,
      },
      {
        title: t("admin.sm.fields"),
        render: (_: unknown, m: SemanticModel) =>
          m.entities.reduce((sum, e) => sum + e.fields.length, 0),
      },
      {
        title: t("admin.sm.version"),
        dataIndex: "version" as const,
        render: (v: number) => <Tag>{`v${v}`}</Tag>,
      },
    ],
    [t],
  );

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  const list = models ?? [];

  return (
    <div>
      <h2>{t("admin.sm.title")}</h2>
      {list.length === 0 ? (
        <Empty description={t("admin.sm.empty")} />
      ) : (
        <Table<SemanticModel>
          rowKey="id"
          dataSource={list}
          columns={columns}
          pagination={false}
          defaultExpandedRowKeys={focusId ? [focusId] : undefined}
          expandable={{
            expandedRowRender: (m) => (
              <div>
                {m.entities.map((entity: Entity) => (
                  <div key={entity.id} style={{ marginBottom: 16 }}>
                    <Space style={{ marginBottom: 8 }}>
                      <strong>
                        {entity.name["fa-IR"] || entity.name["en-US"]}
                      </strong>
                      <Tag>{entity.source}</Tag>
                    </Space>
                    <FieldPreviewTable fields={entity.fields} entityId={entity.id} />
                  </div>
                ))}
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}
