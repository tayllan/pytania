import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

export function DeckView({
  deckId,
  onBack,
  onStartPlay,
}: {
  deckId: Id<"decks">;
  onBack: () => void;
  onStartPlay: (sessionId: Id<"sessions">) => void;
}) {
  const deck = useQuery(api.decks.get, { deckId });
  const questions = useQuery(api.questions.list, { deckId });
  const createSession = useMutation(api.sessions.create);
  const removeQuestion = useMutation(api.questions.remove);
  
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showPlayModal, setShowPlayModal] = useState(false);

  const handleStartPlay = async (mode: "exam" | "practice", timeLimit?: number) => {
    try {
      const sessionId = await createSession({
        deckId,
        mode,
        timeLimit,
      });
      setShowPlayModal(false);
      onStartPlay(sessionId);
    } catch (error) {
      toast.error("Failed to start session");
    }
  };

  const handleDeleteQuestion = async (questionId: Id<"questions">) => {
    if (confirm("Delete this question?")) {
      try {
        await removeQuestion({ questionId });
        toast.success("Question deleted");
      } catch (error) {
        toast.error("Failed to delete question");
      }
    }
  };

  if (!deck) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-2"
      >
        ← Back to Decks
      </button>

      <div className="bg-white rounded-xl p-8 shadow-lg border border-emerald-100 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">{deck.name}</h1>
            {deck.description && (
              <p className="text-emerald-700 mt-2">{deck.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddQuestion(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              + Add Question
            </button>
            {questions && questions.length > 0 && (
              <button
                onClick={() => setShowPlayModal(true)}
                className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
              >
                ▶ Play Deck
              </button>
            )}
          </div>
        </div>
        <div className="text-emerald-600 font-semibold">
          {questions?.length || 0} questions
        </div>
      </div>

      {showPlayModal && (
        <PlayModeModal
          onClose={() => setShowPlayModal(false)}
          onStart={handleStartPlay}
        />
      )}

      {showAddQuestion && (
        <AddQuestionModal
          deckId={deckId}
          onClose={() => setShowAddQuestion(false)}
        />
      )}

      <div className="space-y-4">
        {questions?.map((question, index) => (
          <div
            key={question._id}
            className="bg-white rounded-lg p-6 shadow-md border border-emerald-100"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-bold">#{index + 1}</span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">
                  {question.type === "match" && "Match Q&A"}
                  {question.type === "multiple_choice" && "Multiple Choice"}
                  {question.type === "free_text" && "Free Text"}
                </span>
              </div>
              <button
                onClick={() => handleDeleteQuestion(question._id)}
                className="text-red-500 hover:text-red-700 text-xl"
              >
                ×
              </button>
            </div>

            {question.type === "match" && (
              <div className="space-y-2">
                {question.matchPairs?.map((pair, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="flex-1 text-emerald-900">{pair.question}</span>
                    <span className="text-emerald-600">→</span>
                    <span className="flex-1 text-emerald-700">{pair.answer}</span>
                  </div>
                ))}
              </div>
            )}

            {question.type === "multiple_choice" && (
              <div>
                <p className="text-emerald-900 font-semibold mb-3">{question.question}</p>
                <div className="space-y-2">
                  {question.choices?.map((choice, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center text-sm ${
                          question.correctIndices?.includes(i)
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {question.correctIndices?.includes(i) ? "✓" : "○"}
                      </span>
                      <span className="text-emerald-800">{choice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {question.type === "free_text" && (
              <p className="text-emerald-900">{question.prompt}</p>
            )}
          </div>
        ))}
      </div>

      {questions?.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl">
          <div className="text-6xl mb-4">❓</div>
          <h3 className="text-2xl font-bold text-emerald-900 mb-2">No questions yet</h3>
          <p className="text-emerald-700 mb-6">Add your first question to start studying</p>
          <button
            onClick={() => setShowAddQuestion(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Add First Question
          </button>
        </div>
      )}
    </div>
  );
}

function PlayModeModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (mode: "exam" | "practice", timeLimit?: number) => void;
}) {
  const [mode, setMode] = useState<"exam" | "practice">("practice");
  const [timeLimit, setTimeLimit] = useState(30);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-emerald-900 mb-6">Choose Play Mode</h2>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={() => setMode("practice")}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              mode === "practice"
                ? "border-emerald-600 bg-emerald-50"
                : "border-gray-200 hover:border-emerald-300"
            }`}
          >
            <div className="font-bold text-emerald-900 mb-1">Practice Mode</div>
            <div className="text-sm text-emerald-700">
              No timer • Immediate feedback • Learn as you go
            </div>
          </button>

          <button
            onClick={() => setMode("exam")}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              mode === "exam"
                ? "border-emerald-600 bg-emerald-50"
                : "border-gray-200 hover:border-emerald-300"
            }`}
          >
            <div className="font-bold text-emerald-900 mb-1">Exam Mode</div>
            <div className="text-sm text-emerald-700">
              Timed • Results at end • Test your knowledge
            </div>
          </button>
        </div>

        {mode === "exam" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-emerald-800 mb-2">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              min="1"
              max="180"
              className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => onStart(mode, mode === "exam" ? timeLimit * 60 : undefined)}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Start
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddQuestionModal({
  deckId,
  onClose,
}: {
  deckId: Id<"decks">;
  onClose: () => void;
}) {
  const [questionType, setQuestionType] = useState<"match" | "multiple_choice" | "free_text">("multiple_choice");
  
  const createMatch = useMutation(api.questions.createMatch);
  const createMultipleChoice = useMutation(api.questions.createMultipleChoice);
  const createFreeText = useMutation(api.questions.createFreeText);

  // Match question state
  const [pairs, setPairs] = useState([{ question: "", answer: "" }]);

  // Multiple choice state
  const [mcQuestion, setMcQuestion] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);

  // Free text state
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (questionType === "match") {
        const validPairs = pairs.filter(p => p.question.trim() && p.answer.trim());
        if (validPairs.length < 2) {
          toast.error("Add at least 2 complete pairs");
          return;
        }
        await createMatch({ deckId, pairs: validPairs });
      } else if (questionType === "multiple_choice") {
        const validChoices = choices.filter(c => c.trim());
        if (!mcQuestion.trim() || validChoices.length < 2) {
          toast.error("Add question and at least 2 choices");
          return;
        }
        if (correctIndices.length === 0) {
          toast.error("Mark at least one correct answer");
          return;
        }
        await createMultipleChoice({
          deckId,
          question: mcQuestion,
          choices: validChoices,
          correctIndices,
        });
      } else {
        if (!prompt.trim()) {
          toast.error("Add a question prompt");
          return;
        }
        await createFreeText({ deckId, prompt });
      }
      
      toast.success("Question added!");
      onClose();
    } catch (error) {
      toast.error("Failed to add question");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl my-8">
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">Add Question</h2>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setQuestionType("multiple_choice")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              questionType === "multiple_choice"
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Multiple Choice
          </button>
          <button
            onClick={() => setQuestionType("match")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              questionType === "match"
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Match Q&A
          </button>
          <button
            onClick={() => setQuestionType("free_text")}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              questionType === "free_text"
                ? "bg-emerald-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Free Text
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {questionType === "match" && (
            <div className="space-y-3">
              {pairs.map((pair, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    type="text"
                    value={pair.question}
                    onChange={(e) => {
                      const newPairs = [...pairs];
                      newPairs[i].question = e.target.value;
                      setPairs(newPairs);
                    }}
                    placeholder="Question"
                    className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={pair.answer}
                    onChange={(e) => {
                      const newPairs = [...pairs];
                      newPairs[i].answer = e.target.value;
                      setPairs(newPairs);
                    }}
                    placeholder="Answer"
                    className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  {pairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPairs(pairs.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-700 text-xl px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPairs([...pairs, { question: "", answer: "" }])}
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                + Add Pair
              </button>
            </div>
          )}

          {questionType === "multiple_choice" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1">
                  Question
                </label>
                <textarea
                  value={mcQuestion}
                  onChange={(e) => setMcQuestion(e.target.value)}
                  className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  placeholder="Enter your question..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-2">
                  Choices (check correct answers)
                </label>
                {choices.map((choice, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={correctIndices.includes(i)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCorrectIndices([...correctIndices, i]);
                        } else {
                          setCorrectIndices(correctIndices.filter(idx => idx !== i));
                        }
                      }}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...choices];
                        newChoices[i] = e.target.value;
                        setChoices(newChoices);
                      }}
                      placeholder={`Choice ${i + 1}`}
                      className="flex-1 px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {questionType === "free_text" && (
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-1">
                Question Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                rows={4}
                placeholder="Enter your question prompt..."
              />
              <p className="text-sm text-emerald-600 mt-1">
                Student answers will be evaluated by AI
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              Add Question
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
