import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

export const create = mutation({
  args: {
    deckId: v.id("decks"),
    mode: v.union(v.literal("exam"), v.literal("practice")),
    timeLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found");
    }
    
    return await ctx.db.insert("sessions", {
      deckId: args.deckId,
      userId,
      mode: args.mode,
      timeLimit: args.timeLimit,
      startTime: Date.now(),
      completed: false,
    });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      return null;
    }
    
    return session;
  },
});

export const complete = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }
    
    await ctx.db.patch(args.sessionId, {
      completed: true,
      endTime: Date.now(),
    });
  },
});

export const submitAnswer = mutation({
  args: {
    sessionId: v.id("sessions"),
    questionId: v.id("questions"),
    matchAnswers: v.optional(v.array(v.object({
      questionIndex: v.number(),
      answerIndex: v.number(),
    }))),
    selectedIndices: v.optional(v.array(v.number())),
    textAnswer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }
    
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }
    
    // Check if answer already exists
    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("questionId"), args.questionId))
      .first();
    
    let isCorrect: boolean | undefined = undefined;
    
    // Calculate correctness for match and multiple choice
    if (question.type === "match" && args.matchAnswers) {
      isCorrect = args.matchAnswers.every((answer) => {
        const pair = question.matchPairs![answer.questionIndex];
        const expectedAnswer = question.matchPairs![answer.answerIndex];
        return pair.answer === expectedAnswer.answer;
      });
    } else if (question.type === "multiple_choice" && args.selectedIndices) {
      const correctSet = new Set(question.correctIndices);
      const selectedSet = new Set(args.selectedIndices);
      isCorrect = correctSet.size === selectedSet.size &&
        [...correctSet].every((i) => selectedSet.has(i));
    }
    
    if (existingAnswer) {
      await ctx.db.patch(existingAnswer._id, {
        matchAnswers: args.matchAnswers,
        selectedIndices: args.selectedIndices,
        textAnswer: args.textAnswer,
        isCorrect,
        answeredAt: Date.now(),
      });
      return existingAnswer._id;
    } else {
      return await ctx.db.insert("answers", {
        sessionId: args.sessionId,
        questionId: args.questionId,
        matchAnswers: args.matchAnswers,
        selectedIndices: args.selectedIndices,
        textAnswer: args.textAnswer,
        isCorrect,
        answeredAt: Date.now(),
      });
    }
  },
});

export const getAnswers = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      return [];
    }
    
    return await ctx.db
      .query("answers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const evaluateFreeText = action({
  args: {
    answerId: v.id("answers"),
    question: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI({
      baseURL: process.env.CONVEX_OPENAI_BASE_URL,
      apiKey: process.env.CONVEX_OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert veterinary medicine professor evaluating student answers. Provide constructive feedback on the student's answer, noting what they got right and what could be improved. Be encouraging but accurate. Keep your response concise (2-3 sentences).",
        },
        {
          role: "user",
          content: `Question: ${args.question}\n\nStudent Answer: ${args.answer}\n\nProvide feedback on this answer.`,
        },
      ],
    });
    
    const feedback = response.choices[0].message.content || "Unable to evaluate answer.";
    
    await ctx.runMutation(internal.sessions.updateFeedback, {
      answerId: args.answerId,
      feedback,
    });
    
    return feedback;
  },
});

export const updateFeedback = internalMutation({
  args: {
    answerId: v.id("answers"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.answerId, {
      llmFeedback: args.feedback,
    });
  },
});
