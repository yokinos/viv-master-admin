import type { LoginParams, LoginResult } from '@/api/model/apex/accountModel';
import { Service } from '@/api/services';
import { request } from '@/utils/request';

const Api = {
  Login: `${Service.apex}/Account/login`,
  RefreshToken: `${Service.apex}/Account/refreshToken`,
  Logout: `${Service.apex}/Account/logout`,
};

/**
 * 登录。appKey / userType 由环境变量决定，页面不接触这两个概念。
 */
export function login(data: Omit<LoginParams, 'appKey' | 'userType'>) {
  return request.post<LoginResult>({
    url: Api.Login,
    data: {
      ...data,
      appKey: import.meta.env.VITE_VIV_APP_KEY,
      userType: Number(import.meta.env.VITE_VIV_USER_TYPE ?? 0),
    },
  });
}

/**
 * 用 refreshToken 换一套新的 accessToken。
 *
 * 后端按 `userId + userType + appKey + refreshToken` 校验（refreshToken 是一次性凭据），
 * 所以三个都带上；返回体与登录一致（`LoginOutput`）。
 */
export function refreshToken(data: { userId: string; refreshToken: string }) {
  return request.post<LoginResult>(
    {
      url: Api.RefreshToken,
      data: {
        ...data,
        appKey: import.meta.env.VITE_VIV_APP_KEY,
        userType: Number(import.meta.env.VITE_VIV_USER_TYPE ?? 0),
      },
    },
    // 刷新请求自己不能再触发"401 → 刷新"，否则会递归
    { skipAuthRefresh: true },
  );
}

/**
 * 退出登录（后端按当前上下文清 Redis 会话）。
 * 前端不做强制依赖：本地登录态无论如何都会清掉，这里失败只影响服务端会话记录。
 */
export function logout() {
  return request.post<void>(
    {
      url: Api.Logout,
      data: { userType: Number(import.meta.env.VITE_VIV_USER_TYPE ?? 0) },
    },
    { skipAuthRefresh: true },
  );
}

/** 供 request 层判断是否递归：刷新端点自身 */
export const REFRESH_TOKEN_URL = Api.RefreshToken;
