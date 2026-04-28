# Convolution Visualization

一个纯前端的图像卷积可视化工具，用于演示 CNN 卷积核在图像处理中的效果。

## 功能

- 本地上传 JPG/PNG 图片并显示原图
- 3x3 卷积核输入面板，支持浮点数
- 输入后实时计算并展示卷积结果（灰度卷积）
- 预设卷积核：Sobel、Blur、Sharpen、Laplacian
- 一键重置（清空图片、恢复默认卷积核、清空结果）

## 本地运行

这是纯静态项目，直接双击 `index.html` 即可打开，或使用任意静态服务：

```bash
# 例如使用 Python
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 部署到 GitHub Pages（公网访问）

1. 新建 GitHub 仓库并推送当前代码到 `main` 分支。
2. 进入仓库 `Settings` -> `Pages`：
   - Build and deployment 选择 `GitHub Actions`。
3. 推送后会自动触发 `.github/workflows/deploy.yml`。
4. 部署完成后可在 Actions 或 Pages 页面看到公网地址：
   - `https://<你的GitHub用户名>.github.io/<仓库名>/`

## 验收对应

- 上传并显示图片：已支持
- 输入卷积核并处理：已支持
- 实时显示卷积结果：已支持
- 至少 3 种预设卷积核：已支持 4 种
- 页面可公网访问：已提供 GitHub Pages 自动部署
