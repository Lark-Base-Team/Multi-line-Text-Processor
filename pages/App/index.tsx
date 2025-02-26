
'use client'
import { bitable, ITable, ITableMeta, IField, ICellValue, IOpenSegment } from "@lark-base-open/js-sdk";
import { Button, Form, Toast, Select, Spin } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BaseFormApi } from '@douyinfe/semi-foundation/lib/es/form/interface';
import styles from './index.module.css';

export default function App() {
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>([]);
  const [sourceFields, setSourceFields] = useState<IField[]>([]);
  const [targetFields, setTargetFields] = useState<IField[]>([]);
  const [loading, setLoading] = useState(false);
  const formApi = useRef<BaseFormApi>();

  // Fetch table list on component mount
  useEffect(() => {
    bitable.base.getTableMetaList().then(metaList => {
      setTableMetaList(metaList);
    }).catch(error => {
      console.error('Error fetching table list:', error);
      Toast.error('Failed to load tables');
    });
  }, []);

  // Load fields for the selected source table
  const handleSourceTableChange = useCallback(async (tableId: string) => {
    if (tableId) {
      try {
        const table = await bitable.base.getTableById(tableId);
        const fields = await table.getFieldMetaList();
        setSourceFields(fields);
        formApi.current?.setValue('sourceField', '');
      } catch (error) {
        console.error('Error loading source fields:', error);
        Toast.error('Failed to load source table fields');
      }
    } else {
      setSourceFields([]);
    }
  }, []);

  // Load fields for the selected target table
  const handleTargetTableChange = useCallback(async (tableId: string) => {
    if (tableId) {
      try {
        const table = await bitable.base.getTableById(tableId);
        const fields = await table.getFieldMetaList();
        setTargetFields(fields);
        formApi.current?.setValue('targetField', '');
      } catch (error) {
        console.error('Error loading target fields:', error);
        Toast.error('Failed to load target table fields');
      }
    } else {
      setTargetFields([]);
    }
  }, []);

  // Process the form submission
  const processMultilineText = useCallback(async (values: {
    sourceTable: string,
    sourceField: string,
    targetTable: string,
    targetField: string
  }) => {
    const { sourceTable, sourceField, targetTable, targetField } = values;
    
    if (!sourceTable || !sourceField || !targetTable || !targetField) {
      Toast.warning('Please select all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Get the source and target tables
      const srcTable = await bitable.base.getTableById(sourceTable);
      const tgtTable = await bitable.base.getTableById(targetTable);
      
      // Get all records from source table
      const recordIdList = await srcTable.getRecordIdList();
      
      let processedCount = 0;
      
      // Process each record
      for (const recordId of recordIdList) {
        const cell = await srcTable.getCellValue(sourceField, recordId);
        
        // Skip if cell is empty
        if (!cell) continue;
        
        let textValue = '';
        
        // Handle different cell value types
        if (typeof cell === 'string') {
          textValue = cell;
        } else if (Array.isArray(cell) && cell.length > 0) {
          // Handle array of text/segments
          if (typeof cell[0] === 'string') {
            textValue = cell.join('\n');
          } else if (typeof cell[0] === 'object' && 'text' in cell[0]) {
            // For rich text fields
            textValue = (cell as IOpenSegment[]).map(segment => segment.text).join('');
          }
        } else if (typeof cell === 'object' && cell !== null) {
          // Try to convert object to string if possible
          textValue = JSON.stringify(cell);
        }
        
        if (textValue) {
          // Split by newline and create new records
          const lines = textValue.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            // Create a new record with the line as the specified field's value
            await tgtTable.addRecord({
              fields: {
                [targetField]: line
              }
            });
            processedCount++;
          }
        }
      }
      
      Toast.success(`Successfully processed ${processedCount} lines into new records`);
    } catch (error) {
      console.error('Error processing multiline text:', error);
      Toast.error('An error occurred while processing');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Multiline Text Processor</h1>
      <p className={styles.description}>
        Split multiline text from one table and create new records in another table.
      </p>
      
      <Form getFormApi={(api) => formApi.current = api} onSubmit={processMultilineText}>
        <Form.Section text="Source Configuration">
          <Form.Select
            field="sourceTable"
            label="Source Table"
            placeholder="Select source table"
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
            label="Source Field"
            placeholder="Select source field"
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
        
        <Form.Section text="Target Configuration">
          <Form.Select
            field="targetTable"
            label="Target Table"
            placeholder="Select target table"
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
            label="Target Field"
            placeholder="Select target field"
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
        
        <div className={styles.buttonContainer}>
          <Button htmlType="submit" type="primary" theme="solid" loading={loading} disabled={loading}>
            {loading ? 'Processing...' : 'Process Text'}
          </Button>
        </div>
      </Form>
      
      {loading && (
        <div className={styles.loadingOverlay}>
          <Spin size="large" />
          <p>Processing records, please wait...</p>
        </div>
      )}
    </div>
  );
}
