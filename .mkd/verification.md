# SDK 产品化优化实施记录

- 本轮按用户确认范围实施代码、文档与发布准备，保留既有自动化回归；新增跨浏览器、移动端、真实 tgz、性能及辅助技术验收留待后续，实际 npm 发布未执行。
- 多入口 ESM 提供 core、markdown、charts、models、icons/streamline；Markdown 依赖外置，字体构建依赖转为 devDependencies。基础样式不再内嵌字体，独立 WOFF2 与可选字体 CSS 随包分发，四用例显式导入完整字体。
- 自有代码采用用户确认的 MIT，第三方许可保留。prepack 重建库，包白名单纳入分块及字体并排除 example 制品。
- 已实现自动聚焦配置、滚动宿主及跟随模式、场景参数、本地化、补全语义、打字机跳过及整段播报、主题变量、命令状态与错误通道、清理栈、批量／文本流输出、历史缓存和输入历史控制。
- 提供 templates/starter、docs/api.md、docs/compatibility.md、docs/releasing.md、CHANGELOG 与 GitHub 检查及受保护发布配置。仓库无 remote，repository／homepage／bugs 留待维护者填写，发布脚本对此作阻断检查，未填写虚构地址。
- npm run check 通过：49 单元、38 开发页 Chromium、4 生产测试，含严格类型、中文注释、库及四用例构建和扩充的公开声明消费。日志 /tmp/lunarkit-sdk-final-check.log。
- 基础 CSS 构建产物 6920 字节，gzip 2030 字节；字体独立托管。此数值为本地构建产物大小，不代表尚未执行的页面加载性能验收。
- 用户已有 README 中 do depart 文案修改保留。

# 场景过渡与抵达流程修订验收

- SDK 新增可取消的 `context.nextScene()`，以零历史行数的分页空间保留此前输出；240ms 缓出滚动结束后才允许下一段打字机输出，减少动态效果时立即对齐。动态收敛尾部空间，输入恢复保持当前场景起点。
- SDK 新增 `inputBottomSpace`，默认 96px，覆盖长输入、补全菜单和视口变化；保留前三个用例的原有行为。过场取消、销毁及会话切换终止原任务，迟到输出隔离。
- 飞船由中央大长方体及两侧细长长方体组成，深色背景并按面法线接受方向光照。查看桌面 dashboard、320px 星球详情及抵达场景截图，旧内容在抵达截图中已完整离开视口。
- 二十个图标来自 Iconify 分发的 Streamline Sharp 免费集中 Solid 子集，CC BY 4.0 元数据与官方开源许可声明已核对；保留来源、别名映射、改动说明和许可链接，about 提供 Streamline 署名。部分图标使用相近免费符号。
- 离港及每次 travel 先过场，再逐字输出消息及事件。抵达回合保留待决事件，结算且存活后再过场并自动展示目的地；可选 arrivalPending 字段兼容旧存档并支持显式保存后刷新恢复。
- Chromium 采样打字机文本出现时前一场景末端坐标，确认均已在视口上方；覆盖离港、非抵达事件、抵达顺序、暂停保存刷新、过场优先暂停、输入及候选底部留白。
- 独立审查发现过场期间切换会话可能导致原任务继续写入新流，已在视图切换时取消原运行态，并添加打开及关闭视图的回归测试。
- `npm run check` 全通过：49 单元测试、38 开发页 Chromium、4 生产产物 Chromium，以及类型、ESLint、中文注释、四用例构建及 NodeNext 消费检查。日志：`/tmp/lunarkit-scenes-final-check.log`。
- `npm audit` 为 0 vulnerabilities；`npm pack --dry-run` 包含图标许可；mkd lint、格式、build 和 fourth_stage 检查通过。

# 柱状图入场修订验收

- 柱体使用独立 SVG 分组从共同基线向上生长，坐标轴保持静态，柱宽保持原值；进度条保留横向动画。
- `animate: false` 和减少动态效果偏好均支持静态显示。
- 类型、ESLint、中文注释检查通过；图形单元测试 6 项及柱体动画 Chromium 回归测试通过。浏览器按动画时间采样，验证柱宽、基线和坐标轴变换。
- `mkd lint --all` 与 `mkd build --check` 通过。

# 第一阶段验收记录

## 交付范围

- `development.mf`：严格 TypeScript、职责化目录、中文单行注释规则、公开消费接口与检查命令。
- `first-example.mf`：纯浏览器流式终端、白底黑字 Kode Mono Medium、LunarKit 大字 banner、原样 echo。
- 默认内容区水平居中、最大宽度 1080px；`paddingInline` 与 `maxWidth` 支持像素数值及 CSS 长度字符串。
- `example/src/main.ts` 使用公开 API，Enter 提交，所有输入原样打印。

