import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const decks = await ctx.db
      .query("decks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Get question counts for each deck
    const decksWithCounts = await Promise.all(
      decks.map(async (deck) => {
        const questions = await ctx.db
          .query("questions")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .collect();
        return {
          ...deck,
          questionCount: questions.length,
        };
      })
    );
    
    return decksWithCounts;
  },
});

export const get = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) {
      return null;
    }
    
    return deck;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db.insert("decks", {
      name: args.name,
      description: args.description,
      userId,
    });
  },
});

export const remove = mutation({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.userId !== userId) {
      throw new Error("Deck not found");
    }
    
    // Delete all questions in the deck
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
    
    for (const question of questions) {
      await ctx.db.delete(question._id);
    }
    
    await ctx.db.delete(args.deckId);
  },
});
