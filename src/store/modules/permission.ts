import cloneDeep from 'lodash/cloneDeep';
import { defineStore } from 'pinia';
import type { RouteRecordRaw } from 'vue-router';

import { getLoginData } from '@/api/apex/user';
import router, { fixedRouterList, homepageRouterList } from '@/router';
import { store } from '@/store';
import { transformBackendRoutes, transformObjectToRoute } from '@/utils/route';

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    whiteListRouters: ['/login'],
    routers: [] as Array<RouteRecordRaw>,
    removeRoutes: [] as Array<RouteRecordRaw>,
    asyncRoutes: [] as Array<RouteRecordRaw>,
  }),
  actions: {
    async initRoutes() {
      const accessedRouters = this.asyncRoutes;

      // 在菜单展示全部路由
      this.routers = cloneDeep([...homepageRouterList, ...accessedRouters, ...fixedRouterList]);
      // 在菜单只展示动态路由和首页
      // this.routers = [...homepageRouterList, ...accessedRouters];
      // 在菜单只展示动态路由
      // this.routers = [...accessedRouters];
    },
    async buildAsyncRoutes() {
      try {
        // 后端一次下发：用户信息 + 菜单路由树 + 按钮权限（`POST /apex/api/User/getLoginData`）
        const { routes } = await getLoginData();
        const backendRoutes = routes ?? [];

        this.asyncRoutes = transformObjectToRoute(transformBackendRoutes(backendRoutes));
        await this.initRoutes();
        return this.asyncRoutes;
      } catch (error) {
        throw new Error("Can't build routes", error as ErrorOptions);
      }
    },
    async restoreRoutes() {
      // 不需要在此额外调用initRoutes更新侧边导肮内容，在登录后asyncRoutes为空会调用
      this.asyncRoutes.forEach((item: RouteRecordRaw) => {
        if (item.name) {
          router.removeRoute(item.name);
        }
      });
      this.asyncRoutes = [];
    },
  },
});

export function getPermissionStore() {
  return usePermissionStore(store);
}
