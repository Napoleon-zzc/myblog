+++
date = '2026-10-17T17:46:34+08:00'
draft = false
title = 'HTML笔记'
+++

## HTML

### 1.什么是HTML？

HTML是HypeText Mark-up Language的简称，即超文本标记语言，是一种用于创建网页的标准标记语言。可以使用 HTML 来建立自己的网页，HTML 运行在浏览器上，由浏览器来解析。它不是一种编程语言（如java、C语言等），标记：就是标签。<标签名称></标签名称>。

白话：用**来写网页的一门语言，有很多标签组成**

> 所谓的超文本：
>
> 1、因为网页可以放图片、视频、音频等内容（超越文本限制）
>
> 2、还可以在网页中跳转到另一个网页中（超链接文本）

### 2.HTML的作用

用来开发**网页**

- 许多网络攻击（如 **XSS（跨站脚本）、SQL 注入、CSRF（跨站请求伪造）**）都针对 HTML 和 Web 技术。
- 攻击者利用 HTML 结构注入恶意代码
- **HTML 是 Web 安全的底层基础**，学习它不仅能帮助理解攻击手法，还能提升防御能力。无论是漏洞挖掘、渗透测试还是安全开发，HTML 知识都是必备技能。

### 3.网页的组成部分

- HTML：负责网页的架构；(骨架)
- CSS：负责网页的样式，美化；（衣服）
- JavaScript（JS）：负责网页的行为；（动作）

### 4.工具介绍

这里我们使用工具，phpstorm

