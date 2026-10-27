// axios配置  可自行根据项目进行更改，只需更改该文件即可，其他文件可以不动
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import isString from 'lodash/isString';
import merge from 'lodash/merge';

import { ContentTypeEnum } from '@/constants';
import { useUserStore } from '@/store';
import type { Result } from '@/types/axios';

import { VAxios } from './Axios';
import type { AxiosTransform, CreateAxiosOptions } from './AxiosTransform';
import { formatRequestDate, joinTimestamp, setObjToUrlParams } from './utils';

const env = import.meta.env.MODE || 'development';

// 如果是mock模式 或 没启用直连代理 就不配置host 会走本地Mock拦截 或 Vite 代理
const host = env === 'mock' || import.meta.env.VITE_IS_REQUEST_PROXY !== 'true' ? '' : import.meta.env.VITE_API_URL;

/** Viv 业务信封的成功码（ApiResultCode.Success = 200） */
const VIV_SUCCESS_CODE = 200;

/** 需要踢回登录页的业务码：-400 Token 为空 / -401 无效 / -402 已过期 / -403 已被踢出 */
const VIV_AUTH_ERROR_CODES = [-400, -401, -402, -403];

/** 其中可以拿 refreshToken 续期的两个（-400/-403 重试没有意义） */
const VIV_REFRESHABLE_CODES = [-401, -402];

/** VivApiRequest.Version 必填（1000–9999），集中在 request 层注入 */
const VIV_API_VERSION = 1000;

/** 给请求体补 version：每个 Viv 请求基类都要求它，写在各调用点既啰嗦又容易漏（漏了直接 -201） */
function injectVivVersion(data: unknown): void {
  if (!data || typeof data !== 'object' || data instanceof FormData || Array.isArray(data)) return;

  const body = data as Recordable;
  if (body.version === undefined) body.version = VIV_API_VERSION;
}

/** 登录态失效且**可以尝试续期**：携带原始 config，刷新成功后可原样重放 */
class VivTokenExpiredError extends Error {
  constructor(public readonly config: AxiosRequestConfig) {
    super('登录已过期');
    this.name = 'VivTokenExpiredError';
  }
}

/** 刷新中的单例：并发请求同时过期时只打一次刷新接口 */
let refreshing: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  refreshing ??= useUserStore()
    .refreshSession()
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

