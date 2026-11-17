import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),

  /** A live lesson. Students join with the short `code`. */
  classrooms: defineTable({
    code: v.string(),
    title: v.string(),
  }).index("by_code", ["code"]),

  /**
   * What the teacher said, in the spoken language. Each student device translates
   * phrases into its own chosen sign language, so one teacher serves SASL, NSL, KSL… at once.
   */
  phrases: defineTable({
    classroomId: v.id("classrooms"),
    text: v.string(),
    lang: v.string(),
  }).index("by_classroomId", ["classroomId"]),
});
