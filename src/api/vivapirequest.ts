/**
 * Viv 接口统一请求体基类：后端 `VivApiRequest.Version` 是必填（1000–9999）。
 *
 * 声明为可选 —— 实际由 request 层集中注入（见 utils/request/index.ts），
 * 调用点不用写，但保留字段让类型完整、也允许个别接口显式覆盖。
 */
export interface VivApiRequest {
  version?: number;
}
