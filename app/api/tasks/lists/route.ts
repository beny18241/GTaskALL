import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoogleTasksAPI } from "@/lib/google-tasks";

export async function GET() {
  const session = await auth();
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    const lists = await api.getTaskLists();
    return NextResponse.json(lists);
  } catch (error: any) {
    console.error("Get task lists error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch task lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title } = body;

  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    const list = await api.createTaskList(title);
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Create task list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create task list" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const listId = searchParams.get("listId");

  if (!listId) {
    return NextResponse.json(
      { error: "listId is required" },
      { status: 400 }
    );
  }

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    await api.deleteTaskList(listId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete task list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete task list" },
      { status: 500 }
    );
  }
}
