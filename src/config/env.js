// 模型接口基础地址优先读取环境变量。
// 如果本地没有显式配置，就回退到默认的 SiliconFlow 地址。
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.siliconflow.cn/v1'