/** 登录态失效：清本地登录态并回登录页（带上原来的地址） */
function handleAuthFailure(): void {
  // 传 false：不再回头调登出接口 —— 那个请求本身也会 -401，会绕回本函数
  useUserStore().logout(false);

  if (window.location.pathname !== '/login') {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${redirect}`;
  }
}

// 数据处理，方便区分多种处理方式
const transform: AxiosTransform = {
  // 处理请求数据。如果数据不是预期格式，可直接抛出错误
  transformRequestHook: (res, options) => {
    const { isTransformResponse, isReturnNativeResponse } = options;

    // 如果204无内容直接返回
    const method = res.config.method?.toLowerCase();
    if (res.status === 204 && ['put', 'patch', 'delete'].includes(method ?? '')) {
      return res;
    }

    // 是否返回原生响应头 比如：需要获取响应头时使用该属性
    if (isReturnNativeResponse) {
      return res;
    }
    // 不进行任何处理，直接返回
    // 用于页面代码可能需要直接获取code，data，message这些信息时开启
    if (!isTransformResponse) {
      return res.data;
    }

    // 错误的时候返回
    const { data } = res;
    if (!data) {
      throw new Error('请求接口错误');
    }

    // Viv 统一信封：code === 200 成功；-4xx 是登录态问题；其余按失败处理并透传后端文案
    const { code, message } = data as Result & { message?: string };

    if (code === VIV_SUCCESS_CODE) {
      return data.data;
    }

    const requestOptions = (res.config as Recordable)?.requestOptions ?? {};

    // -401 令牌无效 / -402 已过期：可以拿 refreshToken 续一次，交给 requestCatchHook 重放
    if (
      VIV_REFRESHABLE_CODES.includes(code) &&
      !requestOptions.skipAuthRefresh &&
      !(res.config as Recordable).__vivRetried
    ) {
      throw new VivTokenExpiredError(res.config);
    }

    // -400 没带令牌 / -403 已被踢出 / 刷新本身失败：直接踢回登录页，重试没有意义
    if (VIV_AUTH_ERROR_CODES.includes(code) && !requestOptions.skipAuthRefresh) {
      handleAuthFailure();
    }

    // 后端的 message 是给人看的（"账号或者密码错误"），直接抛给页面
    throw new Error(message || `请求失败（${code}）`);
  },

  // 请求前处理配置
  beforeRequestHook: (config, options) => {
    // 续期后的重放：url 已是绝对地址、version 已注入、params 已整形，原样发出去
    if ((config as Recordable).__vivRetried) {
      return config;
    }

    const { apiUrl, isJoinPrefix, urlPrefix, joinParamsToUrl, formatDate, joinTime = true } = options;

    // 添加接口前缀
    if (isJoinPrefix && urlPrefix && isString(urlPrefix)) {
      config.url = `${urlPrefix}${config.url}`;
    }

    // Viv 每个请求体都要 version，集中注入
    if (options.injectVivVersion !== false) {
      injectVivVersion(config.data);
    }

    // 将baseUrl拼接
    if (apiUrl && isString(apiUrl)) {
      config.url = `${apiUrl}${config.url}`;
    }
    const params = config.params || {};
    const data = config.data || false;

    if (formatDate && data && !isString(data)) {
      formatRequestDate(data);
    }
    if (config.method?.toUpperCase() === 'GET') {
      if (!isString(params)) {
        // 给 get 请求加上时间戳参数，避免从缓存中拿数据。
        config.params = Object.assign(params || {}, joinTimestamp(joinTime, false));
      } else {
        // 兼容restful风格
        config.url = `${config.url + params}${joinTimestamp(joinTime, true)}`;
        config.params = undefined;
      }
    } else if (!isString(params)) {
      if (formatDate) {
        formatRequestDate(params);
      }
      if (
        Reflect.has(config, 'data') &&
        config.data &&
        (Object.keys(config.data).length > 0 || data instanceof FormData)
      ) {
        config.data = data;
        config.params = params;
      } else {
        // 非GET请求如果没有提供data，则将params视为data
        config.data = params;
        config.params = undefined;
      }
      if (joinParamsToUrl) {
        config.url = setObjToUrlParams(config.url as string, { ...config.params, ...config.data });
      }
    } else {
      // 兼容restful风格
      config.url += params;
      config.params = undefined;
    }
    return config;
  },

  // 请求拦截器处理
  requestInterceptors: (config, options) => {
    // 请求之前处理config
    const userStore = useUserStore();
    const { token } = userStore;

    if (token && (config as Recordable)?.requestOptions?.withToken !== false) {
      // jwt token
      (config as Recordable).headers.Authorization = options.authenticationScheme
        ? `${options.authenticationScheme} ${token}`
        : token;
    }
    return config;
  },

  // 响应拦截器处理
  responseInterceptors: (res) => {
    return res;
  },

  // 响应错误处理
  responseInterceptorsCatch: (error: any, instance: AxiosInstance) => {
    const { config } = error;
    if (!config || !config.requestOptions.retry) return Promise.reject(error);

    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= config.requestOptions.retry.count) return Promise.reject(error);

    config.retryCount += 1;

    const backoff = new Promise((resolve) => {
      setTimeout(() => {
        resolve(config);
      }, config.requestOptions.retry.delay || 1);
    });
    config.headers = { ...config.headers, 'Content-Type': ContentTypeEnum.Json };
    return backoff.then((config) => instance.request(config as AxiosRequestConfig));
  },

  // 业务异常收口：登录态失效时续期一次并重放原请求，续不上才踢回登录页
  requestCatchHook: async (error) => {
    if (!(error instanceof VivTokenExpiredError)) throw error;

    const config = error.config as Recordable;
    // 先打标记再重放：第二次失败就走"踢回登录页"，不会无限续期
    config.__vivRetried = true;

    if (await refreshOnce()) {
      return request.request(config as AxiosRequestConfig);
    }

    handleAuthFailure();
    throw new Error('登录已过期，请重新登录');
  },
};

function createAxios(opt?: Partial<CreateAxiosOptions>) {
  return new VAxios(
    merge(
      <CreateAxiosOptions>{
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#authentication_schemes
        // Viv 是标准 Bearer JWT
        authenticationScheme: 'Bearer',
        // 超时
        timeout: 10 * 1000,
        // 携带Cookie
        withCredentials: true,
        // 头信息
        headers: { 'Content-Type': ContentTypeEnum.Json },
        // 数据处理方式
        transform,
        // 配置项，下面的选项都可以在独立的接口请求中覆盖
        requestOptions: {
          // 接口地址
          apiUrl: host,
          // 是否自动添加接口前缀
          isJoinPrefix: true,
          // 接口前缀留空：服务前缀（/{短名}/api）由 api/services.ts 写在每个 URL 里，
          // 全局只认网关根地址（VITE_API_URL），这样接多个服务不用改这里
          urlPrefix: '',
          // 给请求体补 version（VivApiRequest 必填）
          injectVivVersion: true,
          // 是否返回原生响应头 比如：需要获取响应头时使用该属性
          isReturnNativeResponse: false,
          // 需要对返回数据进行处理
          isTransformResponse: true,
          // post请求的时候添加参数到url
          joinParamsToUrl: false,
          // 格式化提交参数时间
          formatDate: true,
          // 是否加入时间戳
          joinTime: true,
          // 是否忽略请求取消令牌
          // 如果启用，则重复请求时不进行处理
          // 如果禁用，则重复请求时会取消当前请求
          ignoreCancelToken: true,
          // 是否携带token
          withToken: true,
          // 重试
          retry: {
            count: 3,
            delay: 1000,
          },
        },
      },
      opt || {},
    ),
  );
}
export const request = createAxios();
