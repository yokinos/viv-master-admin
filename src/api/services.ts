/**
 * 网关服务前缀。
 *
 * 网关路由规则：`/{短名}/api/{**catch-all}` → 下游 `/api/{**catch-all}`
 * （由 VivGatewayRouteBuilder 从 Aspire 服务发现自动生成，零手写配置）。
 *
 * 短名 = Aspire 服务名 split('-') 取第二段：`viv-apex-api` → `apex`；
 * 第二段冲突时拼接剩余段：`viv-herta-link` → `hertalink`。
 *
 * 新增服务只改这里一行，不要往环境变量里塞服务前缀。
 */
export const Service = {
  apex: '/apex/api',
  herta: '/herta/api',
  hertalink: '/hertalink/api',
  deepred: '/deepred/api',
  ouroboros: '/ouroboros/api',
  sakumai: '/sakumai/api',
} as const;

/**
 * WebSocket / SignalR 前缀：`/ws/{短名}/**` → 下游 `/{**catch-all}`
 * 接 Herta 的 IM 时用（注意：链路是 wss 且走网关的查询参数令牌认证）。
 */
export const wsPrefix = (short: keyof typeof Service) => `/ws/${short}`;
