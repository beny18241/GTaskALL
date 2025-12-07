import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoogleTasksAPI } from "@/lib/google-tasks";

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const listId = searchParams.get("listId");
  const showCompleted = searchParams.get("showCompleted") === "true";

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    if (listId) {
      const tasks = await api.getTasks(listId, showCompleted);
      return NextResponse.json(tasks);
    } else {
      // Get all task lists first
      const lists = await api.getTaskLists();
      return NextResponse.json(lists);
    }
  } catch (error: any) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tasks" },
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
  const { listId, title, notes, due, priority } = body;

  if (!listId || !title) {
    return NextResponse.json(
      { error: "listId and title are required" },
      { status: 400 }
    );
  }

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    const task = await api.createTask(listId, { title, notes, due, priority });
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { listId, taskId, ...updates } = body;

  if (!listId || !taskId) {
    return NextResponse.json(
      { error: "listId and taskId are required" },
      { status: 400 }
    );
  }

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    const task = await api.updateTask(listId, taskId, updates);
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update task" },
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
  const taskId = searchParams.get("taskId");

  if (!listId || !taskId) {
    return NextResponse.json(
      { error: "listId and taskId are required" },
      { status: 400 }
    );
  }

  const api = new GoogleTasksAPI(session.accessToken, session.user.id);

  try {
    await api.deleteTask(listId, taskId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}