## 已执行验证

- `npm run check` 通过：严格类型检查、ESLint、中文注释检查、9 项单元测试、库与 example 构建、NodeNext 构建产物类型消费检查、14 项 Chromium 测试。
- 单元测试覆盖历史边界、草稿恢复、空白与 HTML 纯文本、输入法组合态、实例独立及销毁、布局参数。
- Chromium 测试覆盖自动聚焦、本地字体与主题、默认居中、换行光标坐标、原生剪贴板多行粘贴、各种文本原样回显、历史编辑、组合输入事件、窄屏溢出及减少动态效果。
- 已查看 `test-results/echo-desktop.png`，首屏为白底、LunarKit 大字、prompt 与光标；移动端截图保存在 `test-results/echo-mobile.png`。截图属于本地验收产物，不提交 Git。
- `npm audit`：0 vulnerabilities。开发工具 minimatch 暂时覆写为 `^11.0.1`，原因见 README。
- `npm pack --dry-run`：包含库 JS、类型、样式、README 与字体许可；排除 example 制品。
- `mkd lint --all`、`mkd build --check`、`mkd target first_stage --check`、全部 MF 的格式检查通过。

## 光标及字体修订

- 默认 prompt 改为 `❯`；块状光标高度等于字号，在行内居中，覆盖右侧完整字素，末尾及空输入为半角宽。
- 打包 Noto Sans SC Medium 中文及 Noto Sans Symbols 2 提示符字体，与 Kode Mono 统一 ascent、descent、line-gap；提示符专用字体优先于中文字体。
- `src/theme/fonts.css` 由 `npm run generate:fonts` 生成，保留 Unicode 分片及 WOFF2，所有字体许可证随包分发。
- 新增 Chromium 测试覆盖中文字高、实际字体栈选择、字形墨迹中心、全半角、emoji 字素簇、组合字符、末尾及空输入、多行及字号变化、选区隐藏。
- 已查看中文块状光标与中文末尾截图，新增 `test-results/caret-bundled-font-alignment.png` 验证中英文及提示符同排的视觉效果。
- 独立审查发现中文字体抢先匹配提示符，已调整字体栈优先级并增加实际字体栈与专用字体宽度比对测试。

## 光标空闲闪烁修订

- 移动、编辑、粘贴和历史导航时光标立即常亮；最后一次操作 550ms 后恢复闪烁，每次操作重新计时。
- 输入法组合期间持续常亮，结束组合后重新等待空闲；失焦与实例销毁均清理空闲计时器。
- 新增浏览器虚拟时钟测试覆盖连续移动、输入、历史切换、组合输入、失焦及重新聚焦、减少动态效果；新增单元测试验证销毁后计时器释放。
- `npm run check` 全部通过：9 项单元测试、14 项 Chromium 测试以及类型、注释规范、构建和 NodeNext 消费检查。

## 第二阶段验收

- `second-example.mf` 新增命令终端、Tab 补全、只读挂载文件集及 example2 的验收边界。
- `createTerminal` 新增 commands 模式、DOM 原节点输出和 interrupt；`CommandContext` 提供 args、AbortSignal 与有取消隔离的 write。
- `createTextFiles` 提供相对路径文件集的 list、read、complete，支持惰性文本加载和取消；校验挂载边界、重复路径及文件目录冲突。
- example2 初始只显示输入行，help 输出 Lunar / Kit 右对齐大字、细竖线与英文介绍及命令注解；ls 列出挂载根目录，cat 读取一个相对文件名。
- example2/files/ 中包含普通文本、中文、空文件、空格文件名与嵌套目录；通过 Vite glob 在开发和静态构建后惰性读取。
- Tab 支持命令、文件路径、引号参数、公共前缀及歧义列表；Ctrl+C 中断任务或取消草稿，选区保持复制能力，上下历史保留原始输入。
- `npm run check` 全部通过：17 项单元测试、18 项开发页 Chromium 测试、2 项生产产物 Chromium 测试，以及类型、ESLint、中文注释规范、库和两个用例构建、NodeNext 消费检查。
- 新增运行态单元测试验证串行执行、取消信号、迟到结果隔离；终端测试验证 DOM 原节点输出、销毁取消及消费模式冲突。
- 开发与生产浏览器测试均挂起文本模块请求，验证 Ctrl+C 后新命令正常执行及迟到文件结果被过滤。
- 独立审查指出的公共前缀按 UTF-16 截断问题已改为按完整字素计算，并补充两个 emoji 候选的回归测试。
- 已查看 example2 help 的桌面与 320px 窄屏截图，保持两列和竖线且无横向溢出；截图位于本地 test-results/。
- `npm audit` 为 0 vulnerabilities；`npm pack --dry-run` 包含新增公开声明与库代码，排除两个 example 的构建产物。

