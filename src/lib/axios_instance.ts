// lib/axiosInstance.ts
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
  timeout: 10000, // 10 วินาที
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: interceptor สำหรับ handle error กลาง
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;