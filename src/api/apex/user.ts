import type { GetLoginDataResult } from '@/api/model/apex/userModel';
import { Service } from '@/api/services';
import { request } from '@/utils/request';

const Api = {
  GetLoginData: `${Service.apex}/User/getLoginData`,
};

/**
 * 登录数据：用户信息 + 菜单路由树 + 按钮权限。
 *
 * 后端一次下发，登录后立刻调一次即可，别放在每次路由跳转里。
 */
export function getLoginData() {
  return request.post<GetLoginDataResult>({
    url: Api.GetLoginData,
    data: {},
  });
}
