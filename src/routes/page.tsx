/* eslint-disable max-lines */
import { useEffect, useRef, useState } from 'react';
import './index.css';
import {
  bitable,
  checkers,
  FieldType,
  ToastType,
  ViewType,
  type IFieldMeta,
  type IGridView,
  type IOpenCellValue,
  type ITable,
} from '@lark-base-open/js-sdk';
import {
  useAsyncEffect,
  useCounter,
  useDebounceFn,
  useMemoizedFn,
} from 'ahooks';
import { useTranslation } from 'react-i18next';
import {
  Skeleton,
  Form,
  Tooltip,
  Button,
  Popover,
  Typography,
  Divider,
  Space,
  Row,
  Col,
  Popconfirm,
  Card,
} from '@douyinfe/semi-ui';
import { IconHelpCircle } from '@douyinfe/semi-icons';
import Handlebars from 'handlebars';
import { post as Check } from '@api/check';
import { post as Send } from '@api/send';
import DOMPurify from 'dompurify';
import { CProgressStacked, CProgress } from '@coreui/react';
import '@coreui/coreui/dist/css/coreui.min.css';
import ParallelPromise from '@shared/ParallelPromise';

const compile = (templateStr: string, data: any) => {
  try {
    const template = Handlebars.compile(templateStr, { strict: false });
    if (data instanceof Map) {
      // eslint-disable-next-line no-param-reassign
      data = Object.fromEntries(data);
    }
    const html = template(data);
    return DOMPurify.sanitize(html);
  } catch (error: any) {
    console.error(`compile`, error);
    return `template error ${error?.name} ${error?.message}`;
  }
};

const cellToString = (value: IOpenCellValue) => {
  if (typeof value === 'string') {
    return value;
  }
  if (checkers.isAttachment(value)) {
    return value.name;
  }
  if (checkers.isAttachments(value)) {
    return value.map(v => v.name).join(', ');
  }
  if (checkers.isAutoNumber(value)) {
    return value.value;
  }
  if (checkers.isCheckbox(value)) {
    return String(value);
  }
  if (checkers.isEmpty(value)) {
    return '';
  }
  if (checkers.isGroupChat(value)) {
    return value.name;
  }
  if (checkers.isGroupChats(value)) {
    return value.map(v => v.name).join(', ');
  }
  if (checkers.isLink(value)) {
    return value.text;
  }
  if (checkers.isLocation(value)) {
    return value.fullAddress;
  }
  if (checkers.isMultiSelect(value)) {
    return value.map(v => v.text).join(', ');
  }
  if (checkers.isNumber(value)) {
    return value.toString();
  }
  if (checkers.isPhone(value)) {
    return value;
  }
  if (checkers.isSegmentItem(value)) {
    return value.text;
  }
  if (checkers.isSegments(value)) {
    return value.map(v => v.text).join(', ');
  }
  if (checkers.isSingleSelect(value)) {
    return value.text;
  }
  if (checkers.isTimestamp(value)) {
    return String(value);
  }
  if (checkers.isUsers(value)) {
    return value.map(v => v.name).join(', ');
  }
  return '';
};

const mergeObjects = (obj1: object, obj2: object) => {
  return {
    ...obj1,
    ...Object.fromEntries(
      Object.entries(obj2).filter(([, value]) => (value ?? '') !== ''),
    ),
  };
};

const initConfig = {
  mailId: '',
  host: '',
  port: 465,
  secure: false,
  username: '',
  password: '',
  subject_template: '',
  content_template: '',
};

type IConfig = typeof initConfig;

