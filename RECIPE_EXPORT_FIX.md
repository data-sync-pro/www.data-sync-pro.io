# Recipe Export 修复说明

## 问题描述
导出的 Recipe ZIP 文件缺少系统必需的 `index.json` 文件，导致无法正确导入和识别recipes。

## 修复内容

### 1. 修改 `RecipeExportService.exportAllAsZip()` 方法
- **添加 `index.json` 生成**：在 ZIP 文件根目录添加 `index.json` 文件
- **添加部署说明**：在 ZIP 文件中包含 `DEPLOYMENT_INSTRUCTIONS.txt` 部署说明文档
- **更新进度显示**：增加生成 index.json 和说明文档的进度步骤

### 2. 新增 `generateRecipeIndex()` 方法
- 生成符合 `RecipeIndexConfig` 接口要求的 index.json 格式
- 包含每个 recipe 的元数据：
  ```json
  {
    "recipes": [
      {
        "folderId": "recipe-id",
        "name": "recipe-id", 
        "category": "normalized-category-name",
        "active": true
      }
    ]
  }
  ```

### 3. 修改 `exportAsJSON()` 方法
- 导出结构化数据，包含：
  - `metadata`: 导出元数据信息
  - `index`: recipe 索引信息
  - `recipes`: recipe 数据数组

### 4. 更新导入功能
- **`importRecipes()` 方法**：支持导入包含 index 的结构化导出数据
- **`importFromZip()` 方法**：读取和处理 ZIP 中的 `index.json` 文件
- 向后兼容：仍支持导入旧格式的简单数组数据

### 5. 新增说明文档生成
- **`generateRecipeUpdateInstructions()`**：生成详细的部署说明
- **`downloadRecipeInstructions()`**：下载独立的说明文档
- 说明内容包括：
  - 文件结构说明
  - 部署步骤
  - 构建流程
  - 验证要求

## 导出文件结构
```
recipes_export_2025-08-26.zip
├── index.json                          # Recipe 索引配置
├── DEPLOYMENT_INSTRUCTIONS.txt         # 部署说明文档
├── recipe-id-1/
│   ├── recipe.json                     # Recipe 定义
│   ├── images/                         # Recipe 图片
│   └── downloadExecutables/            # 下载文件
└── recipe-id-2/
    ├── recipe.json
    ├── images/
    └── downloadExecutables/
```

## 测试状态
- ✅ TypeScript 编译检查通过
- ✅ Angular 构建成功
- ✅ 所有修改向后兼容

## 使用方式
1. 在 Recipe Editor 中正常导出 recipes
2. 导出的 ZIP 文件现在包含完整的 `index.json`
3. 按照 `DEPLOYMENT_INSTRUCTIONS.txt` 中的说明部署到生产环境
4. Recipe 系统将自动识别和加载所有 recipes

## 影响的文件
- `src/app/shared/services/recipe-export.service.ts` - 主要修复文件