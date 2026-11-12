# npm 发布准备

## 当前状态

包名为 lunarkit，版本维持 package.json 中的 0.1.0。当前修改属于未发布优化；版本在维护者批准发布时更新。Git remote 已配置为 Moonhalf383/lunarkit，package.json 已补齐对应的 repository、homepage 和 bugs。

代码 MIT，字体 SIL OFL，Streamline 图标 CC BY 4.0。使用图标的应用需要署名及许可链接，见 THIRD_PARTY_LICENSES/Streamline-Sharp.txt。

## 发布前配置

1. 核实 npm 包名是否归当前账号所有，或决定组织 scope；确认后同步 README、模板及消费入口。
2. 核对现有 Git remote 与 package.json 的 repository、homepage、bugs 是否仍与目标仓库一致。
3. 在 npm 配置与仓库及 workflow 对应的 Trusted Publisher。首次创建包与账号认证按 npm 官方步骤完成。
4. GitHub 创建受保护的 npm-release Environment，设置维护者审批。仓库变量 NPM_PUBLISH_ENABLED 必须显式设为 true 才能启用发布 job。
5. Node 24、npm 至少 11.5.1，使用 GitHub-hosted runner 与 id-token:write。公开仓库及包的 OIDC 发布按 npm 支持条件生成 provenance。

## 版本策略

- 预览版本如 0.2.0-next.0，通过 next 标签发布。
- 稳定版本如 0.2.0，经批准使用 latest 标签。
- package.json 默认 publishConfig.tag 为 next，降低意外覆盖稳定标签的风险。
- 提交对应 CHANGELOG 和版本，创建匹配标签；每个版本内容不可覆写，修复通过新版本交付。
- 核心生命周期、资源契约、可选模块入口稳定并获得外部消费反馈后再规划 1.0。

## 流程

CI 运行 npm run check、三引擎 SDK 专项及真实 tgz 消费检查，安装 Chromium／Firefox／WebKit 和系统依赖。prepack 每次 npm pack／publish 前重建库与字体资产，减少旧 dist 误发。手动 release workflow 运行现有检查，并在显式变量、受保护 Environment 和维护者操作后发布；本轮只配置文件，不调用 npm publish。

真实 tgz 临时项目安装、模板生产运行、框架挂载卸载、SSR 占位输出与性能资源样本已加入自动检查。WebKit 本机缺系统依赖，需查看新 CI；Firefox 初始化稳定性、真实移动设备／输入法／辅助技术和目标设备性能预算仍需跟进。检查步骤与覆盖边界见 [acceptance.md](acceptance.md)。发布成功后还需从 npm registry 安装实际版本进行冒烟测试。

首次确认发布前，维护者应审阅包内容及许可证。发布步骤遵循 npm 官方文档：

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/cli/v11/using-npm/scripts/

npm 凭据与 OIDC 绑定均由维护者配置，不写入源码。
