import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Eye, EyeOff, LogIn, WifiOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Vite expose les variables via import.meta.env (préfixe VITE_) ─────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const IS_DEV  = import.meta.env.DEV; // true en développement, false en prod

const LoginPage: React.FC = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPass] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const user = await login(email, password);
      toast.success(`Bienvenue, ${user.name} !`);

      if (user.mustChangePassword) {
        navigate('/change-password');
      } else if (user.role === 'system_admin') {
        navigate('/admin/companies');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('LOGIN ERROR:', error);

      // Pas de réponse du serveur (réseau, CORS, serveur down)
      if (!error.response) {
        console.error('Serveur inaccessible. URL cible :', API_URL);
        setErrorMsg(`Serveur inaccessible (${API_URL}). Vérifiez votre connexion réseau.`);
        toast.error('Serveur inaccessible');
        return;
      }

      // Erreurs HTTP connues
      const status  = error.response?.status;
      const message = error.response?.data?.message;

      console.error(`HTTP ${status}:`, message);

      if (status === 401) {
        setErrorMsg('Email ou mot de passe incorrect.');
      } else if (status === 403) {
        setErrorMsg('Accès refusé. Votre compte est suspendu.');
      } else if (status === 422) {
        const msgs = Array.isArray(message) ? message.join(', ') : message;
        setErrorMsg(`Données invalides : ${msgs}`);
      } else if (status >= 500) {
        setErrorMsg('Erreur serveur. Réessayez dans quelques instants.');
      } else {
        setErrorMsg(message || 'Une erreur est survenue.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center
      bg-gradient-to-br from-blue-50 via-white to-indigo-50
      dark:from-gray-950 dark:via-gray-900 dark:to-gray-950
      px-4 py-8">

        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl
          border border-gray-100 dark:border-gray-800
          p-6 sm:p-8">

            {/* Logo */}
            <div className="flex flex-col items-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl
              flex items-center justify-center mb-3 sm:mb-4
              shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
                <Building2 size={24} className="text-white sm:hidden" />
                <Building2 size={28} className="text-white hidden sm:block" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                ERP System
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1 text-center">
                Connectez-vous à votre espace
              </p>
            </div>

            {/* Erreur inline */}
            {errorMsg && (
                <div className="flex items-start gap-2.5 mb-4 p-3 rounded-xl
              bg-red-50 dark:bg-red-500/10
              border border-red-200 dark:border-red-500/20">
                  {errorMsg.includes('inaccessible') || errorMsg.includes('réseau')
                      ? <WifiOff size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                      : <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Adresse email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrorMsg(null); }}
                    placeholder="votre@email.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border
                  border-gray-200 dark:border-gray-700
                  bg-gray-50 dark:bg-gray-800
                  text-gray-900 dark:text-white
                  placeholder-gray-400 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mot de passe
                  </label>
                  <Link
                      to="/forgot-password"
                      className="text-xs text-blue-600 hover:text-blue-700
                    dark:text-blue-400 dark:hover:text-blue-300
                    hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl border
                    border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800
                    text-gray-900 dark:text-white
                    placeholder-gray-400 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    transition-all"
                  />
                  <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    transition-colors p-1"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full flex items-center justify-center gap-2
                py-3 px-4 mt-2
                bg-blue-600 hover:bg-blue-700
                disabled:bg-blue-400 disabled:cursor-not-allowed
                text-white font-semibold rounded-xl
                transition-colors text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {isLoading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><LogIn size={15} /> Se connecter</>
                }
              </button>
            </form>

            {/* Debug info — visible uniquement en dev (import.meta.env.DEV) */}
            {IS_DEV && (
                <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-4 font-mono">
                  API → {API_URL}
                </p>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
            Votre compte est créé par l'administrateur
          </p>
        </div>
      </div>
  );
};

export default LoginPage;