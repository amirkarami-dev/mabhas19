import { Button, Drawer, Space } from "antd";
import type { ReactNode } from "react";

export function FormDrawer({
  open,
  title,
  onClose,
  onSubmit,
  submitting,
  children,
  width = 480,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      width={width}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>انصراف</Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            ذخیره
          </Button>
        </Space>
      }
    >
      {children}
    </Drawer>
  );
}
