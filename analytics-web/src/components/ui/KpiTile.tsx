import { Card, Typography } from "antd";
import type { ReactNode } from "react";

const TONES: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: "var(--ant-color-fill-quaternary)", fg: "var(--ant-color-text)" },
  emerald: { bg: "#e1f5ee", fg: "#085041" },
  blue: { bg: "#e6f1fb", fg: "#0c447c" },
  amber: { bg: "#faeeda", fg: "#633806" },
};

export function KpiTile({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
}) {
  const c = TONES[tone];
  return (
    <Card variant="borderless" style={{ background: c.bg, borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
      <Typography.Text style={{ color: c.fg, fontSize: 13 }}>
        {icon} {label}
      </Typography.Text>
      <div style={{ color: c.fg, fontSize: 24, fontWeight: 500, marginTop: 4 }}>{value}</div>
    </Card>
  );
}
