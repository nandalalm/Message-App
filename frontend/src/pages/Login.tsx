import { useAppDispatch, useAppSelector } from "../redux/store";
import { loginUser } from "../redux/authSlice";
import { useState, useEffect } from "react";
import { loginSchema } from "../validation/loginSchema";
import { validateForm } from "../utils/validateForm";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { AuthApi } from "../services";
import type { LoginCredentials } from "../types/auth";
import { z } from "zod";

type LoginField = keyof LoginCredentials;

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, accessToken } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState<LoginCredentials>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<Record<LoginField, boolean>>({ email: false, password: false });
  const { show } = useToast();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const forgotSchema = z.object({ email: z.string().trim().email("Invalid email format") });

  useEffect(() => {
    if (accessToken && !loading && !error) {
      navigate('/');
    }
  }, [accessToken, loading, error, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateForm(loginSchema, formData);
    if (!result.valid) {
      setErrors(result.errors);
      setTouched({ email: true, password: true });
      return;
    }
    setErrors({});
    dispatch(loginUser(result.data as { email: string; password: string }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as LoginField;
    const nextFormData = { ...formData, [field]: value };
    const result = validateForm(loginSchema, nextFormData);
    const fieldErrors = result.valid ? {} : (result.errors as Partial<Record<LoginField, string>>);

    setFormData(nextFormData);
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => {
      const nextErrors = { ...prev };
      if (result.valid) {
        delete nextErrors[field];
      } else if (fieldErrors[field]) {
        nextErrors[field] = fieldErrors[field];
      } else {
        delete nextErrors[field];
      }
      return nextErrors;
    });
  };

  const getInputBorderClass = (field: LoginField) => {
    if (errors[field]) return "border-red-500";
    if (touched[field] && formData[field].trim() !== "") return "border-green-500";
    return "border-gray-300";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 sm:p-8">
      <h2 className="text-2xl font-semibold mb-4 text-center">{mode === "login" ? "Login" : "Forgot Password"}</h2>
      {mode === "login" ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            placeholder="Email"
            className={`border w-full p-2 rounded focus:outline-none ${getInputBorderClass("email")}`}
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              className={`border w-full p-2 pr-10 rounded focus:outline-none ${getInputBorderClass("password")}`}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {error && (
          <p className="text-red-500 text-center text-sm">{error}</p>
        )}
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => { setMode("forgot"); setForgotEmail(formData.email); setForgotError(""); }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setForgotError("");
            const parsed = forgotSchema.safeParse({ email: forgotEmail });
            if (!parsed.success) {
              setForgotError(parsed.error.flatten().fieldErrors.email?.[0] || "Invalid email");
              return;
            }
            try {
              setForgotLoading(true);
              await AuthApi.forgotPassword({ email: parsed.data.email });
              show("Reset link sent to your email", "success");
            } catch (err: unknown) {
              const errorMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to send reset link";
              if (errorMessage === "Email not registered") {
                setForgotError("Email not registered");
              } else {
                show(errorMessage, "error");
              }
            } finally {
              setForgotLoading(false);
            }
          }}
          noValidate
          className="space-y-4"
        >
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              name="forgotEmail"
              placeholder="Enter your email"
              className={`border w-full p-2 rounded ${forgotError ? "border-red-500" : "border-gray-300"}`}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            {forgotError && <p className="text-red-500 text-xs mt-1">{forgotError}</p>}
          </div>
          <button
            disabled={forgotLoading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-60"
          >
            {forgotLoading ? "Sending..." : "Send reset link"}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => setMode("login")} className="text-sm text-gray-600 hover:text-gray-800">
              Back to login
            </button>
          </div>
        </form>
      )}
      
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-500 hover:text-blue-700">
            Register here
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
};

export default Login;
