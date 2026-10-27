import cloneDeep from 'lodash/cloneDeep';

import type { BackendRouteItem } from '@/api/model/apex/userModel';
import type { RouteItem } from '@/api/model/permissionModel';
import {
  BLANK_LAYOUT,
  EXCEPTION_COMPONENT,
  IFRAME,
  LAYOUT,
  PAGE_NOT_FOUND_ROUTE,
  PARENT_LAYOUT,
} from '@/utils/route/constant';

/**
 * 后端路由树 → starter 的 RouteItem。
 *
 * 后端（`VueMenuRouteAdapter`）给的就是 Vue Router 形状，这里只做两件事：
 * ① `meta.title` 是纯字符串，转成 starter 的多语言对象（两种语言先同文案，等 i18n 接菜单再说）；
 * ② 补 `name`：后端没配 name 时从 path 生成，vue-router 要求同级唯一。
 */
function toLocalizedTitle(title?: string) {
  return title ? { zh_CN: title, en_US: title } : undefined;
}

function nameFromPath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\W+/g, '-') || 'root';
}

export function transformBackendRoutes(nodes: BackendRouteItem[]): RouteItem[] {
  return nodes.map((node) => {
    const children = node.children?.length ? transformBackendRoutes(node.children) : undefined;

    const item = {
      path: node.path,
      name: node.name || nameFromPath(node.path),
      // 目录节点后端固定给 LAYOUT；叶子节点是 /pages 下的相对路径
      component: node.component || 'LAYOUT',
      redirect: node.redirect,
      meta: {
        title: toLocalizedTitle(node.meta?.title),
        icon: node.meta?.icon,
        hidden: node.meta?.hidden ?? false,
        keepAlive: node.meta?.keepAlive ?? true,
        orderNo: node.meta?.orderNo,
      },
      ...(children ? { children } : {}),
    } as RouteItem;

    return item;
  });
}

// 动态从包内引入单个Icon,如果没有网络环境可以使用这种方式 但是会导致产物存在多个chunk
// const iconsPath = import.meta.glob('../../../node_modules/tdesign-icons-vue-next/esm/components/*.js');

// async function getMenuIcon(iconName: string): Promise<string> {
//   const RenderIcon = iconsPath[`../../../node_modules/tdesign-icons-vue-next/esm/components/${iconName}.js`];

//   const Icon = await RenderIcon();
//   return shallowRef(Icon.default);
// }

const LayoutMap = new Map<string, () => Promise<typeof import('*.vue')>>();

LayoutMap.set('LAYOUT', LAYOUT);
LayoutMap.set('BLANK', BLANK_LAYOUT);
LayoutMap.set('IFRAME', IFRAME);

let dynamicViewsModules: Record<string, () => Promise<Recordable>>;

// 动态引入路由组件
function asyncImportRoute(routes: RouteItem[] | undefined) {
  dynamicViewsModules = dynamicViewsModules || import.meta.glob('../../pages/**/*.vue');
  if (!routes) return;

  routes.forEach(async (item) => {
    const { component, name } = item;
    const { children } = item;

    if (component) {
      const layoutFound = LayoutMap.get(component.toUpperCase());
      if (layoutFound) {
        item.component = layoutFound;
      } else {
        item.component = dynamicImport(dynamicViewsModules, component);
      }
    } else if (name) {
      item.component = PARENT_LAYOUT();
    }

    // 动态从包内引入单个Icon,如果没有网络环境可以使用这种方式 但是会导致产物存在多个chunk
    // if (item.meta.icon) item.meta.icon = await getMenuIcon(item.meta.icon);

    children && asyncImportRoute(children);
  });
}

function dynamicImport(dynamicViewsModules: Record<string, () => Promise<Recordable>>, component: string) {
  const keys = Object.keys(dynamicViewsModules);
  const matchKeys = keys.filter((key) => {
    const k = key.replace('../../pages', '');
    const startFlag = component.startsWith('/');
    const endFlag = component.endsWith('.vue') || component.endsWith('.tsx');
    const startIndex = startFlag ? 0 : 1;
    const lastIndex = endFlag ? k.length : k.lastIndexOf('.');
    return k.substring(startIndex, lastIndex) === component;
  });
  if (matchKeys?.length === 1) {
    const matchKey = matchKeys[0];
    return dynamicViewsModules[matchKey];
  }
  if (matchKeys?.length > 1) {
    throw new Error(
      'Please do not create `.vue` and `.TSX` files with the same file name in the same hierarchical directory under the views folder. This will cause dynamic introduction failure',
    );
  } else {
    console.warn(`Can't find ${component} in pages folder`);
  }
  return EXCEPTION_COMPONENT;
}

// 将背景对象变成路由对象
export function transformObjectToRoute<T = RouteItem>(routeList: RouteItem[]): T[] {
  routeList.forEach(async (route) => {
    const component = route.component as string;

    if (component) {
      if (component.toUpperCase() === 'LAYOUT') {
        route.component = LayoutMap.get(component.toUpperCase());
      } else {
        route.children = [cloneDeep(route)];
        route.component = LAYOUT;
        route.name = `${route.name}Parent`;
        route.path = '';
        route.meta = route.meta || {};
      }
    } else {
      throw new Error('component is undefined');
    }

    route.children && asyncImportRoute(route.children);

    // 动态从包内引入单个Icon,如果没有网络环境可以使用这种方式 但是会导致产物存在多个chunk
    // if (route.meta.icon)
    // route.meta.icon = await getMenuIcon(route.meta.icon);
  });

  return [PAGE_NOT_FOUND_ROUTE, ...routeList] as unknown as T[];
}