## 第三阶段验收

- 用户确认目录结构采用 example/example1、example/example2、example/example3；Vite 入口、构建输出、类型与注释检查均同步更新。
- SDK 仅新增通用的 CommandContext.read/present/setPrompt、terminal.setPrompt、InteractivePanel 生命周期、showLoading 及 renderMarkdown。
- 账号、公开演示密码、用户工作区与 admin 挂载、九个命令、登录与读取延迟、欢迎文案、minivim 及其键位放在 example/example3/src/，SDK 导出不包含模拟服务器或其文件系统。
- example3 提供 whoami、cd、login、ls、cat、minivim、pwd、help、exit；guest 使用八位随机摘要。登录与文件修改仅在本页面内存存在。
- 登录包含 3 秒字符 spinner、用户名输入、秘密密码输入及 LunarService 欢迎消息；cat 包含进度条和安全 Markdown 渲染。
- minivim 的流内窗口最多 15 行，支持 hjkl、i/a、Esc、:w/:q/:wq/:q!；admin 写入挂载文件后，用户登录读取到同一份修改。
- npm run check 通过：24 项单元测试、22 项开发页 Chromium 测试、3 项生产产物测试，以及严格类型、ESLint、中文注释、库与三个用例构建、NodeNext 消费检查。
- 独立审查发现的秘密选区复制、启动焦点回调中取消、销毁抢占外部焦点和编辑器首行为空的移动问题均已修复，补充了对应单元及浏览器用例。
- 秘密输入不进入镜像、输出和历史；取消时清空原生输入值，拦截秘密值的复制剪切；面板取消与销毁释放资源。
- 文档渲染测试验证脚本按字面量显示，危险链接移除，外部图片元素过滤，标题最大 1.5em。
- 已查看 example3-session.png 和 example3-minivim.png，确认流内欢迎语、Markdown 与编辑窗口；截图是 test-results/ 的本地产物。
- npm audit 为 0 vulnerabilities；已有 echo 与文件命令用例继续通过回归。

## 加载输入及编辑器光标修订

- SDK 增加可选 busyInput 策略，默认 editable 保持既有消费行为；example3 使用 hidden，加载期间输入行隐藏且禁用，当前终端容器持有 Ctrl+C 取消入口，提问期间显示回答行。
- login 先收集用户名和秘密密码，校验失败立即返回错误；校验通过后才开始 3 秒 spinner，完成后建立演示登录状态。
- example3 prompt 显示用户名和当前工作区路径，登录、cd、exit 后更新，历史标签保持提交时状态。
- minivim NORMAL 使用独立自绘块状光标，按完整字素测量宽度并扣除内部滚动；INSERT 使用原生竖线；Esc、命令行退出、焦点变化均同步可见性，镜像及监听在关闭时释放。
- 独立审查发现的异步结束抢占外部焦点、面板结束后继续加载失去取消焦点问题已修复；加入外部焦点保持及面板后续加载取消的单元回归。
- npm run check 全部通过：26 项单元测试、23 项开发页 Chromium 测试、3 项生产产物测试，包含中英文方块宽度、插入模式切换、滚动光标位置、加载禁用输入、加载取消及静态登录链路。

## 焦点轮廓、秘密提问记录与历史容量修订

- 加载时终端容器保留取消焦点，轮廓设为透明视觉状态；链接及编辑器沿用各自的焦点规则。
- 秘密回答提交后保留原提问标签及空白答案，登录失败信息作为独立下一行输出；密码值仅交给命令处理器。
- 新增输出及原地更新后合并到下一布局帧滚动：可见输入行时定位输入行，隐藏时定位最后输出；监听富内容及终端尺寸变化，销毁时断开监听并取消待执行帧。
- 面板内部镜像与光标变化保留当前页面位置；窄高视口回归验证编辑位置保持可见。
- SDK maxHistoryLines 默认 500，支持正安全整数配置，统计输出流逻辑行；页面保持自然高度，命令输入历史继续独立管理。旧记录整条删除，超长纯文本保留末尾，富内容保留完整最新节点，活跃加载及面板在结束后重新参与裁剪。README 说明了容量统计及特殊节点处理。
- 独立审查指出 Markdown 块间排版空白重复计行、跨窗口 HTMLElement 判断失效和编辑器内部更新抢滚动，均已修复并增加回归。
- npm run check 全部通过：31 项单元测试、26 项开发页 Chromium 测试、3 项生产产物测试，以及严格类型、规范检查、构建和公开声明消费检查；npm audit 为 0 vulnerabilities。
- mkd lint --all、mkd build --check、mkd target third_stage --check 通过，已核查第三阶段依赖图。

## 第四阶段：LuanrMerchant

