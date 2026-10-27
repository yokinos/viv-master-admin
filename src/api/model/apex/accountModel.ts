import type { VivApiRequest } from '@/api/vivapirequest';

/**
 * 登录请求。
 *
 * ⚠️ `userName` 是后端字段名（`LoginRequest.UserName`），但服务端实际按 **手机号** 匹配
 * （`UserRepository.GetUserByPhoneAsync`：`x.Phone == phone`），所以这里传的是手机号。
 */
export interface LoginParams extends VivApiRequest {
  /** 手机号（后端字段名为 userName） */
  userName: string;
  password: string;
  /** 客户端对外标识，对应 `AtClientApp.AppKey`（不是主键） */
  appKey: string;
  /** `EmUserType`：Master=0 / OrgUser=1 / CompanyUser=2 / TenantUser=3 */
  userType: number;
}

/**
 * 登录返回（`LoginOutput`）。
 *
 * 后端 JSON 约定：首字母小写；**long 序列化为字符串**（防精度丢失）；日期是 `yyyy-MM-dd HH:mm:ss`。
 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: string;
  refreshTokenExpires: string;
  /** 真实姓名 */
  name: string;
  /** 昵称，优先用于展示 */
  nickName: string;
  /** long → 字符串 */
  userId: string;
  phone: string;
  avatarUrl: string;
}
