import { Modal } from "antd";
import type { ReactNode } from "react";

export function confirmAction({
  title,
  content,
  onOk,
}: {
  title: ReactNode;
  content?: ReactNode;
  onOk: () => void | Promise<void>;
}) {
  Modal.confirm({
    title,
    content,
    okText: "تأیید",
    cancelText: "انصراف",
    okButtonProps: { danger: true },
    onOk,
  });
}
