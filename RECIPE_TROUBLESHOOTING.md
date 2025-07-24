# Recipe Page 路由问题排查指南

## 问题现象
点击header中的"Recipes"链接后，仍然停留在FAQ页面而不是跳转到Recipes页面。

## 可能的原因和解决方案

### 1. 浏览器缓存问题
**最常见的原因** - 浏览器缓存了旧版本的代码。

**解决方案：**
- 硬刷新页面：`Ctrl + F5` (Windows) 或 `Cmd + Shift + R` (Mac)
- 清除浏览器缓存：开发者工具 → Application → Storage → Clear site data
- 使用无痕模式测试

### 2. Service Worker 缓存
由于应用使用了Service Worker，可能缓存了旧的路由配置。

**解决方案：**
1. 打开开发者工具（F12）
2. 转到 Application 标签
3. 左侧找到 Service Workers
4. 点击 "Unregister" 取消注册Service Worker
5. 刷新页面

### 3. 开发服务器需要重启
如果使用开发服务器，更改路由配置后需要重启。

**解决方案：**
```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm start
# 或指定端口
ng serve --port 4201
```

### 4. 验证路由是否正确
直接在地址栏输入以下URL测试：
- `http://localhost:4201/recipes` - 应该显示recipes主页
- `http://localhost:4201/recipes/batch` - 应该显示batch分类
- `http://localhost:4201/` - 应该显示FAQ页面

### 5. 检查控制台错误
打开浏览器开发者工具（F12），查看Console标签是否有JavaScript错误。

## 技术详情

### 路由配置
已正确配置在 `src/app/app-routing.module.ts`:
```typescript
const routes: Routes = [
  { 
    path: '', 
    loadChildren: () => import('./faq/faq.module').then(m => m.FaqModule)
  },
  {
    path: 'recipes',
    loadChildren: () => import('./recipes/recipes.module').then(m => m.RecipesModule)
  },
  // ...
];
```

### Header导航
已在 `src/app/header/header.component.ts` 中添加：
```typescript
navItems: NavItem[] = [
  { label: 'FAQ', link: '/', isOpen: false },
  { label: 'Recipes', link: '/recipes', isOpen: false },
  // ...
];
```

## 测试步骤

1. **清除缓存** - 硬刷新或清除浏览器数据
2. **检查URL** - 点击Recipes后，地址栏应该变为 `/recipes`
3. **检查内容** - 页面应该显示"Data Sync Pro Recipes"标题和分类卡片
4. **测试导航** - 尝试点击不同的recipe分类

## 如果问题仍然存在

如果按照上述步骤仍然无法解决，请提供以下信息：
1. 浏览器类型和版本
2. 开发者工具Console中的错误信息
3. Network标签中的请求信息
4. 当前访问的完整URL

## 快速验证命令

```bash
# 确保构建成功
npm run build

# 启动开发服务器
ng serve --port 4201

# 在新的无痕窗口中访问
# http://localhost:4201/recipes
```