import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// No 0/O/1/I so codes are easy to read aloud and type on a tablet.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const MAX_PHRASE_CHARS = 600;
const RECENT_PHRASES = 30;

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

async function findClassroom(ctx: QueryCtx, code: string): Promise<Doc<"classrooms"> | null> {
  return await ctx.db
    .query("classrooms")
    .withIndex("by_code", (q) => q.eq("code", normaliseCode(code)))
    .unique();
}

export const create = mutation({
  args: { title: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = "";
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (await findClassroom(ctx, code)) continue;
      await ctx.db.insert("classrooms", { code, title: args.title.trim().slice(0, 80) || "Lesson" });
      return code;
    }
    throw new ConvexError("Could not allocate a classroom code, try again");
  },
});

export const getByCode = query({
  args: { code: v.string() },
  returns: v.union(v.null(), v.object({ code: v.string(), title: v.string() })),
  handler: async (ctx, args) => {
    const room = await findClassroom(ctx, args.code);
    return room ? { code: room.code, title: room.title } : null;
  },
});

export const say = mutation({
  args: { code: v.string(), text: v.string(), lang: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (!text) return null;
    if (text.length > MAX_PHRASE_CHARS) throw new ConvexError("Phrase too long");
    const room = await findClassroom(ctx, args.code);
    if (!room) throw new ConvexError("Classroom not found");
    await ctx.db.insert("phrases", { classroomId: room._id, text, lang: args.lang.slice(0, 16) });
    return null;
  },
});

/** Most recent phrases in chronological order. */
export const recentPhrases = query({
  args: { code: v.string() },
  returns: v.array(v.object({ _id: v.id("phrases"), _creationTime: v.number(), text: v.string(), lang: v.string() })),
  handler: async (ctx, args) => {
    const room = await findClassroom(ctx, args.code);
    if (!room) return [];
    const rows = await ctx.db
      .query("phrases")
      .withIndex("by_classroomId", (q) => q.eq("classroomId", room._id))
      .order("desc")
      .take(RECENT_PHRASES);
    return rows.reverse().map(({ _id, _creationTime, text, lang }) => ({ _id, _creationTime, text, lang }));
  },
});
