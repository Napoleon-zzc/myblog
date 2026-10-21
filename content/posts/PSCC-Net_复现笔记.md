+++
title = 'PSCC-Net 复现笔记（2026-10-20）'
date = '2026-10-20T16:00:00+08:00'
draft = false
+++

# 

## 论文信息

- **标题**：PSCC-Net: Progressive Spatio-Channel Correlation Network for Image Manipulation Detection and Localization
- **作者**：Xiaohong Liu, Yaojie Liu, Jun Chen, Xiaoming Liu
- **出处**：IEEE TCSVT, vol. 32, no. 11, pp. 7505–7517, 2022
- **DOI**：10.1109/TCSVT.2022.3189545
- **代码**：https://github.com/proteus1991/PSCC-Net（MIT 协议，权重内置于仓库）

## 一句话

用「HRNet 多尺度骨干 + 由粗到细渐进式 mask + 空间/通道相关性模块(SCCM) + 独立分类头」，同时做图像篡改**检测**（真/假二分类）与**定位**（篡改区域 mask）。

## 运行环境（本机，无 GPU）

- Python 3.11（uv 管理）+ torch 2.5.1+cpu + numpy / yacs / imageio / pillow
- 代码目录：`C:\Users\123\Desktop\Papers\PSCC-Net\`
- 虚拟环境：`C:\Users\123\Desktop\Papers\.venv\`

## 跑通步骤

1. 下载代码 + 3 个权重（`checkpoint/{HRNet,NLCDetection,DetectionHead}_checkpoint/*.pth`）+ 12 张 `sample/` 样例图。
2. 装依赖（torch 用阿里云镜像，快）：
   `uv pip install --python .venv\Scripts\python.exe --index-url https://mirrors.aliyun.com/pypi/simple "torch==2.5.1"`
3. 打了 4 个兼容性补丁（原代码只支持 Linux + CUDA + 旧 numpy）：
   - `test.py`：CUDA→CPU、去掉 3 处 `nn.DataParallel`、`num_workers=0`、`map_location='cpu'`；
   - `utils/utils.py`：`save_image` 用 numpy+imageio 替代 torchvision，并用 `os.path.basename` 修 Windows 反斜杠路径；
   - `models/seg_hrnet.py:303`：`np.int` → `int`（numpy 2.x 已删除该别名）。
4. 运行：`cd PSCC-Net` → `..\.venv\Scripts\python.exe test.py`

## 结果（12 张样例图，全部判定正确）

| 类型                 | 数量 | 判定      | 结果  |
| -------------------- | ---- | --------- | ----- |
| authentic（真实）    | 6    | authentic | ✅ 6/6 |
| copymove（复制移动） | 2    | forged    | ✅ 2/2 |
| removal（内容移除）  | 2    | forged    | ✅ 2/2 |
| splice（拼接）       | 2    | forged    | ✅ 2/2 |

输出：`PSCC-Net\mask_results\` 下 12 张定位热力图（真实图接近全黑，伪造图有定位内容）。

## 一言以蔽之

> 复现了 PSCC-Net（IEEE TCSVT 2022），它在 HRNet 骨干上做多尺度渐进式定位 + 空间/通道相关性 + 独立分类头。官方代码在 CPU 上跑通 12 张样例（6 真 / 6 假）全部判对，并生成了定位 mask。
