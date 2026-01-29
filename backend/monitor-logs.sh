#!/bin/bash

echo "🔍 监控后端日志 - 豆包语音对话诊断"
echo "======================================"
echo ""
echo "请在浏览器中执行以下操作："
echo "1. 刷新页面"
echo "2. 选择项目"
echo "3. 点击'开始通话'"
echo "4. 开始说话（例如：'你好，我是测试'）"
echo ""
echo "观察日志输出..."
echo "======================================"
echo ""

# 监控后端日志，过滤关键字
tail -f /tmp/claude/-Users-dingcheng-Coding-Project/ai-daily-report-generator/tasks/bb1a3ad.output | grep -E '\[Audio\]|\[Doubao\]|\[Call\]|Session|Error|TRACE'
