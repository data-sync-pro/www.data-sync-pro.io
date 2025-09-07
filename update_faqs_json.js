const fs = require('fs');

// 读取原始数据和处理计划
const data = JSON.parse(fs.readFileSync('src/assets/data/faqs.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('prefix_removal_plan.json', 'utf8'));

// 创建ID到新文件名的映射
const idToNewAnswer = {};
plan.forEach(item => {
  idToNewAnswer[item.id] = item.newAnswer;
});

console.log('开始更新faqs.json文件...');
console.log(`需要更新的项目数量: ${Object.keys(idToNewAnswer).length}`);

let updateCount = 0;

// 更新数据
data.forEach((item, index) => {
  if (idToNewAnswer[item.Id]) {
    const oldAnswer = item['Answer__c'];
    const newAnswer = idToNewAnswer[item.Id];
    
    item['Answer__c'] = newAnswer;
    updateCount++;
    
    console.log(`更新 ${item.Id}: ${oldAnswer} → ${newAnswer}`);
  }
});

// 保存更新后的文件
fs.writeFileSync('src/assets/data/faqs.json', JSON.stringify(data, null, 2));

console.log(`\n更新完成！`);
console.log(`总共更新了 ${updateCount} 个项目`);
console.log('faqs.json文件已更新');