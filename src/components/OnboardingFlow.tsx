import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Dumbbell, Brain, Timer, ArrowRight } from "lucide-react";
import { UserProfile, saveProfile, setOnboarded } from "@/lib/gymData";

const ONBOARDING_IMAGES = {
  hero: "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbegqaafaq/onboarding-hero-gym.png",
  ai: "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbccaaafba/onboarding-ai-brain.png",
  timer: "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbc2qaafaa/onboarding-timer.png",
};

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = "slide1" | "slide2" | "slide3" | "profile";

const fitnessGoals = ["Strength", "Hypertrophy", "Endurance", "Weight Loss"] as const;
const experienceLevels = ["Beginner", "Intermediate", "Advanced"] as const;

export default function OnboardingFlow({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("slide1");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<UserProfile["fitnessGoal"]>("Hypertrophy");
  const [level, setLevel] = useState<UserProfile["experienceLevel"]>("Intermediate");

  const handleFinish = () => {
    const profile: UserProfile = {
      name: name || "Athlete",
      fitnessGoal: goal,
      experienceLevel: level,
      createdAt: Date.now(),
      weightUnit: "kg",
      restTimerDuration: 90,
    };
    saveProfile(profile);
    setOnboarded(true);
    onComplete(profile);
  };

  const slides: Record<string, { icon: React.ReactNode; image: string; title: string; subtitle: string }> = {
    slide1: {
      icon: <Dumbbell className="w-8 h-8" />,
      image: ONBOARDING_IMAGES.hero,
      title: "Track every set.\nGrow every session.",
      subtitle: "Your personal gym companion that remembers everything so you can focus on lifting.",
    },
    slide2: {
      icon: <Brain className="w-8 h-8" />,
      image: ONBOARDING_IMAGES.ai,
      title: "AI-powered progressive\noverload suggestions",
      subtitle: "Smart recommendations based on your history to keep you progressing workout after workout.",
    },
    slide3: {
      icon: <Timer className="w-8 h-8" />,
      image: ONBOARDING_IMAGES.timer,
      title: "Rest timers that\nkeep running",
      subtitle: "Even when you switch apps. Never lose track of your rest periods again.",
    },
  };

  if (step === "profile") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Set up your profile</h1>
            <p className="text-muted-foreground text-sm">Help us personalize your experience</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Your Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-12 bg-card border-white/10 rounded-xl text-base placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Fitness Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {fitnessGoals.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`h-12 rounded-xl text-sm font-medium transition-all touch-target ${
                      goal === g
                        ? "gym-gradient text-white shadow-lg shadow-purple-500/20"
                        : "bg-card border border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Experience Level</label>
              <div className="grid grid-cols-3 gap-2">
                {experienceLevels.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`h-12 rounded-xl text-sm font-medium transition-all touch-target ${
                      level === l
                        ? "gym-gradient text-white shadow-lg shadow-purple-500/20"
                        : "bg-card border border-white/10 text-white/70 hover:border-white/20"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full h-14 gym-gradient text-white font-bold text-base rounded-xl hover:opacity-90 transition-opacity"
          >
            Let&apos;s Go
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Slide screens
  const currentSlide = slides[step];
  const slideIndex = step === "slide1" ? 0 : step === "slide2" ? 1 : 2;

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Image */}
      <div className="relative h-[50vh] overflow-hidden">
        <img
          src={currentSlide.image}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between px-6 pb-10 -mt-8 relative z-10">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl gym-gradient flex items-center justify-center text-white">
            {currentSlide.icon}
          </div>
          <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">
            {currentSlide.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {currentSlide.subtitle}
          </p>
        </div>

        <div className="space-y-6 mt-8">
          {/* Dots */}
          <div className="flex items-center gap-2 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slideIndex ? "w-8 bg-[#6C5CE7]" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep("profile")}
              className="flex-1 h-14 text-muted-foreground font-medium text-base rounded-xl hover:bg-white/5"
            >
              Skip
            </Button>
            <Button
              onClick={() => {
                if (step === "slide1") setStep("slide2");
                else if (step === "slide2") setStep("slide3");
                else setStep("profile");
              }}
              className="flex-1 h-14 gym-gradient text-white font-semibold text-base rounded-xl hover:opacity-90 transition-opacity"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}