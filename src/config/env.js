// 接口地址优先读取环境变量，方便本地和生产环境切换。
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.siliconflow.cn/v1'