![image-20260408132925899](https://gitee.com/lao-jiang-next-door/images/raw/master/image-20260408132925899.png)

#### HTML文件的命名

- HTML文件的文件后缀名为.html
- 文件名中不要包含特殊符号，如空格、$等。

### 5.结构介绍

这个尖括号 就叫标签

1. 生成结构

phpstorm会自动帮我们生成html结构

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>

</body>
</html>
```

什么叫标签

2. 结构详情介绍
- html由标签和属性构成。
- 标签：长在尖角号后面的第一个单词就是标签
- 属性：长在标签后面的并且用空格隔开的，称作 属性
- 结构标签介绍

![企业微信截图_17159486448134](https://gitee.com/lao-jiang-next-door/images/raw/master/企业微信截图_17159486448134.png)

```html
<!-- 声明文档类型为 HTML5，告诉浏览器按标准 HTML 解析 -->
<!DOCTYPE html>

<!-- 根标签，整个网页所有内容都要写在里面 -->
<!-- lang="en" 表示网页语言为英文 -->
<html lang="en">

<!-- 头部标签，存放网页配置信息，不在页面上显示 -->
<head>
    <!-- 设置网页字符编码为 UTF-8，防止中文乱码 -->
    <meta charset="UTF-8">
    <!-- 网页标题，显示在浏览器标签栏上 -->
    <title>Title</title>
</head>

<!-- 身体标签，网页所有可见内容（文字、图片、按钮等）都写在这里 -->
<body>

</body>
</html>
```

### 6.网页中常见的标签

1. **标题标签**
- h1标签
- h2标签
- h3标签
- h4标签
- h5标签
- h6标签

```html
<body>
  <h1>hello word</h1>
  <h2>hello word</h2>
  <h3>hello word</h3>
  <h4>hello word</h4>
  <h5>hello word</h5>
  <h6>hello word</h6>
</body>
```

2.**段落标签**

一般用来写文章段落

- p标签

```html
<body>
  <p>这是一段文章</p>
</body>
```

3.换行标签

- br标签

```html
<body>
  窗前明月光<br>疑是地上霜<br>举头望明月<br>低头思故乡
</body>
```

5.分割标签

- hr标签

作用：标签变成分割线

```html
<body>
  你好呀
  <hr>
  哈哈
</body>
```

6.div标签

- div标签 是用来布局的，并没有语义，只是一个区块

```html
<body>
  <div>
    这只是一个盒子
  </div>
</body>
```

7.span标签

没有语义，一般用来包裹文字,让文字更好被选中。

```html
<body>
  <span>
    这只是一个盒子
  </span>
</body>
```

8.img标签(图片标签)

- 作用：插入图片

- 属性
1. src：引入图片路径

2. alt：对图片的描述。 如果由于某种原因，浏览器无法加载图像，它将显示 `alt` 属性中的文本，以提供对图像内容的描述。

3. height：设置图片的高

4. width：设置图片的宽度

```html
<body>
  <!-- 可以链接引入 -->
  <img src="https://img1.baidu.com/it/u=176026669,1083095139&fm=253&fmt=auto&app=120&f=JPEG?w=879&h=500" alt="如果图片加载失败">
  <!-- 也可以本地引入 -->
  <img src="图片.png" alt="">
</body>
```

9.a标签

- 作用：点击跳转到另一个网页
- href：指定访问资源的URL
- target：指定打开资源的方式

​				_self：默认值，在当前页面打开

​				_blank：在新的页面打开

```html
<body>
  <a href="https://baidu.com">点击当前页面跳转到百度</a>
  <a href="https://baidu.com" target="_blank">点击重新打开页面跳转到百度</a>
</body>
```

10.列表标签

- 有序列表 ol li

```html
<body>
  <!-- ol标签定义有序列表 -->
  <ol>
    <!-- li标签定义列表项目 -->
    <li>1</li>
    <li>1</li>
    <li>1</li>
    <li>1</li>
  </ol>
</body>
```

- 无序列表  ul li

```html
<body>
  <!-- ul标签定义无序列表 -->
  <ul>
    <!-- li标签定义列表项目 -->
    <li>1</li>
    <li>1</li>
    <li>1</li>
    <li>1</li>
  </ul>
</body>
```

11.表单标签

在网页中主要负责数据采集功能

表单项(元素)：不同类型的input元素、下拉列表、文本域等

form标签:用于创建用户输入表单的容器标签

action属性：指定表单提交的地址

method属性：提交的方式

```html
<form action="URL" method="GET|POST">
  <!-- 表单元素在这里 -->
</form>
```

form 标签是表单标签

action 属性设置提交的服务器地址

method 属性设置提交的方式 GET(默认值)或 POST

**表单提交的时候**，**数据没有发送给服务器的三种情况**：

1、表单项没有 name 属性值

2、单选、复选（下拉列表中的 option 标签）都需要添加 value 属性，以便发送给服务器

3、表单项不在提交的 form 标签中

GET 请求的特点是：

1、浏览器地址栏中的地址是：action 属性[+?+请求参数]

请求参数的格式是：name=value&name=value

2、不安全

3、它有数据长度的限制

POST 请求的特点是：

1、浏览器地址栏中只有 action 属性值

2、相对于 GET 请求要安全

3、理论上没有数据长度的限制

input标签

​	type属性：

- text：默认值、定义单行输入字段

```html
<body>
  <input type="text">
</body>
```

- password：定义密码字段

```html
<body>
  <input type="password">
</body>
```

- radio：定义单选框

```html
<body>
  <!--单选框-->
  <!--想要多个单选按钮互斥，需要把他们的name设为一样的-->
  <!--要格外注意加value及对应的值，这样提交以后会把这个值提交进去，从而区分
是男是女-->
  <input type="radio" name="gender">男
  <input type="radio" name="gender">女
</body>
```

- checkbox：复选框

```html
<body>
  <input type="checkbox" name="hobby">旅游
  <input type="checkbox" name="hobby">电影
  <input type="checkbox" name="hobby">阅读
</body>
```

- button：按钮

```html
<body>
  <button>一个普通按钮</button>
</body>
```

- file：会将文件上传

```html
<body>
  <!--上传文件-->
  <input type="file"><br>
</body>
```

video：视频

```html
<!-- controls：显示视频控制栏（播放、暂停、音量等）。
  autoplay：视频加载后自动播放。 -->
<video controls autoplay width = "400px">
    <source src="mda-qdqxj7s4d6njpv18.mp4">
</video>
```

select：定义下拉列表，option定义列表项

```html
<body>
  <select>
    <option value="1">红色</option>
    <option value="2">绿色</option>
    <option value="3">黄色</option>
  </select>
</body>
```

textarea ：文本域

```
<body>
  <textarea></textarea>
</body>
```
