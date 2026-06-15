import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const PROFILE_FILE = join(DATA_DIR, "profile.json");

interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
}

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

async function loadProfile(): Promise<ProfileData | null> {
  try {
    const data = await readFile(PROFILE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveProfile(profile: ProfileData): Promise<void> {
  await ensureDataDir();
  await writeFile(PROFILE_FILE, JSON.stringify(profile, null, 2), "utf-8");
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("pbt_session");
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await loadProfile();
  
  if (!profile) {
    return NextResponse.json({
      firstName: "",
      lastName: "",
      username: "",
    });
  }

  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get("pbt_session");
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, username } = body;

    const profile: ProfileData = {
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      username: String(username || "").trim(),
    };

    await saveProfile(profile);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
