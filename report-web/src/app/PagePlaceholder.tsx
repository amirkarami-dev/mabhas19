import { Empty } from "antd";

export function PagePlaceholder({ name }: { name: string }) {
  return <Empty description={name} style={{ marginTop: 80 }} />;
}