- SDK 提供 context.choose、typewrite、环形饼图、图形进度条、柱状图、折线图和接受通用网格的旋转字符三维渲染；OutputComponent 的 dispose 随历史淘汰与终端销毁调用，屏幕外及后台页面暂停旋转。
- 命令可声明 interruptRunning，终端通过 priorityCommand 映射面板期间的键入。example4 将 pause 设为优先命令；取消原交互后进入 Save / Continue / Exit，Save 后仍保持暂停。
- example/example4/ 完整实现六个命令、十颗星球完全图、十种特产、二十道具、三十事件、港口交易与随机航行；游戏内容、随机状态、存档、模型、图标、布局均位于消费端。
- 三个 localStorage 槽位支持显式保存、刷新继续和待决策事件恢复；读取校验版本、资源、标识、装备与市场结构，持久化失败时保留本页副本并提示。存活回合、现金、航线与货物残值组成分数。
- 根据用户截图反馈重排 fetch：默认只展示放大飞船、两枚资源环图和顶部对齐的数值及道具；资金折线移至 fetch history，货舱图移至 fetch cargo 且仅展示持有商品。独立布局测试检查两列顶点相同、默认高度小于 440px 和 320px 窄屏宽度。
- 已查看桌面 dashboard 和窄屏道具、星球截图；默认 dashboard 使用标签/数值网格，去掉原先底部大块图表与长图例。截图位于本地 test-results/，生产测试可能清理该目录。
- 独立审查发现继承属性商品名可能污染资金、优先命令输入残片跨交互保留的问题；已通过商品定义及自有属性校验和交互边界清空修正，加入回归。
- npm run check 全部通过：41 项单元测试、30 项开发页 Chromium 测试、4 项生产产物测试，包含完整类型、ESLint、中文注释、四个用例构建和 NodeNext 消费验证。
- npm audit 为 0 vulnerabilities；mkd lint --all、mkd build --check、mkd target fourth_stage --check 通过，已生成依赖图核对第四阶段与前序能力的关系。
- 参考网页显示 Loader 说明与空白预览区域，当前环图为依据需求制作的黑圈旋转入场；本机 fetch 帮助中的字符明暗与旋转参数为三维效果参考。长期经济平衡仍可根据实际游玩数据迭代。

## 第四阶段交互与视觉修订

- SDK createIcon 内置二十种统一线宽的单色 SVG 图标，具备尺寸及可访问标签；example4 通过道具到图标名字的映射消费。
- SDK openView 使用独立输出流保存父记录、提示符和公开草稿，close 恢复父视图；关闭及销毁释放视图组件。example4 在槽位选择完成后进入游戏视图，退出及结算时恢复主界面。
- 补全支持带概要的结构化候选，提示在输入行下方临时菜单展示，连续 Tab 循环、Shift+Tab 反向、Escape 或编辑关闭。example4 按游戏状态和参数位置筛选 do，depart 目标为星球，travel 参数给出明确格式提示。
- 流内选择使用黑白焦点提示，限高列表内部导航保持焦点选项可见，列表出现时滚动到末尾；确认后保留原列表高度及选中记录，异步清理后恢复输入焦点。
- fetch 使用长方体飞船、大尺寸粗线环图和下方资源数值；所有查询分支统一调用 typewrite。动态模型及 SVG 由各自渲染器持有，打字机管理文字揭示与图形可见性；星球使用深色背景和基于面法线的方向光照，暗面仍参与遮挡。
- 每颗星球固定供应三种道具，市场列表、购买选择、直接购买及补全共同消费供应定义；保留原存档结构。
- 独立审查发现选择滚动混用 offsetTop 坐标和子指令可购买性判断偏宽，已改为面板相对矩形计算和按实际价格及装备条件筛选；测试覆盖 End/Home 导航中的焦点可见性。
- npm run check 全部通过：43 项单元测试、32 项开发页 Chromium 测试、4 项生产产物测试，以及严格类型、中文注释、ESLint、构建和 NodeNext 消费检查。npm audit 为 0 vulnerabilities，mkd lint/build/第四阶段目标检查通过。
- 已查看桌面 dashboard 与 320px 星球详情截图，确认长方体、环图下方数值、图标和星球亮暗面；可通过 npm run dev:example4 进行真实浏览器体验复核。

## 审查及边界

独立审查指出的换行光标插入断点与 NodeNext 声明扩展名问题已经修正，并补充对应测试。中文输入法边界通过合成组合事件验证；各操作系统真实候选窗口体验仍可手动复核。当前自动化浏览器覆盖 Chromium。

命令映射、Tab 补全、DOM 输出节点以及消费端的 help/ls/cat 已由第二阶段交付。Context 和更丰富的组件生命周期等能力留待后续阶段，`start` 保留完整愿景。
