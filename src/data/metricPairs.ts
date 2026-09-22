import { MetricPairDefinition, MetricCategory } from '../types';

export const METRIC_PAIRS: MetricPairDefinition[] = [
  {
    id: 'total',
    order: 1,
    name: 'Tổng Toàn Site (Overall Total)',
    shortLabel: 'Total',
    category: 'total',
    categoryLabel: 'Tổng quan',
    pvKey: 'pageviews',
    uKey: 'user',
    pvHeader: 'Pageviews',
    uHeader: 'User',
    color: '#e11d48', // rose-600
    description: 'Toàn bộ lượt xem trang và tổng số độc giả duy nhất truy cập Ngôi Sao.'
  },
  {
    id: 'ex_direct',
    order: 2,
    name: 'Ex-Direct (Trực tiếp)',
    shortLabel: 'Ex-Direct',
    category: 'external',
    categoryLabel: 'Nguồn Ngoài',
    pvKey: 'p_ex_direct',
    uKey: 'u_ex_direct',
    pvHeader: 'P- Ex-Direct',
    uHeader: 'U- Ex-Direct',
    color: '#2563eb', // blue-600
    description: 'Độc giả gõ trực tiếp tên miền ngoisao.net hoặc mở từ bookmark.'
  },
  {
    id: 'ex_google',
    order: 3,
    name: 'Ex-Google (Tìm kiếm)',
    shortLabel: 'Ex-Google',
    category: 'external',
    categoryLabel: 'Nguồn Ngoài',
    pvKey: 'p_ex_google',
    uKey: 'u_ex_google',
    pvHeader: 'P- Ex-Google',
    uHeader: 'U- Ex-Google',
    color: '#059669', // emerald-600
    description: 'Lưu lượng truy cập từ kết quả tìm kiếm tự nhiên của Google.'
  },
  {
    id: 'ex_social',
    order: 4,
    name: 'Ex-Social (Mạng xã hội)',
    shortLabel: 'Ex-Social',
    category: 'external',
    categoryLabel: 'Nguồn Ngoài',
    pvKey: 'p_ex_social',
    uKey: 'u_ex_social',
    pvHeader: 'P- Ex-Social',
    uHeader: 'U- Ex-Social',
    color: '#7c3aed', // violet-600
    description: 'Lưu lượng từ Facebook, Zalo, TikTok, Threads, Instagram.'
  },
  {
    id: 'ex_referer',
    order: 5,
    name: 'Ex-Referer (Giới thiệu)',
    shortLabel: 'Ex-Referer',
    category: 'external',
    categoryLabel: 'Nguồn Ngoài',
    pvKey: 'p_ex_referer',
    uKey: 'u_ex_referer',
    pvHeader: 'P- Ex-Referer',
    uHeader: 'U- Ex-Referer',
    color: '#d97706', // amber-600
    description: 'Lưu lượng dẫn nguồn từ các trang web báo chí, đối tác, diễn đàn khác.'
  },
  {
    id: 'in_home',
    order: 6,
    name: 'In-Home (Trang chủ)',
    shortLabel: 'In-Home',
    category: 'internal',
    categoryLabel: 'Khu Vực Trang',
    pvKey: 'p_in_home',
    uKey: 'u_in_home',
    pvHeader: 'P- In-Home',
    uHeader: 'U- In-Home',
    color: '#0284c7', // sky-600
    description: 'Hành vi và lưu lượng tại Trang chủ Ngôi Sao.'
  },
  {
    id: 'in_folder',
    order: 7,
    name: 'In-Folder (Chuyên mục)',
    shortLabel: 'In-Folder',
    category: 'internal',
    categoryLabel: 'Khu Vực Trang',
    pvKey: 'p_in_folder',
    uKey: 'u_in_folder',
    pvHeader: 'P- In-Folder',
    uHeader: 'U- In-Folder',
    color: '#0891b2', // cyan-600
    description: 'Các trang danh mục tin tức (Hậu trường, Showbiz, Phong cách, ...).'
  },
  {
    id: 'in_detail',
    order: 8,
    name: 'In-Detail (Chi tiết bài viết)',
    shortLabel: 'In-Detail',
    category: 'internal',
    categoryLabel: 'Khu Vực Trang',
    pvKey: 'p_in_detail',
    uKey: 'u_in_detail',
    pvHeader: 'P- In-Detail',
    uHeader: 'U- In-Detail',
    color: '#db2777', // pink-600
    description: 'Các trang bài viết cụ thể, nơi độc giả đọc nội dung chi tiết.'
  },
  {
    id: 'in_other',
    order: 9,
    name: 'In-Other (Trang khác)',
    shortLabel: 'In-Other',
    category: 'internal',
    categoryLabel: 'Khu Vực Trang',
    pvKey: 'p_in_other',
    uKey: 'u_in_other',
    pvHeader: 'P- In-Other',
    uHeader: 'U- In-Other',
    color: '#64748b', // slate-500
    description: 'Các trang vệ tinh, trang tìm kiếm, video, hình ảnh hoặc trang chuyên đề.'
  },
  {
    id: 'do',
    order: 10,
    name: 'DO (Direct Only)',
    shortLabel: 'DO',
    category: 'distribution',
    categoryLabel: 'Phân Loại Lưu Lượng',
    pvKey: 'p_do',
    uKey: 'u_do',
    pvHeader: 'P- DO',
    uHeader: 'U- DO',
    color: '#ea580c', // orange-600
    description: 'Phân loại lưu lượng độc lập DO.'
  },
  {
    id: 'ov',
    order: 11,
    name: 'OV (Other Visit)',
    shortLabel: 'OV',
    category: 'distribution',
    categoryLabel: 'Phân Loại Lưu Lượng',
    pvKey: 'p_ov',
    uKey: 'u_ov',
    pvHeader: 'P- OV',
    uHeader: 'U- OV',
    color: '#4f46e5', // indigo-600
    description: 'Phân loại lưu lượng mở rộng OV.'
  },
  {
    id: 'unknown',
    order: 12,
    name: 'Unknown (Không xác định)',
    shortLabel: 'Unknown',
    category: 'distribution',
    categoryLabel: 'Phân Loại Lưu Lượng',
    pvKey: 'p_unknown',
    uKey: 'u_unknown',
    pvHeader: 'P- Unknown',
    uHeader: 'U- Unknown',
    color: '#94a3b8', // slate-400
    description: 'Lưu lượng chưa định danh được nguồn gốc.'
  },
  {
    id: 'mobile',
    order: 13,
    name: 'Mobile (Điện thoại)',
    shortLabel: 'Mobile',
    category: 'device',
    categoryLabel: 'Thiết Bị',
    pvKey: 'p_mobile',
    uKey: 'u_mobile',
    pvHeader: 'P- Mobile',
    uHeader: 'U- Mobile',
    color: '#10b981', // emerald-500
    description: 'Truy cập qua trình duyệt trên điện thoại di động (iOS & Android Web).'
  },
  {
    id: 'pc',
    order: 14,
    name: 'PC (Máy tính)',
    shortLabel: 'PC',
    category: 'device',
    categoryLabel: 'Thiết Bị',
    pvKey: 'p_pc',
    uKey: 'u_pc',
    pvHeader: 'P- PC',
    uHeader: 'U- PC',
    color: '#3b82f6', // blue-500
    description: 'Truy cập qua trình duyệt máy tính bàn và laptop.'
  },
  {
    id: 'app',
    order: 15,
    name: 'App (Ứng dụng)',
    shortLabel: 'App',
    category: 'device',
    categoryLabel: 'Thiết Bị',
    pvKey: 'p_app',
    uKey: 'u_app',
    pvHeader: 'P- App',
    uHeader: 'U- App',
    color: '#8b5cf6', // purple-500
    description: 'Lưu lượng từ ứng dụng di động chính thức.'
  },
  {
    id: 'tablet',
    order: 16,
    name: 'Tablet (Máy tính bảng)',
    shortLabel: 'Tablet',
    category: 'device',
    categoryLabel: 'Thiết Bị',
    pvKey: 'p_tablet',
    uKey: 'u_tablet',
    pvHeader: 'P- Tablet',
    uHeader: 'U- Tablet',
    color: '#f59e0b', // amber-500
    description: 'Truy cập qua máy tính bảng iPad, Samsung Tab...'
  }
];

export const CATEGORIES: { id: MetricCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả các cặp (16 cặp)' },
  { id: 'total', label: 'Tổng quan (1)' },
  { id: 'external', label: 'Nguồn Ngoài (4)' },
  { id: 'internal', label: 'Khu Vực Trang (4)' },
  { id: 'distribution', label: 'Phân Loại (3)' },
  { id: 'device', label: 'Thiết Bị (4)' }
];
