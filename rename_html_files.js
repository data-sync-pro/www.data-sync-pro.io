const fs = require('fs');
const path = require('path');

// 读取处理计划
const plan = JSON.parse(fs.readFileSync('prefix_removal_plan.json', 'utf8'));

const faqItemDir = 'src/assets/faq-item';

console.log('开始重命名HTML文件...');
console.log(`需要重命名的文件数量: ${plan.length}`);

let renamedCount = 0;
let notFoundCount = 0;
let errorCount = 0;

plan.forEach(item => {
  const oldFileName = item.originalAnswer;
  const newFileName = item.newAnswer;
  
  const oldFilePath = path.join(faqItemDir, oldFileName);
  const newFilePath = path.join(faqItemDir, newFileName);
  
  // 检查原文件是否存在
  if (fs.existsSync(oldFilePath)) {
    try {
      // 重命名文件
      fs.renameSync(oldFilePath, newFilePath);
      console.log(`✓ 重命名: ${oldFileName} → ${newFileName}`);
      renamedCount++;
    } catch (error) {
      console.error(`✗ 重命名失败: ${oldFileName} - ${error.message}`);
      errorCount++;
    }
  } else {
    console.warn(`? 文件不存在: ${oldFileName}`);
    notFoundCount++;
  }
});

console.log(`\n重命名完成！`);
console.log(`成功重命名: ${renamedCount} 个文件`);
console.log(`文件不存在: ${notFoundCount} 个文件`);
console.log(`重命名失败: ${errorCount} 个文件`);