import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsCoreOption } from "echarts";
import { Card, Row, Col, Skeleton, Statistic } from "antd";
import { useTranslation } from "react-i18next";
import { useAIUsageSeries } from "../../../api/queries";

function useEChart(option: EChartsCoreOption | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !option) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option]);
  return ref;
}

export function AIUsageCost() {
  const { t } = useTranslation();
  const { data, isLoading } = useAIUsageSeries();
  const totalTokens = (data?.perDay ?? []).reduce((s, d) => s + d.tokens, 0);
  const totalCost = (data?.perModel ?? []).reduce((s, m) => s + m.costUsd, 0);

  const tokensRef = useEChart(
    data
      ? {
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: data.perDay.map((d) => d.date) },
          yAxis: { type: "value" },
          series: [
            {
              type: "line",
              smooth: true,
              data: data.perDay.map((d) => d.tokens),
              name: t("admin.ai.tokens"),
            },
          ],
        }
      : null,
  );

  const costRef = useEChart(
    data
      ? {
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: data.perModel.map((m) => m.model) },
          yAxis: { type: "value" },
          series: [
            {
              type: "bar",
              data: data.perModel.map((m) => m.costUsd),
              name: t("admin.ai.costUsd"),
            },
          ],
        }
      : null,
  );

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div>
      <h2>{t("admin.ai.usageTitle")}</h2>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card>
            <Statistic title={t("admin.ai.totalTokens")} value={totalTokens} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic title={t("admin.ai.totalCost")} prefix="$" precision={2} value={totalCost} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={t("admin.ai.tokensOverTime")}>
            <div data-testid="tokens-chart" ref={tokensRef} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t("admin.ai.costByModel")}>
            <div data-testid="cost-chart" ref={costRef} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
