import { NextResponse } from "next/server";
import { analyzeACStatus, ROUTE_TYPE_BUS } from "@/lib/analysis";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300";
const ERROR_CACHE_CONTROL = "public, s-maxage=5";

export async function GET() {
  try {
    const analysis = await analyzeACStatus(ROUTE_TYPE_BUS);
    return NextResponse.json(analysis, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    console.error("bus API failed", error);
    return NextResponse.json(
      { error: "Failed to fetch bus status" },
      { status: 500, headers: { "Cache-Control": ERROR_CACHE_CONTROL } },
    );
  }
}
