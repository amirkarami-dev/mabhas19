import { useState } from "react";
import { Card, Input, Select, Table, Tag } from "antd";
import { useLogs } from "../../lib/queries";
import { LOG_STATUS_LABEL } from "../../lib/types";
import type { LogsFilter, MunReportLogDto } from "../../lib/types";

export function LogsPage() {
  const [filter, setFilter] = useState<LogsFilter>({ page: 1, pageSize: 50 });
  const { data, isLoading } = useLogs(filter);

  return (
    <Card title="تاریخچه ارسال‌ها">
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="نوع عملیات"
          style={{ width: 200 }}
          options={[
            { value: "SaveEngineerReport", label: "گزارش مهندس ناظر" },
            { value: "SaveEngMap", label: "نقشه مهندسین" },
          ]}
          onChange={(workerType) => setFilter((f) => ({ ...f, workerType, page: 1 }))}
        />
        <Select
          allowClear
          placeholder="وضعیت"
          style={{ width: 160 }}
          options={[
            { value: "Success", label: "موفق" },
            { value: "Failed", label: "ناموفق" },
          ]}
          onChange={(status) => setFilter((f) => ({ ...f, status, page: 1 }))}
        />
        <Input.Search
          placeholder="جستجوی پیگیری"
          style={{ width: 220 }}
          onSearch={(peygiri) => setFilter((f) => ({ ...f, peygiri, page: 1 }))}
        />
        <Input.Search
          placeholder="جستجوی شماره پروژه"
          style={{ width: 220 }}
          onSearch={(projectNo) => setFilter((f) => ({ ...f, projectNo, page: 1 }))}
        />
      </div>

      <Table<MunReportLogDto>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.items ?? []}
        pagination={{
          current: filter.page ?? 1,
          pageSize: filter.pageSize ?? 50,
          total: data?.total ?? 0,
          onChange: (page, pageSize) => setFilter((f) => ({ ...f, page, pageSize })),
        }}
        columns={[
          { title: "پیگیری", dataIndex: "peygiri" },
          { title: "شماره پروژه", dataIndex: "projectNo" },
          { title: "کد ملک", dataIndex: "reqId" },
          {
            title: "وضعیت",
            dataIndex: "status",
            render: (status: MunReportLogDto["status"]) => (
              <Tag color={status === "Success" ? "success" : "error"}>{LOG_STATUS_LABEL[status]}</Tag>
            ),
          },
          { title: "تلاش", dataIndex: "attemptNumber" },
          { title: "شناسه ثبت", dataIndex: "remoteSubmissionId" },
          { title: "خطا", dataIndex: "errorMessage" },
          {
            title: "زمان",
            dataIndex: "startedAt",
            render: (v: string) => new Date(v).toLocaleString("fa-IR"),
          },
        ]}
      />
    </Card>
  );
}
