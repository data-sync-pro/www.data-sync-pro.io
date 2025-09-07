const fs = require('fs');
const path = require('path');

const faqItemDir = 'src/assets/faq-item';

// Triggers文件的映射关系
const triggersMapping = {
  'triggers-how-does-trigger-work.html': 'how-does-trigger-work.html',
  'triggers-why-use-trigger.html': 'why-use-trigger.html', 
  'triggers-what-events-are-supported.html': 'what-events-are-supported.html',
  'triggers-what-is-self-adaptive-trigger.html': 'what-is-self-adaptive-trigger.html',
  'triggers-how-to-create-self-adaptive.html': 'how-to-create-self-adaptive.html',
  'triggers-how-to-calculate-rollup-summaries.html': 'how-to-calculate-rollup-summaries.html',
  'triggers-how-to-setup-validation-rules.html': 'how-to-setup-validation-rules.html',
  'triggers-what-is-trigger-action.html': 'what-is-trigger-action.html',
  'triggers-how-to-create-trigger-action.html': 'how-to-create-trigger-action.html',
  'triggers-what-is-execution-flow.html': 'what-is-execution-flow.html',
  'triggers-how-to-prevent-recursive-execution.html': 'how-to-prevent-recursive-execution.html',
  'triggers-how-to-manage-execution-order.html': 'how-to-manage-execution-order.html',
  'triggers-how-to-manage-user-access.html': 'how-to-manage-user-access.html',
  'triggers-how-to-achieve-test-coverage.html': 'how-to-achieve-test-coverage.html',
  'triggers-what-is-trigger-flipper-pattern.html': 'what-is-trigger-flipper-pattern.html'
};

console.log('开始重命名triggers相关的HTML文件...');

let renamedCount = 0;
let notFoundCount = 0;

Object.entries(triggersMapping).forEach(([oldFileName, newFileName]) => {
  const oldFilePath = path.join(faqItemDir, oldFileName);
  const newFilePath = path.join(faqItemDir, newFileName);
  
  if (fs.existsSync(oldFilePath)) {
    try {
      fs.renameSync(oldFilePath, newFilePath);
      console.log(`✓ 重命名: ${oldFileName} → ${newFileName}`);
      renamedCount++;
    } catch (error) {
      console.error(`✗ 重命名失败: ${oldFileName} - ${error.message}`);
    }
  } else {
    console.warn(`? 文件不存在: ${oldFileName}`);
    notFoundCount++;
  }
});

console.log(`\ntriggers文件重命名完成！`);
console.log(`成功重命名: ${renamedCount} 个文件`);
console.log(`文件不存在: ${notFoundCount} 个文件`);