interface ImportMetaEnv {
  readonly VITE_IS_REQUEST_PROXY: string;
  /** 网关根地址，如 http://localhost:5262；同源反代部署时留空 */
  readonly VITE_API_URL: string;
  /** 客户端对外标识，对应 AtClientApp.AppKey */
  readonly VITE_VIV_APP_KEY: string;
  /** EmUserType：Master=0 / OrgUser=1 / CompanyUser=2 / TenantUser=3 */
  readonly VITE_VIV_USER_TYPE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
