import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import tbcLogo from '../src/images/tbc logo crop.png';
import phoneMockup from '../src/images/login_phone_mockup.png';
import recordsMockup from '../src/images/login_records_mockup.png';
import financeMockup from '../src/images/login_finance_mockup.png';
import { useAuthStore } from '../store';

const slides = [
  {
    subtitle: "Global tithing made simple",
    title: "Manage your \nstewardship",
    image: phoneMockup
  },
  {
    subtitle: "Keep track of every tithe",
    title: "Record your \ntithe records",
    image: recordsMockup
  },
  {
    subtitle: "Insights for better decisions",
    title: "Track your finances \nat a glance",
    image: financeMockup
  }
];

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const getSlideClass = (index: number) => {
    if (index === currentSlide) return 'animate-slide-in opacity-100 z-20';
    if (index === (currentSlide - 1 + slides.length) % slides.length) return 'animate-slide-out opacity-100 z-10';
    return 'opacity-0 z-0';
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex p-4 md:p-6 overflow-hidden font-['Poppins']">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        .animate-slide-in {
          animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-out {
          animation: slideOutLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* Left Panel - Dark / Promotional / Slideshow */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative rounded-[2.5rem] overflow-hidden bg-[#242424]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/40 to-transparent z-10"></div>
        {/* Decorative Circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-white/5 rounded-full z-0"></div>
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] border border-white/5 rounded-full z-0"></div>

        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 flex flex-col justify-center items-center ${getSlideClass(index)}`}
          >
            <div className="text-center mb-12 px-10">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-medium">
                {slide.subtitle}
              </p>
              <h1 className="text-5xl font-bold text-white leading-tight whitespace-pre-line">
                {slide.title}
              </h1>
            </div>

            <div className="transform translate-y-0 hover:translate-y-[-10px] transition-transform duration-500 ease-out">
              <div className="w-64 h-auto rounded-[2.5rem] shadow-2xl border-4 border-gray-800 bg-gray-900 overflow-hidden">
                <img src={slide.image} alt="Slide Content" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-10 left-0 w-full flex justify-center space-x-2 z-30">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Right Panel - White / Login Form */}
      <div className="w-full lg:w-1/2 bg-white rounded-[2.5rem] flex flex-col justify-center items-center p-8 md:p-16 relative shadow-2xl lg:shadow-none lg:ml-[-2rem] z-30">
        <div className="w-full max-w-md space-y-8">

          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <img src={tbcLogo} alt="TBC Logo" className="w-10 h-10 object-contain" />
              <span className="font-bold text-xl tracking-tight text-slate-800">TBC Tithing Database</span>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-3xl font-semibold text-gray-800">Sign In</h2>
            <p className="text-sm text-gray-400 mt-2">Welcome back to the platform</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-medium flex items-center justify-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div className="space-y-5">
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or Username"
                  className="w-full bg-transparent border border-gray-200 focus:border-[#003366] hover:border-gray-300 rounded-full py-4 px-6 text-gray-800 placeholder-gray-400 transition-all outline-none"
                  required
                />
              </div>

              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent border border-gray-200 focus:border-[#003366] hover:border-gray-300 rounded-full py-4 px-6 text-gray-800 placeholder-gray-400 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" className="text-[#003366] text-sm font-medium hover:text-[#002244] transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#003366] to-[#005599] hover:from-[#002244] hover:to-[#004488] text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-[#003366]/30 flex items-center justify-center space-x-2 disabled:opacity-70 transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <footer className="pt-10 flex justify-between items-center text-xs text-gray-300 border-t border-gray-50 mt-10">
            <p>© 2026 TBC Tithing Database.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};
