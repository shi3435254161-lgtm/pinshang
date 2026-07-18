# GitHub Pages 部署教程

这个站是纯静态网站，GitHub Pages 可以免费托管。部署成功后，会得到一个长期可访问的公网链接，格式大概是：

```text
https://你的GitHub用户名.github.io/pinshang-shop/
```

## 一、网页上传版

这个方法最适合第一次部署，不需要命令行。

1. 打开 GitHub 并登录。
2. 右上角点 `+`，选择 `New repository`。
3. 仓库名填写：

```text
pinshang-shop
```

4. 选择 `Public`。
5. 不要勾选自动创建 README、.gitignore、license。
6. 点击 `Create repository`。
7. 进入新仓库后，点击 `uploading an existing file` 或 `Add file -> Upload files`。
8. 打开本地文件夹：

```text
F:\pinshang-shop-upload
```

9. 把里面所有内容拖到 GitHub 上传区：

```text
assets
app.js
data.js
index.html
styles.css
.nojekyll
```

如果看不到 `.nojekyll`，也没关系；它只是保险项，不影响第一版上线。

10. 页面底部提交信息写：

```text
first deploy
```

11. 点击 `Commit changes`。

## 二、开启 GitHub Pages

上传完成后：

1. 进入仓库页面。
2. 点击 `Settings`。
3. 左侧点击 `Pages`。
4. `Source` 选择：

```text
Deploy from a branch
```

5. `Branch` 选择：

```text
main
```

6. 旁边目录选择：

```text
/root
```

有些界面会显示成 `/ (root)`，意思一样。

7. 点击 `Save`。
8. 等 1 到 3 分钟，刷新这个 Pages 页面。
9. 页面顶部会出现公网链接。

第一次发布可能不是立刻生效，看到 404 时先等几分钟再刷新。

## 三、以后怎么更新

本地先改：

```text
F:\pinshang-shop\data.js
```

图片放：

```text
F:\pinshang-shop\assets\products\
```

改完运行：

```powershell
powershell -ExecutionPolicy Bypass -File F:\pinshang-shop\build-upload-package.ps1
```

脚本会刷新：

```text
F:\pinshang-shop-upload
```

然后去 GitHub 仓库：

1. 点 `Add file -> Upload files`。
2. 再把 `F:\pinshang-shop-upload` 里的内容拖进去。
3. 如果提示同名文件会覆盖，这是正常的。
4. 提交信息写：

```text
update products
```

5. 点击 `Commit changes`。
6. 等 1 到 3 分钟，打开公网链接检查。

## 四、git 命令版

如果你想用命令行，以后可以用这套。先在 GitHub 上创建空仓库，然后把仓库地址替换到下面命令里。

```powershell
cd /d F:\pinshang-shop
git init
git branch -M main
git add .
git commit -m "first deploy"
git remote add origin https://github.com/你的用户名/pinshang-shop.git
git push -u origin main
```

后续每次更新：

```powershell
cd /d F:\pinshang-shop
git add .
git commit -m "update products"
git push
```

如果 `git commit` 提示没有配置用户名邮箱，执行：

```powershell
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的邮箱"
```

## 五、上线后测试

拿到 GitHub Pages 链接后，至少测这几项：

1. 电脑浏览器打开。
2. 手机微信打开。
3. 搜索“马桶”“烟机”“热水器”。
4. 点微信询价，确认能复制询价内容。
5. 把链接发给一个没有登录你 GitHub 的朋友，看能不能打开。

这些都没问题，再发朋友圈。
