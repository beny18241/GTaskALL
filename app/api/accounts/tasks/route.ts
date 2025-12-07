import { NextRequest, NextResponse } from "next/server";
import { GoogleTasksAPI } from "@/lib/google-tasks";

// This endpoint fetches tasks for a specific account using provided access token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, accountId, listId, showCompleted = false } = body;

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: "accessToken and accountId are required" },
        { status: 400 }
      );
    }

    const api = new GoogleTasksAPI(accessToken, accountId);

    if (listId) {
      // Fetch tasks for a specific list
      const tasks = await api.getTasks(listId, showCompleted);
      return NextResponse.json(tasks);
    } else {
      // Fetch all task lists
      const lists = await api.getTaskLists();
      return NextResponse.json(lists);
    }
  } catch (error: any) {
    console.error("Account tasks API error:", error);
    
    // Check if token is expired
    if (error.message?.includes("401") || error.message?.includes("Invalid Credentials")) {
      return NextResponse.json(
        { error: "Token expired", code: "TOKEN_EXPIRED" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
