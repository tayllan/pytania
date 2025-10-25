import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function PlaySession({
  sessionId,
  deckId,
  onEnd,
}: {
  sessionId: Id<"sessions">;
  deckId: Id<"decks">;
  onEnd: () => void;
}) {
  const session = useQuery(api.sessions.get, { sessionId });
  const questions = useQuery(api.questions.list, { deckId });
  const answers = useQuery(api.sessions.getAnswers, { sessionId });
  const submitAnswer = useMutation(api.sessions.submitAnswer);
  const completeSession = useMutation(api.sessions.complete);
  const evaluateFreeText = useAction(api.sessions.evaluateFreeText);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Timer logic
  useEffect(() => {
    if (!session || session.completed) return;
    
    if (session.mode === "exam" && session.timeLimit) {
      const elapsed = Date.now() - session.startTime;
      const remaining = Math.max(0, session.timeLimit * 1000 - elapsed);
      setTimeRemaining(Math.floor(remaining / 1000));

      const interval = setInterval(() => {
        const elapsed = Date.now() - session.startTime;
        const remaining = Math.max(0, session.timeLimit! * 1000 - elapsed);
        const seconds = Math.floor(remaining / 1000);
        setTimeRemaining(seconds);

        if (seconds === 0) {
          handleComplete();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session]);

  const handleComplete = async () => {
    try {
      await completeSession({ sessionId });
      setShowResults(true);
    } catch (error) {
      toast.error("Failed to complete session");
    }
  };

  if (!session || !questions || !answers) {
    return <div>Loading...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?._id);

  if (showResults || session.completed) {
    return (
      <Results
        questions={questions}
        answers={answers}
        onEnd={onEnd}
      />
    );
  }

  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <span className="text-emerald-700 font-bold">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">
              {session.mode === "exam" ? "Exam Mode" : "Practice Mode"}
            </span>
          </div>
          {timeRemaining !== null && (
            <div className={`text-xl font-bold ${timeRemaining < 60 ? "text-red-600" : "text-emerald-700"}`}>
              ⏱ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {questions.map((_, i) => {
            const answer = answers.find(a => a.questionId === questions[i]._id);
            return (
              <button
                key={i}
                onClick={() => setCurrentQuestionIndex(i)}
                className={`min-w-[40px] h-10 rounded-lg font-semibold transition-colors ${
                  i === currentQuestionIndex
                    ? "bg-emerald-600 text-white"
                    : answer
                    ? "bg-emerald-200 text-emerald-800"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-lg border border-emerald-100 mb-6">
        {currentQuestion.type === "match" && (
          <MatchQuestion
            question={currentQuestion}
            answer={currentAnswer}
            sessionId={sessionId}
            submitAnswer={submitAnswer}
            isPracticeMode={session.mode === "practice"}
          />
        )}

        {currentQuestion.type === "multiple_choice" && (
          <MultipleChoiceQuestion
            question={currentQuestion}
            answer={currentAnswer}
            sessionId={sessionId}
            submitAnswer={submitAnswer}
            isPracticeMode={session.mode === "practice"}
          />
        )}

        {currentQuestion.type === "free_text" && (
          <FreeTextQuestion
            question={currentQuestion}
            answer={currentAnswer}
            sessionId={sessionId}
            submitAnswer={submitAnswer}
            evaluateFreeText={evaluateFreeText}
            isPracticeMode={session.mode === "practice"}
          />
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        
        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleComplete}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Finish
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function MatchQuestion({
  question,
  answer,
  sessionId,
  submitAnswer,
  isPracticeMode,
}: any) {
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
  const [shuffledAnswers, setShuffledAnswers] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (question.matchPairs) {
      const questions = question.matchPairs.map((p: any, i: number) => ({ ...p, originalIndex: i }));
      const answers = [...question.matchPairs].map((p: any, i: number) => ({ ...p, originalIndex: i }));
      
      setShuffledQuestions(questions.sort(() => Math.random() - 0.5));
      setShuffledAnswers(answers.sort(() => Math.random() - 0.5));
    }
  }, [question]);

  const handleSubmit = async () => {
    const matchAnswers = Object.entries(matches).map(([qIdx, aIdx]) => ({
      questionIndex: Number(qIdx),
      answerIndex: Number(aIdx),
    }));

    await submitAnswer({
      sessionId,
      questionId: question._id,
      matchAnswers,
    });
    setSubmitted(true);
    toast.success("Answer submitted!");
  };

  const isCorrect = (qIdx: number) => {
    if (!isPracticeMode || !submitted) return null;
    const aIdx = matches[qIdx];
    if (aIdx === undefined) return null;
    return shuffledQuestions[qIdx].originalIndex === shuffledAnswers[aIdx].originalIndex;
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-emerald-900 mb-4">Match the questions with their answers</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-emerald-800 mb-2">Questions</h4>
          {shuffledQuestions.map((item, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border-2 ${
                matches[i] !== undefined
                  ? isCorrect(i) === true
                    ? "border-green-500 bg-green-50"
                    : isCorrect(i) === false
                    ? "border-red-500 bg-red-50"
                    : "border-emerald-500 bg-emerald-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              <div className="font-semibold text-emerald-900 mb-2">{String.fromCharCode(65 + i)}.</div>
              <div className="text-emerald-800">{item.question}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-emerald-800 mb-2">Answers</h4>
          {shuffledAnswers.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                const qIdx = Object.keys(matches).length % shuffledQuestions.length;
                setMatches({ ...matches, [qIdx]: i });
              }}
              disabled={submitted && isPracticeMode}
              className="w-full p-4 rounded-lg border-2 border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="font-semibold text-emerald-900 mb-2">{i + 1}.</div>
              <div className="text-emerald-800">{item.answer}</div>
            </button>
          ))}
        </div>
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(matches).length !== shuffledQuestions.length}
          className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}

function MultipleChoiceQuestion({
  question,
  answer,
  sessionId,
  submitAnswer,
  isPracticeMode,
}: any) {
  const [selected, setSelected] = useState<number[]>(answer?.selectedIndices || []);
  const [submitted, setSubmitted] = useState(!!answer);

  const handleSubmit = async () => {
    await submitAnswer({
      sessionId,
      questionId: question._id,
      selectedIndices: selected,
    });
    setSubmitted(true);
    toast.success("Answer submitted!");
  };

  const toggleChoice = (index: number) => {
    if (submitted && isPracticeMode) return;
    if (selected.includes(index)) {
      setSelected(selected.filter(i => i !== index));
    } else {
      setSelected([...selected, index]);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-emerald-900 mb-6">{question.question}</h3>
      
      <div className="space-y-3">
        {question.choices?.map((choice: string, i: number) => {
          const isSelected = selected.includes(i);
          const isCorrect = question.correctIndices?.includes(i);
          const showFeedback = submitted && isPracticeMode;

          return (
            <button
              key={i}
              onClick={() => toggleChoice(i)}
              disabled={submitted && isPracticeMode}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                showFeedback
                  ? isCorrect
                    ? "border-green-500 bg-green-50"
                    : isSelected
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 bg-white"
                  : isSelected
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-gray-300 bg-white hover:border-emerald-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected ? "bg-emerald-600 border-emerald-600" : "border-gray-400"
                  }`}
                >
                  {isSelected && <span className="text-white text-sm">✓</span>}
                </div>
                <span className="text-emerald-900">{choice}</span>
                {showFeedback && isCorrect && (
                  <span className="ml-auto text-green-600 font-semibold">✓ Correct</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}

function FreeTextQuestion({
  question,
  answer,
  sessionId,
  submitAnswer,
  evaluateFreeText,
  isPracticeMode,
}: any) {
  const [text, setText] = useState(answer?.textAnswer || "");
  const [submitted, setSubmitted] = useState(!!answer);
  const [evaluating, setEvaluating] = useState(false);

  const handleSubmit = async () => {
    const answerId = await submitAnswer({
      sessionId,
      questionId: question._id,
      textAnswer: text,
    });
    setSubmitted(true);

    if (isPracticeMode) {
      setEvaluating(true);
      try {
        await evaluateFreeText({
          answerId,
          question: question.prompt,
          answer: text,
        });
      } catch (error) {
        toast.error("Failed to evaluate answer");
      }
      setEvaluating(false);
    } else {
      toast.success("Answer submitted!");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-emerald-900 mb-6">{question.prompt}</h3>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted}
        className="w-full px-4 py-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
        rows={6}
        placeholder="Type your answer here..."
      />

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}

      {evaluating && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-blue-800">Evaluating your answer...</span>
          </div>
        </div>
      )}

      {submitted && isPracticeMode && answer?.llmFeedback && (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="font-semibold text-emerald-900 mb-2">Feedback:</div>
          <div className="text-emerald-800">{answer.llmFeedback}</div>
        </div>
      )}
    </div>
  );
}

function Results({ questions, answers, onEnd }: any) {
  const answeredQuestions = answers.length;
  const correctAnswers = answers.filter((a: any) => a.isCorrect === true).length;
  const percentage = answeredQuestions > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl p-8 shadow-lg border border-emerald-100 mb-6">
        <h2 className="text-3xl font-bold text-emerald-900 mb-6 text-center">Session Complete!</h2>
        
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-emerald-50 rounded-lg">
            <div className="text-4xl font-bold text-emerald-700">{answeredQuestions}</div>
            <div className="text-emerald-600 mt-1">Answered</div>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="text-4xl font-bold text-green-700">{correctAnswers}</div>
            <div className="text-green-600 mt-1">Correct</div>
          </div>
          <div className="text-center p-6 bg-cyan-50 rounded-lg">
            <div className="text-4xl font-bold text-cyan-700">{percentage}%</div>
            <div className="text-cyan-600 mt-1">Score</div>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((question: any, i: number) => {
            const answer = answers.find((a: any) => a.questionId === question._id);
            return (
              <div
                key={question._id}
                className={`p-4 rounded-lg border-2 ${
                  !answer
                    ? "border-gray-300 bg-gray-50"
                    : answer.isCorrect === true
                    ? "border-green-500 bg-green-50"
                    : answer.isCorrect === false
                    ? "border-red-500 bg-red-50"
                    : "border-blue-500 bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-emerald-900">#{i + 1}</span>
                  <span className="px-2 py-1 bg-white rounded text-sm font-semibold">
                    {question.type === "match" && "Match"}
                    {question.type === "multiple_choice" && "Multiple Choice"}
                    {question.type === "free_text" && "Free Text"}
                  </span>
                  {!answer && <span className="ml-auto text-gray-600">Not answered</span>}
                  {answer?.isCorrect === true && <span className="ml-auto text-green-600 font-semibold">✓ Correct</span>}
                  {answer?.isCorrect === false && <span className="ml-auto text-red-600 font-semibold">✗ Incorrect</span>}
                </div>
                
                {question.type === "free_text" && answer?.llmFeedback && (
                  <div className="mt-2 text-sm text-emerald-800 italic">
                    {answer.llmFeedback}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onEnd}
          className="w-full mt-8 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
        >
          Back to Deck
        </button>
      </div>
    </div>
  );
}
