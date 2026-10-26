// 只允许 pnpm 安装依赖。
// npm / yarn 会把 node_modules 装成另一种结构（拍平、不同 lockfile），
// 混用之后版本与原生二进制都可能对不上。
const agent = process.env.npm_config_user_agent ?? '';

if (!agent.startsWith('pnpm/')) {
  console.error(
    [
      '',
      '  这个项目用 pnpm 管理依赖，lockfile 只有 pnpm-lock.yaml。',
      '  请改用：pnpm install',
      '  还没装 pnpm：corepack enable  或  npm i -g pnpm',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
