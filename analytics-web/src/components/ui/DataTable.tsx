import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

export function DataTable<T extends object>({
  columns,
  data,
  loading,
  error,
  rowKey,
  empty,
  toolbar,
  pageSize = 10,
}: {
  columns: ColumnsType<T>;
  data?: T[];
  loading?: boolean;
  error?: unknown;
  rowKey: string | ((r: T) => string);
  empty?: ReactNode;
  toolbar?: ReactNode;
  pageSize?: number;
}) {
  if (error) return <ErrorState detail={String((error as Error)?.message ?? error)} />;
  return (
    <>
      {toolbar}
      <Table<T>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={rowKey}
        size="middle"
        pagination={{ pageSize, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: empty ?? <EmptyState /> }}
      />
    </>
  );
}
