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

  /* State for mobile view toggle */
  const [showMobileLogin, setShowMobileLogin] = useState(false);

  const getSlideClass = (index: number) => {
    if (index === currentSlide) return 'animate-slide-in opacity-100 z-20';
    if (index === (currentSlide - 1 + slides.length) % slides.length) return 'animate-slide-out opacity-100 z-10';
    return 'opacity-0 z-0';
  };

  return (
    <div className="min-h-[100dvh] bg-[#1a1a1a] flex justify-center items-center lg:p-4 overflow-hidden font-['Poppins']">
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

      {/* Centered Container for both panels */}
      {/* Mobile: Full width/height, no radius. Desktop: Max width, fixed height, radius. */}
      <div className="w-full lg:max-w-[1200px] h-[100dvh] lg:h-[85vh] lg:max-h-[750px] flex shadow-2xl rounded-none lg:rounded-[2rem] relative">

        {/* Left Panel (Slideshow) */}
        {/* Mobile: Visible if !showMobileLogin. Desktop: Always visible. */}
        <div className={`${showMobileLogin ? 'hidden' : 'flex'} lg:flex w-full lg:w-1/2 flex-col justify-center items-center relative rounded-none lg:rounded-[2rem] overflow-hidden bg-[#242424] h-full`}>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/40 to-transparent z-10"></div>
          {/* Decorative Circles - Scaled down */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 border border-white/5 rounded-full z-0"></div>
          <div className="absolute top-1/4 left-1/4 w-[24rem] h-[24rem] border border-white/5 rounded-full z-0"></div>

          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 flex flex-col justify-center items-center ${getSlideClass(index)}`}
            >
              <div className="text-center mb-6 px-8 mt-[-4rem]"> {/* Lifted up slightly to fit button on mobile */}
                <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-2 font-medium">
                  {slide.subtitle}
                </p>
                <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight whitespace-pre-line">
                  {slide.title}
                </h1>
              </div>

              <div className="transform translate-y-0 hover:translate-y-[-10px] transition-transform duration-500 ease-out">
                <div className="w-48 xl:w-56 h-auto rounded-[2rem] shadow-2xl border-4 border-gray-800 bg-gray-900 overflow-hidden">
                  <img src={slide.image} alt="Slide Content" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          ))}

          {/* Mobile "Proceed to Login" Button */}
          <div className="absolute bottom-16 lg:hidden z-40 w-full flex justify-center px-8">
            <button
              onClick={() => setShowMobileLogin(true)}
              className="flex items-center space-x-2 text-white font-medium text-sm border border-white/30 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full hover:bg-white/20 transition-all group active:scale-95"
            >
              <span>Proceed to Login</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="absolute bottom-6 left-0 w-full flex justify-center space-x-2 z-30">
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

        {/* Right Panel (Login Form) */}
        {/* Mobile: Visible if showMobileLogin. Desktop: Always visible. */}
        <div className={`${showMobileLogin ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/2 bg-white rounded-none lg:rounded-[2rem] flex-col justify-center items-center p-8 relative lg:ml-[-1.5rem] z-30 h-full`}>
          <div className="w-full max-w-sm space-y-5">

            {/* Mobile Back Button (Optional improvement for UX) */}
            <button
              onClick={() => setShowMobileLogin(false)}
              className="lg:hidden absolute top-6 left-6 text-gray-400 hover:text-gray-600 flex items-center space-x-1 text-xs"
            >
              <span>← Back</span>
            </button>

            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <img src={tbcLogo} alt="TBC Logo" className="w-8 h-8 object-contain" />
                <span className="font-bold text-lg tracking-tight text-slate-800">TBC Tithing Database</span>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-gray-800">Sign In</h2>
              <p className="text-xs text-gray-400 mt-1.5">Welcome back to the platform</p>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium flex items-center justify-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 mt-5">
              <div className="space-y-3.5">
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or Username"
                    className="w-full bg-transparent border border-gray-200 focus:border-[#003366] hover:border-gray-300 rounded-full py-2.5 px-5 text-sm text-gray-800 placeholder-gray-400 transition-all outline-none"
                    required
                  />
                </div>

                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent border border-gray-200 focus:border-[#003366] hover:border-gray-300 rounded-full py-2.5 px-5 text-sm text-gray-800 placeholder-gray-400 transition-all outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button type="button" className="text-[#003366] text-xs font-medium hover:text-[#002244] transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#003366] to-[#005599] hover:from-[#002244] hover:to-[#004488] text-white font-bold py-3 rounded-full transition-all shadow-lg shadow-[#003366]/30 flex items-center justify-center space-x-2 disabled:opacity-70 transform hover:-translate-y-0.5 text-sm"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <footer className="pt-6 flex justify-between items-center text-[10px] text-gray-300 border-t border-gray-50 mt-6">
              <p>© 2026 TBC Tithing Database.</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};
