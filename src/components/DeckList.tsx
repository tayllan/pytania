import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export function DeckList({ onSelectDeck }: { onSelectDeck: (deckId: Id<"decks">) => void }) {
  const decks = useQuery(api.decks.list);
  const createDeck = useMutation(api.decks.create);
  const removeDeck = useMutation(api.decks.remove);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      await createDeck({ name, description: description || undefined });
      setName("");
      setDescription("");
      setShowCreateForm(false);
      toast.success("Deck created!");
    } catch (error) {
      toast.error("Failed to create deck");
    }
  };

  const handleDelete = async (deckId: Id<"decks">, deckName: string) => {
    if (confirm(`Delete deck "${deckName}"? This will remove all questions.`)) {
      try {
        await removeDeck({ deckId });
        toast.success("Deck deleted");
      } catch (error) {
        toast.error("Failed to delete deck");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">My Study Decks</h1>
          <p className="text-emerald-700 mt-1">Create and manage your study materials</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
        >
          + New Deck
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-emerald-900 mb-4">Create New Deck</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1">
                  Deck Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Small Animal Surgery"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks?.map((deck) => (
          <div
            key={deck._id}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border border-emerald-100 cursor-pointer group"
            onClick={() => onSelectDeck(deck._id)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold text-emerald-900 group-hover:text-emerald-700 transition-colors">
                {deck.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(deck._id, deck.name);
                }}
                className="text-red-500 hover:text-red-700 text-xl"
                title="Delete deck"
              >
                ×
              </button>
            </div>
            {deck.description && (
              <p className="text-emerald-700 text-sm mb-4">{deck.description}</p>
            )}
            <div className="flex items-center gap-2 text-emerald-600">
              <span className="text-2xl">📚</span>
              <span className="font-semibold">{deck.questionCount} questions</span>
            </div>
          </div>
        ))}
      </div>

      {decks?.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-2xl font-bold text-emerald-900 mb-2">No decks yet</h3>
          <p className="text-emerald-700 mb-6">Create your first study deck to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Create Your First Deck
          </button>
        </div>
      )}
    </div>
  );
}
