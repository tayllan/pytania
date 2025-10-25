import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) {
      return [];
    }
    
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
    
    return questions.sort((a, b) => a.order - b.order);
  },
});

export const createMatch = mutation({
  args: {
    deckId: v.id("decks"),
    pairs: v.array(v.object({
      question: v.string(),
      answer: v.string(),
    })),
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
    
    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
    
    const order = existingQuestions.length;
    
    return await ctx.db.insert("questions", {
      deckId: args.deckId,
      type: "match",
      matchPairs: args.pairs,
      order,
    });
  },
});

export const createMultipleChoice = mutation({
  args: {
    deckId: v.id("decks"),
    question: v.string(),
    choices: v.array(v.string()),
    correctIndices: v.array(v.number()),
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
    
    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
    
    const order = existingQuestions.length;
    
    return await ctx.db.insert("questions", {
      deckId: args.deckId,
      type: "multiple_choice",
      question: args.question,
      choices: args.choices,
      correctIndices: args.correctIndices,
      order,
    });
  },
});

export const createFreeText = mutation({
  args: {
    deckId: v.id("decks"),
    prompt: v.string(),
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
    
    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
    
    const order = existingQuestions.length;
    
    return await ctx.db.insert("questions", {
      deckId: args.deckId,
      type: "free_text",
      prompt: args.prompt,
      order,
    });
  },
});

export const updateMatch = mutation({
  args: {
    questionId: v.id("questions"),
    pairs: v.array(v.object({
      question: v.string(),
      answer: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const deck = await ctx.db.get(question.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.questionId, {
      matchPairs: args.pairs,
    });
  },
});

export const updateMultipleChoice = mutation({
  args: {
    questionId: v.id("questions"),
    question: v.string(),
    choices: v.array(v.string()),
    correctIndices: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingQuestion = await ctx.db.get(args.questionId);
    if (!existingQuestion) {
      throw new Error("Question not found");
    }

    const deck = await ctx.db.get(existingQuestion.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.questionId, {
      question: args.question,
      choices: args.choices,
      correctIndices: args.correctIndices,
    });
  },
});

export const updateFreeText = mutation({
  args: {
    questionId: v.id("questions"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const deck = await ctx.db.get(question.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.questionId, {
      prompt: args.prompt,
    });
  },
});

export const remove = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const deck = await ctx.db.get(question.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.questionId);
  },
});
