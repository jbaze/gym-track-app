import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Dumbbell, Brain, Timer, Mail, ArrowRight } from "lucide-react";
import { UserProfile, saveProfile, setOnboarded } from "@/lib/gymData";

const ONBOARDING_IMAGES = {
  hero: "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbegqaafaq/onboarding-hero-gym.png",
  ai: "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbccaaafba/onboarding-ai-brain.png",
  timer: "https://mgx-backend-cdn.metadl.com/generate/images/1042595/2026-04-16/mwqbc2qaafaa/onboarding-timer.png",
};

interface OnboardingProps {
  onComplete: () => void;
}

type Step = "slide1" | "slide2" | "slide3" | "auth" | "profile";

const fitnessGoals = ["Strength", "Hypertrophy", "Endurance", "Weight Loss"] as const;
const experienceLevels = ["Beginner", "Intermediate", "Advanced"] as const;

export default function OnboardingFlow({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("slide1");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<UserProfile["fitnessGoal"]>("Hypertrophy");
  const [level, setLevel] = useState<UserProfile["experienceLevel"]>("Intermediate");

  const handleAuth = () => {
    setStep("profile");
  };

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
    onComplete();
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

  if (step === "auth") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl gym-gradient flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to GymTrack</h1>
            <p className="text-muted-foreground text-sm">Sign up or log in to get started</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAuth}
              className="w-full h-12 gym-gradient text-white font-semibold text-base rounded-xl hover:opacity-90 transition-opacity"
            >
              <Mail className="w-5 h-5 mr-2" />
              Continue with Email
            </Button>
            <Button
              onClick={handleAuth}
              variant="outline"
              className="w-full h-12 bg-white/5 border-white/10 text-white font-semibold text-base rounded-xl hover:bg-white/10"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
            <Button
              onClick={handleAuth}
              variant="outline"
              className="w-full h-12 bg-white/5 border-white/10 text-white font-semibold text-base rounded-xl hover:bg-white/10"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    );
  }

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
              onClick={() => setStep("auth")}
              className="flex-1 h-14 text-muted-foreground font-medium text-base rounded-xl hover:bg-white/5"
            >
              Skip
            </Button>
            <Button
              onClick={() => {
                if (step === "slide1") setStep("slide2");
                else if (step === "slide2") setStep("slide3");
                else setStep("auth");
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