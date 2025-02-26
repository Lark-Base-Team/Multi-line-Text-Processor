# 利用飞书多维表格插件，实现从前端插件里让用户设置2个参数，一个是源数据表中字段名，另一个是目标数据表中字段名。用户选择提交后，后端插件根据前端请求参数即源表源字段和目标表目标字段，实现从源字段读取记录值并对记录值内容进行分析，如果字符串中包含多行文本，就按照换行符对字符串进行分割，分割后的每个部分都在目标表的目标字段中创建新记录。
# Getting Started
- Hit run
- Edit [index.tsx](#pages/App/index.tsx) and watch it live update!

# Learn More

You can learn more in the [Base Extension Development Guide](https://lark-technologies.larksuite.com/docx/HvCbdSzXNowzMmxWgXsuB2Ngs7d) or [多维表格扩展脚本开发指南](https://feishu.feishu.cn/docx/U3wodO5eqome3uxFAC3cl0qanIe).

## Install packages

Install packages in Shell pane or search and add in Packages pane.
