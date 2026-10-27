import { defineStore } from 'pinia';

import { login as loginApi, logout as logoutApi, refreshToken as refreshTokenApi } from '@/api/apex/account';
import type { LoginResult } from '@/api/model/apex/accountModel';
import { usePermissionStore } from '@/store';
import type { UserInfo } from '@/types/interface';

const InitUserInfo: UserInfo = {
  name: '',
  roles: [],
};

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    refreshToken: '',
    /** 刷新时要带上（后端按 userId + userType 校验） */
    userId: '',
    userInfo: { ...InitUserInfo },
  }),
  getters: {
    roles: (state) => state.userInfo?.roles ?? [],
  },
  actions: {
    /** 登录与刷新返回同一个 `LoginOutput`，会话落库只写这一处 */
    setSession(result: LoginResult) {
      this.token = result.accessToken;
      this.refreshToken = result.refreshToken;
      this.userId = result.userId;
      this.userInfo = {
        name: result.nickName || result.name || '',
        roles: [],
        userId: result.userId,
        avatarUrl: result.avatarUrl,
      };
    },

    /**
     * 登录。后端 `LoginOutput` 里已带用户信息（没有独立的 profile 接口），直接缓存，
     * 否则路由守卫每次导航都得发一次请求。
     */
    async login(payload: { userName: string; password: string }) {
      this.setSession(await loginApi(payload));
    },

    /**
     * 刷新令牌。由 request 层在业务码 -401/-402 时调用；并发请求靠那边的单例 Promise 去重。
     * 失败返回 false，调用方据此踢回登录页。
     */
    async refreshSession(): Promise<boolean> {
      if (!this.refreshToken || !this.userId) return false;

      try {
        this.setSession(
          await refreshTokenApi({
            userId: this.userId,
            refreshToken: this.refreshToken,
          }),
        );
        return true;
      } catch {
        return false;
      }
    },

    /**
     * 守卫会调用。登录时已缓存、刷新后由 pinia 持久化恢复 —— 不再发网络请求。
     * 菜单与按钮权限在 `permission.buildAsyncRoutes()` 里拉（`/User/getLoginData`）。
     */
    async getUserInfo(): Promise<UserInfo> {
      return this.userInfo;
    },

    /**
     * 退出登录。
     *
     * 先清本地态再调接口：路由守卫的 afterEach 每次进 /login 都会调它，
     * 请求层在 -401 时也会回调 `logout(false)` —— 顺序反了会自己调自己。
     */
    async logout(remote = true) {
      const hadToken = Boolean(this.token);

      this.token = '';
      this.refreshToken = '';
      this.userId = '';
      this.userInfo = { ...InitUserInfo };

      if (!remote || !hadToken) return;

      try {
        await logoutApi();
      } catch {
        // 服务端会话清理失败不影响本地退出
      }
    },
  },
  persist: {
    key: 'user',
    // 刷新后 userInfo 也要在：没有 profile 接口，丢了名字右上角只能空着
    pick: ['token', 'refreshToken', 'userId', 'userInfo'],
    afterHydrate: () => {
      const permissionStore = usePermissionStore();
      permissionStore.initRoutes();
    },
  },
});
