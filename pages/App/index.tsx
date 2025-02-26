'use client'
import { bitable, ITable, ITableMeta, IField, ICellValue, IOpenSegment } from "@lark-base-open/js-sdk";
import { Button, Form, Toast, Select, Spin } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BaseFormApi } from '@douyinfe/semi-foundation/lib/es/form/interface';
import styles from './index.module.css';

// 获取环境变量中的令牌
const APP_TOKEN = process.env.APP_TOKEN;
const PERSONAL_BASE_TOKEN = process.env.PERSONAL_BASE_TOKEN;

export default function App() {
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>([]);
  const [sourceFields, setSourceFields] = useState<IField[]>([]);
  const [targetFields, setTargetFields] = useState<IField[]>([]);
  const [loading, setLoading] = useState(false);
  const formApi = useRef<BaseFormApi>();

  // 组件挂载时获取表格列表
  useEffect(() => {
    bitable.base.getTableMetaList().then(metaList => {
      setTableMetaList(metaList);
    }).catch(error => {
      console.error('Error fetching table list:', error);
      Toast.error('加载表格失败');
    });
  }, []);

  // 当源表格改变时获取字段列表
  const handleSourceTableChange = useCallback(async (tableId: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      const fields = await table.getFieldMetaList();
      setSourceFields(fields);
    } catch (error) {
      console.error('Error fetching source fields:', error);
      Toast.error('加载源表格字段失败');
    }
  }, []);

  // 当目标表格改变时获取字段列表
  const handleTargetTableChange = useCallback(async (tableId: string) => {
    try {
      const table = await bitable.base.getTableById(tableId);
      const fields = await table.getFieldMetaList();
      setTargetFields(fields);
    } catch (error) {
      console.error('Error fetching target fields:', error);
      Toast.error('加载目标表格字段失败');
    }
  }, []);

  // 处理多行文本
  const processMultilineText = useCallback(async (values: any) => {
    try {
      setLoading(true);

      const { sourceTable, sourceField, targetTable, targetField } = values;

      if (!sourceTable || !sourceField || !targetTable || !targetField) {
        Toast.error('请填写所有必填字段');
        return;
      }

      const srcTable = await bitable.base.getTableById(sourceTable);
      const tgtTable = await bitable.base.getTableById(targetTable);

      // 获取源表格的所有记录
      const recordList = await srcTable.getRecordList();
      let processedCount = 0;

      for (const record of recordList) {
        const cellValue = await srcTable.getCellValue(sourceField, record.id);

        if (cellValue !== undefined && cellValue !== null) {
          // 处理不同类型的单元格值
          let lines: string[] = [];
          
          if (typeof cellValue === 'string') {
            // 处理普通字符串
            lines = cellValue.split('\n').filter(line => line.trim() !== '');
          } else if (Array.isArray(cellValue)) {
            // 处理数组类型
            if (cellValue.length > 0 && typeof cellValue[0] === 'object' && cellValue[0].type === 'text') {
              // 处理富文本类型 [{type: 'text', text: '...'}]
              const richTextContent = cellValue
                .filter(segment => segment.type === 'text' && segment.text)
                .map(segment => segment.text)
                .join('');
              
              lines = richTextContent.split('\n').filter(line => line.trim() !== '');
            } else {
              // 处理普通数组
              lines = cellValue.map(item => {
                if (typeof item === 'object' && item !== null) {
                  return JSON.stringify(item);
                }
                return String(item);
              }).filter(line => line.trim() !== '');
            }
          } else if (typeof cellValue === 'object' && cellValue !== null) {
            // 处理对象类型（包括富文本段落等）
            console.log('Object cell value:', cellValue);
            
            if (cellValue.type === 'text' && cellValue.text) {
              lines = cellValue.text.split('\n').filter(line => line.trim() !== '');
            } else if (cellValue.title || cellValue.name || cellValue.value) {
              // 处理其他常见对象格式
              const text = cellValue.title || cellValue.name || cellValue.value || JSON.stringify(cellValue);
              lines = [text];
            } else {
              try {
                lines = [JSON.stringify(cellValue)];
              } catch (e) {
                lines = ['[无法解析的对象]'];
              }
            }
          } else {
            // 处理其他类型
            lines = [String(cellValue)];
          }
          
          console.log('处理后的行:', lines);

          for (const line of lines) {
            // 在目标表格创建新记录
            await tgtTable.addRecord({
              fields: {
                [targetField]: line
              }
            });
            processedCount++;
          }
        }
      }

      Toast.success(`成功处理 ${processedCount} 行文本并创建新记录`);
    } catch (error) {
      console.error('Error processing multiline text:', error);
      Toast.error('处理过程中发生错误');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>多行文本处理器</h1>
      <p className={styles.description}>
        从一个表格中分割多行文本并在另一个表格中创建新记录。
      </p>

      <Form getFormApi={(api) => formApi.current = api} onSubmit={processMultilineText}>
        <Form.Section text="源表格配置">
          <Form.Select
            field="sourceTable"
            label="源表格"
            placeholder="请选择源表格"
            onChange={handleSourceTableChange}
            style={{ width: '100%' }}
          >
            {tableMetaList.map(table => (
              <Select.Option key={table.id} value={table.id}>
                {table.name}
              </Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="sourceField"
            label="源字段"
            placeholder="请选择源字段"
            style={{ width: '100%' }}
            disabled={sourceFields.length === 0}
          >
            {sourceFields.map(field => (
              <Select.Option key={field.id} value={field.id}>
                {field.name}
              </Select.Option>
            ))}
          </Form.Select>
        </Form.Section>

        <Form.Section text="目标表格配置">
          <Form.Select
            field="targetTable"
            label="目标表格"
            placeholder="请选择目标表格"
            onChange={handleTargetTableChange}
            style={{ width: '100%' }}
          >
            {tableMetaList.map(table => (
              <Select.Option key={table.id} value={table.id}>
                {table.name}
              </Select.Option>
            ))}
          </Form.Select>

          <Form.Select
            field="targetField"
            label="目标字段"
            placeholder="请选择目标字段"
            style={{ width: '100%' }}
            disabled={targetFields.length === 0}
          >
            {targetFields.map(field => (
              <Select.Option key={field.id} value={field.id}>
                {field.name}
              </Select.Option>
            ))}
          </Form.Select>
        </Form.Section>

        <div className={styles.submitContainer}>
          <Button theme="solid" type="primary" htmlType="submit" loading={loading}>
            开始处理
          </Button>
        </div>
      </Form>

      {loading && (
        <div className={styles.loadingOverlay}>
          <Spin size="large" />
          <p>正在处理中，请稍候...</p>
        </div>
      )}
    </div>
  );
}