const Index = () => {
  const { t } = useTranslation();

  const [ready, setReady] = useState(false);
  const [loading, setLoding] = useState(false);
  const [table, setTable] = useState<ITable>();
  const [tableName, setTableName] = useState<string>('');
  const [view, setView] = useState<IGridView>();
  const [recordId, setRecordId] = useState<string | null>('');
  const [record, setRecord] = useState<Map<string, string>>();
  const [fieldMetaList, setFieldMetaList] = useState<IFieldMeta[]>();
  const formRef = useRef<Form>(null);
  const [preview, setPreview] = useState(<></>);
  const [done, { inc: incDone, reset: resetDone }] = useCounter(0);
  const [fail, { inc: incFail, reset: resetFail }] = useCounter(0);
  const [total, { inc: incTotal, reset: resetTotal }] = useCounter(0);
  const [config, setConfig] = useState<IConfig>(initConfig);

  const { run: setConfigDebounce } = useDebounceFn(setConfig, {
    wait: 300,
  });

  // 获取当前打开的表格
  useAsyncEffect(async () => {
    await updateActiveTable();
    bitable.base.onSelectionChange(async event => {
      if (table?.id !== event.data.tableId) {
        await updateActiveTable();
      }
      if (view?.id !== event.data.viewId) {
        await updateActiveView();
      }
      if (recordId !== event.data.recordId) {
        setRecordId(event.data.recordId);
      }
    });
  }, []);

  // 同步table
  const updateActiveTable = async () => {
    const table = await bitable.base.getActiveTable();
    table.onFieldModify(updateFieldMetaList);
    setTable(table);
    setTableName(await table.getName());
    await updateFieldMetaList();

    const meta = await table.getMeta();
    const data = await bitable.bridge.getData<IConfig>(`${meta.id}.config`);
    setConfig(mergeObjects(initConfig, data) as IConfig);
  };

  useEffect(() => {
    formRef.current?.formApi.setValues(config);
  }, [formRef.current, config]);

  // 同步view
  const updateActiveView = useMemoizedFn(async () => {
    if (!table) {
      return;
    }
    const view = await table?.getActiveView();
    const type = await view.getType();
    if (type === ViewType.Grid) {
      setView(view as IGridView);
    }
  });

  useAsyncEffect(updateActiveView, [table]);

  // 切换表格后清空当前行
  useAsyncEffect(async () => {
    setRecordId(null);
    setRecord(undefined);
  }, [table, fieldMetaList]);

  // 获取当前行
  useAsyncEffect(
    useMemoizedFn(async () => {
      if (!table || !fieldMetaList || !recordId) {
        return;
      }
      const data = new Map<string, string>();
      for (const field of fieldMetaList) {
        const value = await table.getCellString(field.id, recordId);
        data.set(field.id, value);
        data.set(field.name, value);
      }
      setRecord(data);
    }),
    [recordId],
  );

  // 同步当前table的field
  const updateFieldMetaList = useMemoizedFn(async () => {
    if (!table) {
      return;
    }
    const fieldMetaList = await table.getFieldMetaList();
    setFieldMetaList(fieldMetaList);
  });

  // 同步配置
  useAsyncEffect(async () => {
    if (!fieldMetaList) {
      return;
    }
    if (config && Object.keys(config).length) {
      if (!fieldMetaList?.some(f => f.id === config.mailId)) {
        requestAnimationFrame(() => {
          formRef?.current?.formApi.setValue('mailId', '');
        });
      }
    }
    setReady(true);
  }, [fieldMetaList]);

  const onSend = async (all: boolean) => {
    try {
      await formRef.current?.formApi.validate();
    } catch (error: any) {}
    if (!table || !view || !fieldMetaList || loading) {
      return;
    }
    setLoding(true);
    resetDone();
    resetFail();
    resetTotal();
    table.getMeta().then(meta => {
      bitable.bridge.setData(`${meta.id}.config`, config);
    });
    const checked = await Check({ data: config });
    if (!checked.success) {
      bitable.ui.showToast({
        toastType: ToastType.warning,
        message: `${t('conf_err_login')} ${checked.msg}`,
      });
      return;
    }
    const { add, wait } = ParallelPromise(6);
    let recordsID: (string | undefined)[] = [];
    if (all) {
      recordsID = await view.getVisibleRecordIdList();
    } else {
      recordsID = await view.getSelectedRecordIdList();
    }
    if (recordsID.length === 0) {
      bitable.ui.showToast({
        toastType: ToastType.warning,
        message: t('nosend'),
      });
      return;
    }
    incTotal(recordsID.length);
    for (const rid of recordsID) {
      if (!rid) {
        continue;
      }
      const record = await table.getRecordById(rid);
      const data = new Map<string, string>();
      for (const field of fieldMetaList) {
        const value = cellToString(record.fields[field.id]);
        data.set(field.id, value);
        data.set(field.name, value);
      }
      if (!data.get(config.mailId)) {
        incTotal(-1);
        continue;
      }

      const wait = sendSingle(Object.fromEntries(data));
      await add(wait);
    }
    await wait();
    setLoding(false);
    bitable.ui.showToast({
      toastType: ToastType.success,
      message: t('send_done'),
    });
  };

  const sendSingle = async (record: any) => {
    try {
      const data = {
        ...config,
        to: record[config.mailId],
        subject: compile(config.subject_template, record),
        content: compile(config.content_template, record),
      };
      const result = await Send({
        data,
      });
      if (result.success) {
        incDone();
      } else {
        incFail();
      }
    } catch (error: any) {
      console.error(`sendSigle error`, error);
      incFail();
    }
  };

  const sendSelf = async () => {
    try {
      await formRef.current?.formApi.validate();
    } catch (error: any) {}
    if (!table || !view || !fieldMetaList || !record || loading) {
      return;
    }
    setLoding(true);
    table.getMeta().then(meta => {
      bitable.bridge.setData(`${meta.id}.config`, config);
    });
    const checked = await Check({ data: config });
    if (!checked.success) {
      bitable.ui.showToast({
        toastType: ToastType.warning,
        message: `${t('conf_err_login')} ${checked.msg}`,
      });
      setLoding(false);
      return;
    }
    const data = {
      ...config,
      to: config.username,
      subject: compile(config.subject_template, record),
      content: compile(config.content_template, record),
    };
    const result = await Send({
      data,
    });
    bitable.ui.showToast({
      toastType: result.success ? ToastType.success : ToastType.warning,
      message: `to:${config.username} ${
        result.success ? t('send_succ') : t('send_fail')
      } ${result.msg}`,
    });
    setLoding(false);
  };

  const getPreview = useMemoizedFn(() => {
    let subject = '';
    let content = '';
    if (Boolean(record) && Boolean(formRef?.current)) {
      subject = compile(config.subject_template, Object.fromEntries(record!));
      content = compile(config.content_template, Object.fromEntries(record!));
    }
    return (
      <>
        {!record && (
          <Card>
            <Typography.Text className="p-4 text-wrap whitespace-normal">
              {t('preview_tip')}
            </Typography.Text>
          </Card>
        )}
        {record && (
          <div className="gap-4 grid grid-cols-[3rem_1fr] grid-rows-[repeat(2,minmax(0,1fr)),repeat(4,auto)] p-4 w-[90vw] max-w-[90vw] ">
            <div className="bg-gray-100 w-12">{t('from')}</div>
            <div className="">{config.username}</div>
            <div className="bg-gray-100 w-12">{t('to')}</div>
            <div className="">{record.get(config.mailId ?? '') ?? ''}</div>
            <div className="col-span-2 bg-gray-100">{t('subject')}</div>
            <div className="col-span-2  w-[calc(100wv-50px)] text-wrap whitespace-normal">
              {subject}
            </div>
            <div className="col-span-2 bg-gray-100">{t('content')}</div>
            <div
              className="col-span-2 max-h-[30vh] h-[30vh] border-2 border-gray-100 overflow-auto text-wrap whitespace-normal"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: content }}
            ></div>
          </div>
        )}
      </>
    );
  });

  if (!ready) {
    return (
      <Skeleton
        active
        placeholder={<Skeleton.Paragraph rows={10} />}
        loading={!ready}
      />
    );
  }

  return (
    <div className="m-4 mt-0">
      <Typography.Text type={'secondary'} className="inline-block mb-4">
        {t('current_table')}: {tableName}
      </Typography.Text>
      <Form
        ref={formRef}
        labelPosition="top"
        initValues={config}
        onValueChange={setConfigDebounce}
        allowEmpty
        disabled={loading}
      >
        <Form.Section text={t('mail_tpl')}>
          <Form.Select
            field="mailId"
            label={t('mail_field')}
            rules={[{ required: true }]}
            className="w-full"
          >
            {fieldMetaList
              ?.filter(f => f.type === FieldType.Email)
              ?.map(f => (
                <Form.Select.Option key={f.id} value={f.id}>
                  {f.name}
                </Form.Select.Option>
              ))}
          </Form.Select>
          <Form.TextArea
            field="subject_template"
            label={{
              text: t('mail_subject_tpl'),
              extra: (
                <Tooltip content={t('tpl_tip')}>
                  <IconHelpCircle
                    style={{ color: 'var(--semi-color-text-2)' }}
                  />
                </Tooltip>
              ),
            }}
            autosize={{ minRows: 1, maxRows: 5 }}
          />
          <Form.TextArea
            field="content_template"
            label={{
              text: t('content_tpl'),
              extra: (
                <Tooltip content={t('tpl_tip')}>
                  <IconHelpCircle
                    style={{ color: 'var(--semi-color-text-2)' }}
                  />
                </Tooltip>
              ),
            }}
            autosize={{ minRows: 3, maxRows: 10 }}
          />
        </Form.Section>
        <Form.Section text={t('sender_cfg')} />
        <Form.InputGroup
          className="w-full"
          label={{ text: <span>{t('addrs')}</span>, required: true }}
        >
          <Form.Input
            field="host"
            placeholder={t('host')}
            className="w-3/6"
            rules={[{ required: true }]}
          />
          <Form.InputNumber
            field="port"
            placeholder={t('port')}
            className="w-3/12"
            hideButtons
            rules={[{ required: true }]}
          />
          <Form.Checkbox field="secure" className="ml-4">
            TLS
          </Form.Checkbox>
        </Form.InputGroup>
        <Form.InputGroup
          className="w-full"
          label={{ text: <span>{t('users')}</span>, required: true }}
        >
          <Form.Input
            field="username"
            placeholder={t('username')}
            className="w-3/6"
            rules={[{ required: true }]}
          />
          <Form.Input
            field="password"
            placeholder={t('password')}
            className="w-3/6"
            mode="password"
            rules={[{ required: true }]}
          />
        </Form.InputGroup>
        <Divider className="mt-4" />
        <Row className="mt-8">
          <Col span={16}>
            <Space spacing="loose">
              <Popover
                content={preview}
                onVisibleChange={isVisible =>
                  isVisible && setPreview(getPreview())
                }
              >
                <Button type="secondary" theme="borderless">
                  {t('preview')}
                </Button>
              </Popover>
              <Tooltip content={t('send_self_tip')}>
                <Button
                  disabled={!record || record.size === 0}
                  onClick={sendSelf}
                  loading={loading}
                  theme="borderless"
                  type="secondary"
                >
                  {t('send_self')}
                </Button>
              </Tooltip>
            </Space>
          </Col>
          <Col span={8} className="mt-1">
            <Typography.Text
              icon={<span className="icon-doc"></span>}
              underline
              link={{
                target: '_blank',
                href: 'https://ejfk-dev.feishu.cn/wiki/VG1UwHsPti692jktNJTc4fpEnHe',
              }}
            >
              {t('usage_guide')}
            </Typography.Text>
          </Col>
        </Row>
        <Row className="mt-8">
          <Col>
            <Space spacing="loose">
              <Popconfirm
                title={t('confirm_checked')}
                onConfirm={() => onSend(false)}
                disabled={loading}
              >
                <Button
                  loading={loading}
                  size="large"
                  theme="solid"
                  type="secondary"
                >
                  {t('send_checked')}
                </Button>
              </Popconfirm>
              <Popconfirm
                title={t('comfirm_all')}
                onConfirm={() => onSend(true)}
                disabled={loading}
              >
                <Button
                  loading={loading}
                  size="large"
                  theme="solid"
                  type="primary"
                >
                  {t('send_all')}
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </Form>
      {total > 0 && (
        <>
          <CProgressStacked style={{ height: '8px', marginTop: '16px' }}>
            <CProgress
              height={8}
              color="success"
              animated
              value={total > 0 ? (done / total) * 100 : 0}
            />
            <CProgress
              height={8}
              color="danger"
              value={total > 0 ? (fail / total) * 100 : 0}
            />
          </CProgressStacked>
          <Typography.Text type="secondary">{`✅${done}   ❎${fail}   / ⌛️${total}`}</Typography.Text>
        </>
      )}
    </div>
  );
};

export default Index;
