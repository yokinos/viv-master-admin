import 'nprogress/nprogress.css'; // progress bar style

import NProgress from 'nprogress'; // progress bar
import { MessagePlugin } from 'tdesign-vue-next';

import router from '@/router';
import { getPermissionStore, useUserStore } from '@/store';

NProgress.configure({ showSpinner: false });

/**
 * 路由守卫。
 *
 * 目前用**静态路由**：菜单与按钮权限要接 `POST /apex/api/User/getLoginData`（按 AppId 下发路由树），
 * 那一步等菜单管理做起来再接 —— 现在去请求 `getMenuList` 只会打到不存在的 mock 接口，导致登录后立刻被踢回来。
 */
router.beforeEach(async (to, from, next) => {
  NProgress.start();

  const permissionStore = getPermissionStore();
  const { whiteListRouters } = permissionStore;
  const userStore = useUserStore();

  if (!userStore.token) {
    if (whiteListRouters.includes(to.path)) {
      next();
    } else {
      next({ path: '/login', query: { redirect: to.fullPath } });
    }

    NProgress.done();
    return;
  }

  if (to.path === '/login') {
    next();
    NProgress.done();
    return;
  }

  // 登录信息在 login 时已缓存（刷新由持久化恢复），这里不需要再请求
  try {
    await userStore.getUserInfo();

    // 动态路由按后端菜单树注册（POST /apex/api/User/getLoginData）
    if (permissionStore.asyncRoutes.length === 0) {
      const routeList = await permissionStore.buildAsyncRoutes();
      routeList.forEach((item) => router.addRoute(item));

      // 路由刚加进来，要重新导航一次才能命中（否则这次仍是 404）
      next({ ...to, replace: true });
      return;
    }

    next();
  } catch (error) {
    // 菜单拉不到不挡路：静态路由照常可用，把原因喊出来
    MessagePlugin.warning((error as Error).message);
    next();
  } finally {
    NProgress.done();
  }
});

router.afterEach((to) => {
  // 进登录页即视为退出（原行为）；守卫里已判断过 token，这里不会和 401 处理互相触发
  if (to.path === '/login') {
    const userStore = useUserStore();

    userStore.logout(false);
    getPermissionStore().restoreRoutes();
  }

  NProgress.done();
});
