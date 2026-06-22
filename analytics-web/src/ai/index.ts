// report-web/src/ai/index.ts
// Barrel: re-export the service factory and its types so consumers never
// import from concrete implementation files directly.
export { createAIService } from "./mock-ai-service";
export type { IReportAIService, GenerateReportRequest, AIReportResult } from "./IReportAIService";
