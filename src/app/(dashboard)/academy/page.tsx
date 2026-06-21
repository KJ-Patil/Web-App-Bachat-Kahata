"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Award, CheckCircle2, Circle, GraduationCap, ChevronRight } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}

interface Lesson {
  id: string;
  title: string;
  theme: string;
  content: string;
  quiz: QuizQuestion[];
  reward: string;
}

export default function AcademyPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  
  // Quiz State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [score, setScore] = useState(0);
  
  // User Progress
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    // Load local JSON
    fetch("/assets/lessons/lessons.json")
      .then(res => res.json())
      .then(data => setLessons(data))
      .catch(err => console.error("Failed to load lessons:", err));

    // Load progress
    if (typeof window !== "undefined") {
      const badges = localStorage.getItem("academy_badges");
      if (badges) setEarnedBadges(JSON.parse(badges));
      
      const completed = localStorage.getItem("academy_completed");
      if (completed) setCompletedLessons(JSON.parse(completed));
    }
  }, []);

  const openLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setQuizComplete(false);
    setScore(0);
  };

  const closeLesson = () => {
    setActiveLesson(null);
  };

  const handleAnswerSelect = (optIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIdx]: optIndex }));
  };

  const handleNextQuestion = () => {
    if (!activeLesson) return;
    
    if (currentQuestionIdx < activeLesson.quiz.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      // Evaluate Quiz
      let correct = 0;
      activeLesson.quiz.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.answerIndex) correct++;
      });
      setScore(correct);
      setQuizComplete(true);

      // Award Badge if 100%
      if (correct === activeLesson.quiz.length) {
        if (!earnedBadges.includes(activeLesson.reward)) {
          const newBadges = [...earnedBadges, activeLesson.reward];
          setEarnedBadges(newBadges);
          localStorage.setItem("academy_badges", JSON.stringify(newBadges));
        }
        if (!completedLessons.includes(activeLesson.id)) {
          const newCompleted = [...completedLessons, activeLesson.id];
          setCompletedLessons(newCompleted);
          localStorage.setItem("academy_completed", JSON.stringify(newCompleted));
        }
      }
    }
  };

  // If a lesson is active, render the lesson view
  if (activeLesson) {
    return (
      <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in duration-300">
        <button 
          onClick={closeLesson}
          className="text-xs font-bold text-foreground-secondary hover:text-primary transition-colors flex items-center gap-1 w-fit"
        >
          &larr; Back to Academy
        </button>

        {!quizComplete ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary-lighter px-3 py-1 rounded-full">
                {activeLesson.theme}
              </span>
              <h1 className="text-3xl font-black text-foreground">{activeLesson.title}</h1>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {activeLesson.content}
              </p>
            </div>

            {/* Quiz Section */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="font-extrabold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand" />
                  Knowledge Check
                </h3>
                <span className="text-xs font-bold text-foreground-muted">
                  Question {currentQuestionIdx + 1} of {activeLesson.quiz.length}
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-foreground">
                  {activeLesson.quiz[currentQuestionIdx].question}
                </p>
                <div className="space-y-2">
                  {activeLesson.quiz[currentQuestionIdx].options.map((opt, idx) => {
                    const isSelected = selectedAnswers[currentQuestionIdx] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? "border-primary bg-primary-lighter text-primary" 
                            : "border-border bg-background hover:border-foreground-muted"
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-icon-muted" />}
                        <span className="text-sm font-semibold">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswers[currentQuestionIdx] === undefined}
                className="btn-primary w-full disabled:opacity-50"
              >
                {currentQuestionIdx < activeLesson.quiz.length - 1 ? "Next Question" : "Submit Answers"}
              </button>
            </div>
          </div>
        ) : (
          // Quiz Results
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-sm mt-10">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-primary-lighter text-primary">
              <Award className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">Quiz Completed!</h2>
              <p className="text-foreground-secondary font-semibold">
                You scored {score} out of {activeLesson.quiz.length}
              </p>
            </div>

            {score === activeLesson.quiz.length ? (
              <div className="bg-success-light border border-success/20 p-4 rounded-xl space-y-1 inline-block text-left mx-auto">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider block text-center">Badge Unlocked</span>
                <span className="font-black text-success text-lg flex items-center justify-center gap-2">
                  <Award className="w-5 h-5" /> {activeLesson.reward}
                </span>
              </div>
            ) : (
              <div className="bg-warning-light border border-warning/20 p-4 rounded-xl text-sm font-semibold text-warning-dark">
                You need 100% to unlock the badge. Try again!
              </div>
            )}

            <button onClick={closeLesson} className="btn-secondary w-full">
              Return to Academy
            </button>
          </div>
        )}
      </div>
    );
  }

  // Master Directory View
  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Learning Academy
          </h1>
          <p className="text-sm font-medium text-foreground-muted">
            Master financial literacy and earn badges through interactive offline modules.
          </p>
        </div>

        {earnedBadges.length > 0 && (
          <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
            <Award className="w-6 h-6 text-brand" />
            <div>
              <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block">Badges Earned</span>
              <span className="font-black text-foreground">{earnedBadges.length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lessons.map(lesson => {
          const isCompleted = completedLessons.includes(lesson.id);
          return (
            <button
              key={lesson.id}
              onClick={() => openLesson(lesson)}
              className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left group flex flex-col justify-between min-h-[160px]"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary-lighter px-2 py-0.5 rounded-md">
                    {lesson.theme}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-success" />}
                </div>
                <h3 className="font-black text-foreground text-lg group-hover:text-primary transition-colors pr-4">
                  {lesson.title}
                </h3>
              </div>
              
              <div className="flex justify-between items-center border-t border-border pt-4 mt-4">
                <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> 3 Min Read
                </span>
                <div className="w-8 h-8 rounded-full bg-secondary text-icon-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
