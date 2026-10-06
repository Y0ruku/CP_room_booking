import { getFirebaseAuth } from "./firebase";

export type Account = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "USER";
  active: boolean;
};

export type Room = {
  id: number;
  roomCode: string;
  name: string;
  roomType: "MEETING" | "CONFERENCE" | "TRAINING" | "PRIVATE";
  capacity: number;
  description: string | null;
  available: boolean;
};

export type Booking = {
  id: number;
  roomId: number;
  roomCode: string;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  bookedBy: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
};

export type BookingSchedule = Pick<
  Booking,
  "id" | "roomId" | "roomCode" | "roomName" | "bookingDate" | "startTime" | "endTime" | "bookedBy" | "status"
>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080")
  .replace(/\/+$/, "");

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      throw new ApiError("กรุณาเข้าสู่ระบบก่อนใช้งาน", 401);
    }
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("เชื่อมต่อ backend ไม่ได้ ตรวจสอบ URL และสถานะของ backend", 0);
  }

  if (!response.ok) {
    const message = response.status === 401
      ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
      : response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์ทำรายการดังกล่าว"
        : `backend ตอบกลับด้วยสถานะ ${response.status}`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
