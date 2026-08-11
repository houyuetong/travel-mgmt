import i18n from '../i18n/index.js';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn.js';

const DISPLAY_MAP = {
  '待审核': { zh: '待审核', en: 'Pending' },
  '已通过': { zh: '已通过', en: 'Approved' },
  '已拒绝': { zh: '已拒绝', en: 'Rejected' },
  '已撤回': { zh: '已撤回', en: 'Withdrawn' },
  '管理员': { zh: '管理员', en: 'Administrator' },
  '普通员工': { zh: '普通员工', en: 'Employee' },
  '启用': { zh: '启用', en: 'Active' },
  '禁用': { zh: '禁用', en: 'Disabled' },
  '火车': { zh: '火车', en: 'Train' },
  '飞机': { zh: '飞机', en: 'Flight' },
  '汽车': { zh: '汽车', en: 'Car/Bus' },
  '高铁': { zh: '高铁', en: 'High-speed Rail' },
  '轮船': { zh: '轮船', en: 'Ship' },
  '其他': { zh: '其他', en: 'Other' },
};

export function mapDisplay(value, lang = i18n.language) {
  const entry = DISPLAY_MAP[value];
  return entry ? (lang === 'en-US' ? entry.en : entry.zh) : value;
}

export const displayText = (value) => mapDisplay(value, i18n.language);

export function formatDate(value, lang = i18n.language) {
  if (!value) return '';
  const d = dayjs(value);
  return lang === 'en-US' ? d.format('MMM D, YYYY') : d.format('YYYY-MM-DD');
}

export function formatDateTime(value, lang = i18n.language) {
  if (!value) return '';
  const d = dayjs(value);
  return lang === 'en-US' ? d.format('MMM D, YYYY HH:mm') : d.format('YYYY-MM-DD HH:mm');
}

export function formatCurrency(value, lang = i18n.language) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value ?? '');
  return n.toLocaleString(lang === 'en-US' ? 'en-US' : 'zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function syncDayjsLocale(lang = i18n.language) {
  dayjs.locale(lang === 'en-US' ? 'en' : 'zh-cn');
}