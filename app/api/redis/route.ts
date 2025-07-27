// app/api/redis/route.ts
import { NextResponse } from "next/server";
import redis from "@/lib/redis"; // esto importa la conexión que creaste en /lib/redis.ts

export const POST = async () => {
  const value = await redis.get("item"); // busca la clave "item" en tu Redis
  return new NextResponse(JSON.stringify({ value }), { status: 200 });
};
