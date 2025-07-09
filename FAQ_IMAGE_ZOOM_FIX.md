# FAQ图片缩放功能修复

## 问题描述
FAQ页面中的图片缩放功能不能正确放大图片。

## 问题分析
经过代码分析，发现以下问题：

1. **ZoomableDirective实现不完善**：缺少对动态加载内容的监听
2. **图片样式处理不当**：缺少正确的CSS类和属性
3. **事件处理不够健壮**：缺少错误处理和状态管理
4. **缩放逻辑有缺陷**：缺少正确的样式恢复机制
5. **组件数据问题**：paginated-faq和virtual-scroll-faq组件使用模拟数据，没有真实的HTML内容和图片
6. **指令缺失**：部分FAQ组件没有正确应用appZoomable指令

## 修复方案

### 1. 增强ZoomableDirective (`src/app/zoomable.directive.ts`)

**主要改进：**
- 添加了`MutationObserver`来监听DOM变化，确保动态加载的图片也能正确处理
- 改进了图片样式处理，避免重复处理同一图片
- 增强了缩放逻辑，保存和恢复原始样式
- 添加了键盘支持（ESC键关闭缩放）
- 改进了背景遮罩的样式和交互

**关键功能：**
```typescript
// 监听DOM变化
private setupMutationObserver(): void {
  this.mutationObserver = new MutationObserver((mutations) => {
    // 为新添加的图片设置缩放功能
  });
}

// 改进的图片样式处理
private styleImage(img: HTMLImageElement): void {
  // 避免重复处理
  if (img.hasAttribute('data-zoomable-processed')) return;
  
  // 设置样式和事件监听器
  // 标记为已处理
}

// 增强的缩放功能
private zoomIn(img: HTMLImageElement): void {
  // 保存原始样式
  // 计算最佳缩放比例
  // 创建背景遮罩
  // 应用缩放效果
}
```

### 2. 改进FAQ服务的内容处理 (`src/app/shared/services/faq.service.ts`)

**改进内容：**
- 增强了图片标签的处理，确保添加正确的类和属性
- 添加了图片加载错误处理
- 改进了图片路径处理

**关键代码：**
```typescript
.replace(/<img([^>]*?)>/g, (match, attrs) => {
  // 确保图片有正确的类和属性
  let newAttrs = attrs;
  if (!newAttrs.includes('class=')) {
    newAttrs += ' class="faq-image"';
  }
  
  // 添加错误处理和加载完成处理
  if (!newAttrs.includes('onerror=')) {
    newAttrs += ' onerror="this.style.display=\'none\'"';
  }
  
  return `<img${newAttrs}>`;
})
```

### 3. 修复FAQ组件数据问题

**修复内容：**
- 更新了`PaginatedFAQComponent`以使用真实的FAQ数据而不是模拟数据
- 集成了`FAQService`来加载实际的FAQ内容
- 添加了内容加载状态管理
- 确保所有FAQ组件都正确应用了`appZoomable`指令

**关键修复：**
```typescript
// 使用真实FAQ数据
this.faqService.getFAQs().pipe(
  takeUntil(this.destroy$)
).subscribe({
  next: (faqs) => {
    this.allItems = faqs.map(faq => ({
      ...faq,
      viewCount: Math.floor(Math.random() * 1000)
    }));
  }
});

// 动态加载FAQ内容
if (!item.safeAnswer && item.answerPath) {
  this.faqService.getFAQContent(item.answerPath).subscribe({
    next: (content) => {
      item.safeAnswer = content;
    }
  });
}
```

### 4. 优化CSS样式 (`src/app/faq/faq.component.scss`)

**样式改进：**
- 改进了`.zoom-backdrop`的样式，使用更好的背景和布局
- 增强了图片的hover效果
- 添加了专门的`.faq-image`样式类
- 确保缩放状态下的正确样式

**关键样式：**
```scss
.zoom-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.faq-image {
  display: block;
  margin: 20px auto;
  cursor: zoom-in;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
}
```

## 测试方法

1. 启动开发服务器：`npm start`
2. 访问FAQ页面：`http://localhost:14771/faq`
3. 展开任何包含图片的FAQ项目
4. 点击图片应该能够正确放大
5. 点击背景或按ESC键应该能够关闭缩放

## 功能特性

- ✅ 支持动态加载的图片
- ✅ 智能缩放比例计算
- ✅ 键盘支持（ESC关闭）
- ✅ 鼠标hover效果
- ✅ 错误处理
- ✅ 样式状态管理
- ✅ 响应式设计

## 注意事项

1. 图片必须成功加载才能缩放
2. 带有`noZoom`属性的图片不会启用缩放功能
3. 缩放功能会自动适应屏幕大小
4. 支持触摸设备的交互

## 后续优化建议

1. 添加缩放动画效果
2. 支持手势缩放（移动设备）
3. 添加图片预加载功能
4. 支持图片旋转功能
