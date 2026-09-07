# 落魄的作家 · AI 接力

独立 SillyTavern 扩展，版本 1.0.0。仅提供 AI 接力，不包含“问作者”。

## 使用

打开悬浮笔尖按钮，填写“用户要发送的话”和可选的“给作家的要求”。人称、扩写、润色、情绪、搞笑、人前显圣、战斗、描写等选项共同生效。先生成可编辑预览，再选择放入酒馆输入框或明确发送。

“给作家的要求”会单独注入正文生成，不变成角色台词。要求按聊天保存并持续生效，清空后停止注入。生成预览本身不写成已发生的世界事件，用户发送后才成为正文输入。不会让手机后台把未确认草稿写入 Anima。

## GitHub 安装

将本目录的内容上传到一个独立 GitHub 仓库，确保 `manifest.json` 位于仓库根目录。再把该仓库地址粘贴到 SillyTavern 的“安装扩展”。目前安装包已准备好，但没有替你创建或推送远程仓库。

不要把本目录放进 phone-bridge 仓库的子目录来代替独立安装；两个扩展分开维护。

进入已安装的 AI 接力扩展目录，执行：

```sh
sh install-server.sh /home/www/SillyTavern2
```

开启 SillyTavern `config.yaml` 的 `enableServerPlugins: true`，完整重启。服务端目录是 `plugins/writer-ai-relay-server`，与手机服务端相互独立。Windows 用户可手动将 `server-plugin/writer-ai-relay-server` 复制到酒馆 `plugins` 目录后重启。

## API 设置

展开“独立 API 设置”，填写地址、Key 和模型。支持保存、拉取模型、手填模型及测试连接，使用 OpenAI-compatible Chat Completions 接口。模型列表不可用时仍可手填模型。

接力 API 不使用小手机发送或实时更新配置。密钥保存在服务器 `data/default-user/writer-ai-relay/config.json`，浏览器只收到“已保存”标志。此配置用于个人单用户酒馆，不适合互不信任的多人共享服务。

## 更新与测试

前端更新后，在扩展目录执行 `sh update.sh /home/www/SillyTavern2`，再完整重启酒馆。不要把数据目录、API Key 上传 GitHub。

```sh
npm test
npm run check
```

生成效果受所选模型影响。已测试预览、编辑、模型列表、插入和发送的浏览器流程；你的真实 API 仍需在设置中测试连接。
