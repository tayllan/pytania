import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { DeckList } from "./components/DeckList";
import { useState } from "react";
import { DeckView } from "./components/DeckView";
import { PlaySession } from "./components/PlaySession";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const [currentView, setCurrentView] = useState<"decks" | "deck" | "play">("decks");
  const [selectedDeckId, setSelectedDeckId] = useState<Id<"decks"> | null>(null);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);

  const handleSelectDeck = (deckId: Id<"decks">) => {
    setSelectedDeckId(deckId);
    setCurrentView("deck");
  };

  const handleBackToDecks = () => {
    setCurrentView("decks");
    setSelectedDeckId(null);
  };

  const handleStartPlay = (sessionId: Id<"sessions">) => {
    setSessionId(sessionId);
    setCurrentView("play");
  };

  const handleEndPlay = () => {
    setCurrentView("deck");
    setSessionId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md h-16 flex justify-between items-center border-b border-emerald-200 shadow-sm px-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🩺</div>
          <h2 className="text-xl font-bold text-emerald-800">VetStudy</h2>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-6">
        <Content
          currentView={currentView}
          selectedDeckId={selectedDeckId}
          sessionId={sessionId}
          onSelectDeck={handleSelectDeck}
          onBackToDecks={handleBackToDecks}
          onStartPlay={handleStartPlay}
          onEndPlay={handleEndPlay}
        />
      </main>
      <Toaster />
    </div>
  );
}

function Content({
  currentView,
  selectedDeckId,
  sessionId,
  onSelectDeck,
  onBackToDecks,
  onStartPlay,
  onEndPlay,
}: {
  currentView: "decks" | "deck" | "play";
  selectedDeckId: Id<"decks"> | null;
  sessionId: Id<"sessions"> | null;
  onSelectDeck: (deckId: Id<"decks">) => void;
  onBackToDecks: () => void;
  onStartPlay: (sessionId: Id<"sessions">) => void;
  onEndPlay: () => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        {currentView === "decks" && <DeckList onSelectDeck={onSelectDeck} />}
        {currentView === "deck" && selectedDeckId && (
          <DeckView
            deckId={selectedDeckId}
            onBack={onBackToDecks}
            onStartPlay={onStartPlay}
          />
        )}
        {currentView === "play" && sessionId && selectedDeckId && (
          <PlaySession
            sessionId={sessionId}
            deckId={selectedDeckId}
            onEnd={onEndPlay}
          />
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🩺</div>
            <h1 className="text-4xl font-bold text-emerald-800 mb-2">VetStudy</h1>
            <p className="text-lg text-emerald-700">
              Master veterinary medicine with interactive study decks
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </>
  );
}
