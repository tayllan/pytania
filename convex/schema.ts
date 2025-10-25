import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  decks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
  }).index("by_user", ["userId"]),

  questions: defineTable({
    deckId: v.id("decks"),
    type: v.union(v.literal("match"), v.literal("multiple_choice"), v.literal("free_text")),
    
    // For match questions: array of {question, answer} pairs
    matchPairs: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),
    
    // For multiple choice questions
    question: v.optional(v.string()),
    choices: v.optional(v.array(v.string())),
    correctIndices: v.optional(v.array(v.number())),
    
    // For free text questions
    prompt: v.optional(v.string()),
    
    order: v.number(),
  }).index("by_deck", ["deckId"]),

  sessions: defineTable({
    deckId: v.id("decks"),
    userId: v.id("users"),
    mode: v.union(v.literal("exam"), v.literal("practice")),
    timeLimit: v.optional(v.number()), // in seconds, for exam mode
    startTime: v.number(),
    endTime: v.optional(v.number()),
    completed: v.boolean(),
  }).index("by_user", ["userId"]),

  answers: defineTable({
    sessionId: v.id("sessions"),
    questionId: v.id("questions"),
    
    // For match questions: array of {questionIndex, answerIndex}
    matchAnswers: v.optional(v.array(v.object({
      questionIndex: v.number(),
      answerIndex: v.number(),
    }))),
    
    // For multiple choice: array of selected indices
    selectedIndices: v.optional(v.array(v.number())),
    
    // For free text
    textAnswer: v.optional(v.string()),
    llmFeedback: v.optional(v.string()),
    
    isCorrect: v.optional(v.boolean()),
    answeredAt: v.number(),
  }).index("by_session", ["sessionId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
